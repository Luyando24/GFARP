import React, { useState, useEffect } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG, formatCurrency, dollarsToCents } from '@/lib/stripe';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentFormProps {
  clientSecret?: string;
  amount?: number;
  currency?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  loading?: boolean;
  buttonText?: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  clientSecret,
  amount,
  currency = 'usd',
  onSuccess,
  onError,
  onCancel,
  loading = false,
  buttonText = 'Pay Now'
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage('Stripe has not loaded yet. Please try again.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      if (clientSecret) {
        // For Payment Intents (one-time payments)
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/payment-success`,
          },
          redirect: 'if_required'
        });

        if (error) {
          setErrorMessage(error.message || 'Payment failed');
          onError?.(error.message || 'Payment failed');
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          onSuccess?.(paymentIntent);
        }
      } else {
        // For card setup without payment intent
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          setErrorMessage('Card element not found');
          return;
        }

        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
        });

        if (error) {
          setErrorMessage(error.message || 'Failed to create payment method');
          onError?.(error.message || 'Failed to create payment method');
        } else {
          onSuccess?.(paymentMethod);
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred');
      onError?.(error.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        {clientSecret ? (
          <PaymentElement 
            options={{
              layout: 'tabs',
              ...STRIPE_CONFIG
            }}
          />
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Information
            </label>
            <div className="border border-gray-300 rounded-md p-3">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>

      {amount && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total Amount:</span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(amount, currency)}
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={!stripe || isProcessing || loading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          ) : (
            buttonText
          )}
        </button>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

interface StripePaymentFormProps extends PaymentFormProps {
  stripeOptions?: any;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  stripeOptions,
  ...paymentFormProps
}) => {
  const options = {
    clientSecret: paymentFormProps.clientSecret,
    appearance: STRIPE_CONFIG,
    ...stripeOptions
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm {...paymentFormProps} />
    </Elements>
  );
};

export default StripePaymentForm;