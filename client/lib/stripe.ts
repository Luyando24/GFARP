import { loadStripe, Stripe } from '@stripe/stripe-js';

// Get the publishable key from environment variables
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe functionality will be disabled.');
}

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Stripe configuration constants
export const STRIPE_CONFIG = {
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '6px',
    },
  },
  loader: 'auto' as const,
};

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
};

// Helper function to convert dollars to cents for Stripe
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

// Helper function to convert cents to dollars from Stripe
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

// Payment method types supported
export type PaymentMethodType = 'card' | 'paypal' | 'bank_transfer' | 'cash';

// Stripe payment status mapping
export const STRIPE_STATUS_MAP = {
  'requires_payment_method': 'PENDING',
  'requires_confirmation': 'PENDING',
  'requires_action': 'PENDING',
  'processing': 'PENDING',
  'requires_capture': 'PENDING',
  'canceled': 'CANCELLED',
  'succeeded': 'COMPLETED',
} as const;

// Subscription status mapping
export const SUBSCRIPTION_STATUS_MAP = {
  'incomplete': 'PENDING',
  'incomplete_expired': 'EXPIRED',
  'trialing': 'ACTIVE',
  'active': 'ACTIVE',
  'past_due': 'SUSPENDED',
  'canceled': 'CANCELLED',
  'unpaid': 'SUSPENDED',
  'paused': 'SUSPENDED',
} as const;

export default getStripe;