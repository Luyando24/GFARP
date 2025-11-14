import { stripe } from './stripe';
import { query, transaction } from './db.js';
import { v4 as uuidv4 } from 'uuid';

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

/**
 * Synchronizes subscription data between Stripe and local database
 */
export class SubscriptionSyncService {
  
  /**
   * Sync all subscriptions for a specific academy
   */
  async syncAcademySubscriptions(academyId: string): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: 0, errors: [] };
    
    try {
      // Get academy's Stripe customer ID
      const academyResult = await query(
        'SELECT stripe_customer_id, email FROM academies WHERE id = $1',
        [academyId]
      );
      
      if (academyResult.rows.length === 0) {
        result.errors.push(`Academy ${academyId} not found`);
        result.success = false;
        return result;
      }
      
      const { stripe_customer_id: customerId, email } = academyResult.rows[0];
      
      if (!customerId) {
        result.errors.push(`Academy ${academyId} has no Stripe customer ID`);
        result.success = false;
        return result;
      }
      
      // Fetch subscriptions from Stripe
      const stripeSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100,
        expand: ['data.items.data.price.product']
      });
      
      // Sync each subscription
      for (const subscription of stripeSubscriptions.data) {
        try {
          await this.syncSingleSubscription(academyId, subscription);
          result.synced++;
        } catch (error: any) {
          result.errors.push(`Failed to sync subscription ${subscription.id}: ${error.message}`);
          result.success = false;
        }
      }
      
      return result;
    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
      result.success = false;
      return result;
    }
  }
  
  /**
   * Sync all subscriptions across all academies
   */
  async syncAllSubscriptions(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: 0, errors: [] };
    
    try {
      // Get all academies with Stripe customer IDs
      const academiesResult = await query(
        'SELECT id, stripe_customer_id FROM academies WHERE stripe_customer_id IS NOT NULL'
      );
      
      for (const academy of academiesResult.rows) {
        try {
          const academyResult = await this.syncAcademySubscriptions(academy.id);
          result.synced += academyResult.synced;
          result.errors.push(...academyResult.errors);
          
          if (!academyResult.success) {
            result.success = false;
          }
        } catch (error: any) {
          result.errors.push(`Failed to sync academy ${academy.id}: ${error.message}`);
          result.success = false;
        }
      }
      
      return result;
    } catch (error: any) {
      result.errors.push(`Global sync failed: ${error.message}`);
      result.success = false;
      return result;
    }
  }
  
  /**
   * Sync a single subscription from Stripe to local database
   */
  private async syncSingleSubscription(academyId: string, stripeSubscription: any): Promise<void> {
    await transaction(async (client) => {
      // Check if subscription exists locally
      const existingResult = await client.query(
        'SELECT id, status, start_date, end_date FROM academy_subscriptions WHERE stripe_subscription_id = $1',
        [stripeSubscription.id]
      );
      
      const priceId = stripeSubscription.items.data[0]?.price?.id;
      if (!priceId) {
        throw new Error(`No price ID found for subscription ${stripeSubscription.id}`);
      }
      
      // Find the corresponding plan
      const planResult = await client.query(
        'SELECT id FROM subscription_plans WHERE stripe_price_id = $1',
        [priceId]
      );
      
      if (planResult.rows.length === 0) {
        throw new Error(`No plan found for price ID ${priceId}`);
      }
      
      const planId = planResult.rows[0].id;
      const startDate = new Date(stripeSubscription.current_period_start * 1000);
      const endDate = new Date(stripeSubscription.current_period_end * 1000);
      const status = stripeSubscription.status.toUpperCase();
      const autoRenew = !stripeSubscription.cancel_at_period_end;
      
      if (existingResult.rows.length === 0) {
        // Create new subscription
        const subscriptionId = uuidv4();
        await client.query(`
          INSERT INTO academy_subscriptions (
            id, academy_id, plan_id, stripe_subscription_id, status,
            start_date, end_date, auto_renew, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          subscriptionId,
          academyId,
          planId,
          stripeSubscription.id,
          status,
          startDate,
          endDate,
          autoRenew
        ]);
        
        // Log creation
        await client.query(`
          INSERT INTO subscription_history (
            id, academy_id, subscription_id, action, details, created_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          uuidv4(),
          academyId,
          subscriptionId,
          'SYNCED_CREATE',
          JSON.stringify({
            stripe_subscription_id: stripeSubscription.id,
            status: status,
            sync_date: new Date().toISOString()
          })
        ]);
        
      } else {
        // Update existing subscription
        const localSubscription = existingResult.rows[0];
        const subscriptionId = localSubscription.id;
        
        // Check if update is needed
        const needsUpdate = (
          localSubscription.status !== status ||
          localSubscription.start_date.getTime() !== startDate.getTime() ||
          localSubscription.end_date.getTime() !== endDate.getTime()
        );
        
        if (needsUpdate) {
          await client.query(`
            UPDATE academy_subscriptions 
            SET 
              status = $1,
              start_date = $2,
              end_date = $3,
              auto_renew = $4,
              updated_at = NOW()
            WHERE id = $5
          `, [
            status,
            startDate,
            endDate,
            autoRenew,
            subscriptionId
          ]);
          
          // Log update
          await client.query(`
            INSERT INTO subscription_history (
              id, academy_id, subscription_id, action, details, created_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW())
          `, [
            uuidv4(),
            academyId,
            subscriptionId,
            'SYNCED_UPDATE',
            JSON.stringify({
              old_status: localSubscription.status,
              new_status: status,
              sync_date: new Date().toISOString()
            })
          ]);
        }
      }
      
      // Sync recent invoices for this subscription
      await this.syncSubscriptionInvoices(client, stripeSubscription.id);
    });
  }
  
  /**
   * Sync invoices for a specific subscription
   */
  private async syncSubscriptionInvoices(client: any, stripeSubscriptionId: string): Promise<void> {
    try {
      // Get recent invoices from Stripe
      const invoices = await stripe.invoices.list({
        subscription: stripeSubscriptionId,
        limit: 10
      });
      
      // Find local subscription
      const subscriptionResult = await client.query(
        'SELECT id, academy_id FROM academy_subscriptions WHERE stripe_subscription_id = $1',
        [stripeSubscriptionId]
      );
      
      if (subscriptionResult.rows.length === 0) {
        return;
      }
      
      const { id: subscriptionId, academy_id: academyId } = subscriptionResult.rows[0];
      
      for (const invoice of invoices.data) {
        // Check if payment record exists
        const existingPayment = await client.query(
          'SELECT id FROM subscription_payments WHERE stripe_invoice_id = $1',
          [invoice.id]
        );
        
        if (existingPayment.rows.length === 0 && invoice.status === 'paid') {
          // Create payment record
          const paymentId = uuidv4();
          await client.query(`
            INSERT INTO subscription_payments (
              id, subscription_id, amount, currency, payment_method,
              payment_reference, stripe_invoice_id, status, notes,
              created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          `, [
            paymentId,
            subscriptionId,
            (invoice.amount_paid || 0) / 100,
            invoice.currency.toUpperCase(),
            'CARD',
            ((): string => {
              const pi: any = (invoice as any).payment_intent;
              if (!pi) return invoice.id;
              return typeof pi === 'string' ? pi : pi.id ?? invoice.id;
            })(),
            invoice.id,
            'COMPLETED',
            'Synced from Stripe'
          ]);
        }
      }
    } catch (error: any) {
      console.error(`Error syncing invoices for subscription ${stripeSubscriptionId}:`, error);
      // Don't throw - invoice sync is not critical
    }
  }
  
  /**
   * Validate subscription data consistency
   */
  async validateSubscriptionConsistency(academyId: string): Promise<{
    consistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      // Get academy's subscriptions
      const subscriptionsResult = await query(`
        SELECT 
          s.id, s.stripe_subscription_id, s.status, s.start_date, s.end_date,
          p.stripe_price_id, a.stripe_customer_id
        FROM academy_subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        JOIN academies a ON s.academy_id = a.id
        WHERE s.academy_id = $1 AND s.stripe_subscription_id IS NOT NULL
      `, [academyId]);
      
      for (const subscription of subscriptionsResult.rows) {
        try {
          // Fetch from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.stripe_subscription_id
          );
          
          // Compare status
          if (subscription.status !== stripeSubscription.status.toUpperCase()) {
            issues.push(
              `Subscription ${subscription.id}: Status mismatch (Local: ${subscription.status}, Stripe: ${stripeSubscription.status})`
            );
          }
          
          // Compare dates (support different SDK return shapes)
          const subAny: any = stripeSubscription as any;
          const startUnix = subAny.current_period_start ?? subAny.data?.current_period_start;
          const endUnix = subAny.current_period_end ?? subAny.data?.current_period_end;
          const stripeStart = new Date((startUnix as number) * 1000);
          const stripeEnd = new Date((endUnix as number) * 1000);
          
          if (Math.abs(new Date(subscription.start_date).getTime() - stripeStart.getTime()) > 1000) {
            issues.push(
              `Subscription ${subscription.id}: Start date mismatch`
            );
          }
          
          if (Math.abs(new Date(subscription.end_date).getTime() - stripeEnd.getTime()) > 1000) {
            issues.push(
              `Subscription ${subscription.id}: End date mismatch`
            );
          }
          
        } catch (error: any) {
          if (error.code === 'resource_missing') {
            issues.push(
              `Subscription ${subscription.id}: Not found in Stripe (${subscription.stripe_subscription_id})`
            );
          } else {
            issues.push(
              `Subscription ${subscription.id}: Error validating - ${error.message}`
            );
          }
        }
      }
      
      return {
        consistent: issues.length === 0,
        issues
      };
      
    } catch (error: any) {
      return {
        consistent: false,
        issues: [`Validation failed: ${error.message}`]
      };
    }
  }
}

// Export singleton instance
export const subscriptionSync = new SubscriptionSyncService();