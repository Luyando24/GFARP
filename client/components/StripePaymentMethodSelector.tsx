import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Wallet, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import StripePaymentForm from './StripePaymentForm';
import { formatCurrency } from '../lib/stripe';

interface PaymentMethodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: {
    id: string;
    name: string;
    price: number;
    currency?: string;
    isFree: boolean;
  } | null;
  academyId: string;
  onSuccess: () => void;
}

export default function StripePaymentMethodSelector({
  isOpen,
  onClose,
  selectedPlan,
  academyId,
  onSuccess
}: PaymentMethodSelectorProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
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
        const response = await fetch('/api/stripe/create-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            planId: selectedPlan.id
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast({
            title: "Success",
            description: `Successfully activated ${selectedPlan.name}`,
          });
          onSuccess();
          onClose();
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to activate plan",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "An error occurred",
          variant: "destructive"
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

    if (paymentMethod === 'STRIPE_CARD') {
      await initializeStripePayment();
    } else if (paymentMethod === 'CASH') {
      await handleCashPayment();
    }
  };

  const initializeStripePayment = async () => {
    setIsProcessing(true);
    try {
      // First, ensure we have a Stripe customer
      const customerResponse = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!customerResponse.ok) {
        throw new Error('Failed to create Stripe customer');
      }

      // Create subscription
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId: selectedPlan!.id
        }),
      });

      const result = await response.json();

      if (result.success && result.data.clientSecret) {
        setClientSecret(result.data.clientSecret);
        setShowStripeForm(true);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to initialize payment",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashPayment = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          academyId,
          newPlanId: selectedPlan!.id,
          paymentMethod: 'CASH',
          notes: `Cash payment for ${selectedPlan!.name}`
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully upgraded to ${selectedPlan!.name}. Please complete cash payment as arranged.`,
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to process cash payment",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripePaymentSuccess = (paymentIntent: any) => {
    toast({
      title: "Payment Successful",
      description: `Successfully subscribed to ${selectedPlan!.name}`,
    });
    onSuccess();
    onClose();
    setShowStripeForm(false);
    setClientSecret('');
  };

  const handleStripePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
  };

  const handleStripePaymentCancel = () => {
    setShowStripeForm(false);
    setClientSecret('');
  };

  if (showStripeForm && clientSecret && selectedPlan) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
            <DialogDescription>
              Complete payment for {selectedPlan.name} - {formatCurrency(selectedPlan.price, selectedPlan.currency || 'usd')}
            </DialogDescription>
          </DialogHeader>
          
          <StripePaymentForm
            clientSecret={clientSecret}
            amount={selectedPlan.price}
            currency={selectedPlan.currency || 'usd'}
            onSuccess={handleStripePaymentSuccess}
            onError={handleStripePaymentError}
            onCancel={handleStripePaymentCancel}
            buttonText={`Subscribe for ${formatCurrency(selectedPlan.price, selectedPlan.currency || 'usd')}`}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Payment Method</DialogTitle>
          <DialogDescription>
            {selectedPlan?.isFree 
              ? `Activate your ${selectedPlan.name} plan`
              : `Choose how you'd like to pay for ${selectedPlan?.name}`
            }
          </DialogDescription>
        </DialogHeader>

        {selectedPlan && !selectedPlan.isFree && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Plan:</span>
              <span>{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="font-medium">Price:</span>
              <span className="text-lg font-bold">
                {formatCurrency(selectedPlan.price, selectedPlan.currency || 'usd')}
              </span>
            </div>
          </div>
        )}

        {!selectedPlan?.isFree && (
          <RadioGroup value={paymentMethod} onValueChange={handlePaymentMethodChange}>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="STRIPE_CARD" id="stripe-card" />
                <Label htmlFor="stripe-card" className="flex items-center space-x-3 cursor-pointer flex-1">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Credit/Debit Card</div>
                    <div className="text-sm text-gray-500">Secure payment with Stripe</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="CASH" id="cash" />
                <Label htmlFor="cash" className="flex items-center space-x-3 cursor-pointer flex-1">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">Cash Payment</div>
                    <div className="text-sm text-gray-500">Pay in person or bank transfer</div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              selectedPlan?.isFree ? 'Activate Plan' : 'Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}