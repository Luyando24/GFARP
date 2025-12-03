import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Wallet, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PaymentMethodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: {
    id: string;
    name: string;
    price: number;
    isFree: boolean;
  } | null;
  academyId: string;
  onSuccess: () => void;
}

export default function PaymentMethodSelector({
  isOpen,
  onClose,
  selectedPlan,
  academyId,
  onSuccess
}: PaymentMethodSelectorProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('CARD'); // Default to CARD
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;

    // For free plans, no payment method is required
    if (selectedPlan.isFree) {
      setIsProcessing(true);
      try {
        const response = await fetch('/api/subscriptions/upgrade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            academyId,
            newPlanId: selectedPlan.id,
            paymentMethod: null, // No payment method for free plans
            notes: `Upgraded to ${selectedPlan.name} (Free Plan)`
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast({
            title: "Success",
            description: `Successfully upgraded to ${selectedPlan.name}`,
          });
          onSuccess();
          onClose();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to upgrade plan",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error upgrading to free plan:', error);
        toast({
          title: "Error",
          description: "Failed to upgrade plan",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // For paid plans, validate payment method selection
    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (paymentMethod === 'CARD') {
        // Create Stripe Checkout Session
        const response = await fetch('/api/payments/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            academyId,
            planId: selectedPlan.id,
            successUrl: `${window.location.origin}/academy-dashboard?tab=subscription&payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/academy-dashboard?tab=subscription&payment_cancelled=true`
          }),
        });

        const result = await response.json();

        if (result.success && result.url) {
          // Redirect to Stripe Checkout
          window.location.href = result.url;
        } else {
          throw new Error(result.message || 'Failed to create checkout session');
        }
      } else {
        toast({
          title: "Coming Soon",
          description: "This payment method is not yet available.",
        });
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (!selectedPlan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Subscription</DialogTitle>
          <DialogDescription>
            You're upgrading to <strong>{selectedPlan.name}</strong>
            {selectedPlan.isFree ? ' (Free)' : ` for $${selectedPlan.price}/month`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {selectedPlan.isFree ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-600">
                    No payment required for the free plan
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div>
                <Label className="text-base font-medium">Select Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={handlePaymentMethodChange} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CARD" id="card" />
                    <Label htmlFor="card" className="flex items-center space-x-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      <span>Credit/Debit Card (Stripe)</span>
                    </Label>
                  </div>
                  {/* PayPal hidden for now as requested */}
                  {/* <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
                    <RadioGroupItem value="PAYPAL" id="paypal" disabled />
                    <Label htmlFor="paypal" className="flex items-center space-x-2 cursor-not-allowed">
                      <Wallet className="h-4 w-4" />
                      <span>PayPal (Coming Soon)</span>
                    </Label>
                  </div> */}
                </RadioGroup>
              </div>

              <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-600">
                You will be redirected to a secure payment page to complete your subscription.
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing
              ? 'Redirecting...'
              : (selectedPlan.isFree ? 'Activate Plan' : `Pay $${selectedPlan.price}`)
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}