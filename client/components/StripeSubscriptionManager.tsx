import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import StripePaymentForm from './StripePaymentForm';
import { formatCurrency } from '@/lib/stripe';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  is_popular?: boolean;
  stripe_price_id?: string;
}

interface CurrentSubscription {
  id: string;
  status: string;
  planName: string;
  price: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  stripeSubscriptionId?: string;
}

interface SubscriptionManagerProps {
  currentSubscription?: CurrentSubscription;
  availablePlans: SubscriptionPlan[];
  onSubscriptionChange?: () => void;
}

const StripeSubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  currentSubscription,
  availablePlans,
  onSubscriptionChange
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/stripe/subscription-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    if (plan.price === 0) {
      // Handle free plan directly
      await createSubscription(plan.id);
      return;
    }

    setSelectedPlan(plan);
    setLoading(true);

    try {
      // Create subscription and get client secret
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId: plan.id
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.type === 'free') {
          toast.success('Free plan activated successfully!');
          onSubscriptionChange?.();
          setSelectedPlan(null);
        } else if (data.data.clientSecret) {
          setClientSecret(data.data.clientSecret);
          setShowPaymentForm(true);
        } else {
          toast.error('Failed to initialize payment');
        }
      } else {
        toast.error(data.message || 'Failed to create subscription');
      }
    } catch (error: any) {
      toast.error('Error creating subscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (planId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Subscription created successfully!');
        onSubscriptionChange?.();
        setSelectedPlan(null);
        setShowPaymentForm(false);
      } else {
        toast.error(data.message || 'Failed to create subscription');
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (newPlanId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/upgrade-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newPlanId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Subscription upgraded successfully!');
        onSubscriptionChange?.();
        fetchSubscriptionStatus();
      } else {
        toast.error(data.message || 'Failed to upgrade subscription');
      }
    } catch (error: any) {
      toast.error('Error upgrading subscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (immediately = false) => {
    if (!confirm(immediately ? 
      'Are you sure you want to cancel your subscription immediately?' : 
      'Are you sure you want to cancel your subscription at the end of the current period?'
    )) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ immediately })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        onSubscriptionChange?.();
        fetchSubscriptionStatus();
      } else {
        toast.error(data.message || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      toast.error('Error cancelling subscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentIntent: any) => {
    toast.success('Payment successful! Your subscription is now active.');
    setShowPaymentForm(false);
    setSelectedPlan(null);
    setClientSecret('');
    onSubscriptionChange?.();
    fetchSubscriptionStatus();
  };

  const handlePaymentError = (error: string) => {
    toast.error('Payment failed: ' + error);
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
    setClientSecret('');
  };

  if (showPaymentForm && selectedPlan && clientSecret) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Complete Your Subscription</h2>
            <p className="text-gray-600 mt-2">
              You're subscribing to <strong>{selectedPlan.name}</strong> for{' '}
              <strong>{formatCurrency(selectedPlan.price, selectedPlan.currency)}</strong>
              /{selectedPlan.interval}
            </p>
          </div>

          <StripePaymentForm
            clientSecret={clientSecret}
            amount={selectedPlan.price}
            currency={selectedPlan.currency}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
            buttonText={`Subscribe for ${formatCurrency(selectedPlan.price, selectedPlan.currency)}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Current Subscription Status */}
      {subscriptionStatus?.hasSubscription && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Subscription</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="font-semibold">{subscriptionStatus.subscription.planName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                subscriptionStatus.subscription.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {subscriptionStatus.subscription.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Price</p>
              <p className="font-semibold">
                {formatCurrency(subscriptionStatus.subscription.price, 'usd')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next Billing</p>
              <p className="font-semibold">
                {new Date(subscriptionStatus.subscription.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {subscriptionStatus.subscription.stripeSubscriptionId && (
            <div className="mt-4 flex space-x-4">
              <button
                onClick={() => handleCancel(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
              >
                Cancel at Period End
              </button>
              <button
                onClick={() => handleCancel(true)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50"
              >
                Cancel Immediately
              </button>
            </div>
          )}
        </div>
      )}

      {/* Available Plans */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {subscriptionStatus?.hasSubscription ? 'Upgrade Your Plan' : 'Choose Your Plan'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative border rounded-lg p-6 ${
                plan.is_popular 
                  ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                  : 'border-gray-200'
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 text-sm font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 mt-2">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(plan.price, plan.currency)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600">/{plan.interval}</span>
                  )}
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (subscriptionStatus?.hasSubscription) {
                    handleUpgrade(plan.id);
                  } else {
                    handlePlanSelect(plan);
                  }
                }}
                disabled={loading}
                className={`w-full mt-6 py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                  plan.is_popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500'
                }`}
              >
                {loading ? 'Processing...' : (
                  subscriptionStatus?.hasSubscription ? 'Upgrade' : 
                  plan.price === 0 ? 'Get Started Free' : 'Subscribe'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StripeSubscriptionManager;