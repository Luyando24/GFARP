import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface CardDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

interface PayPalDetails {
  email: string;
}

export default function PaymentMethodSelector({
  isOpen,
  onClose,
  selectedPlan,
  academyId,
  onSuccess
}: PaymentMethodSelectorProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [paypalDetails, setPaypalDetails] = useState<PayPalDetails>({
    email: ''
  });
  const { toast } = useToast();

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
  };

  const handleCardDetailsChange = (field: keyof CardDetails, value: string) => {
    setCardDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePayPalDetailsChange = (field: keyof PayPalDetails, value: string) => {
    setPaypalDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateCardDetails = (): boolean => {
    if (!cardDetails.cardNumber || cardDetails.cardNumber.length < 16) {
      toast({
        title: "Invalid Card Number",
        description: "Please enter a valid card number",
        variant: "destructive"
      });
      return false;
    }
    if (!cardDetails.expiryDate || !/^\d{2}\/\d{2}$/.test(cardDetails.expiryDate)) {
      toast({
        title: "Invalid Expiry Date",
        description: "Please enter expiry date in MM/YY format",
        variant: "destructive"
      });
      return false;
    }
    if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
      toast({
        title: "Invalid CVV",
        description: "Please enter a valid CVV",
        variant: "destructive"
      });
      return false;
    }
    if (!cardDetails.cardholderName.trim()) {
      toast({
        title: "Invalid Cardholder Name",
        description: "Please enter the cardholder name",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const validatePayPalDetails = (): boolean => {
    if (!paypalDetails.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalDetails.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid PayPal email address",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const simulatePayPalPayment = async (email: string, amount: number): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> => {
    // Simulate PayPal API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate 95% success rate for PayPal payments
    const success = Math.random() > 0.05;

    if (success) {
      return {
        success: true,
        transactionId: `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        success: false,
        error: 'PayPal payment was declined. Please check your PayPal account or try a different payment method.'
      };
    }
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

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
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
                      <span>Credit/Debit Card</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PAYPAL" id="paypal" />
                    <Label htmlFor="paypal" className="flex items-center space-x-2 cursor-pointer">
                      <Wallet className="h-4 w-4" />
                      <span>PayPal</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {paymentMethod === 'CARD' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Card Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardDetails.cardNumber}
                        onChange={(e) => handleCardDetailsChange('cardNumber', formatCardNumber(e.target.value))}
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          placeholder="MM/YY"
                          value={cardDetails.expiryDate}
                          onChange={(e) => handleCardDetailsChange('expiryDate', formatExpiryDate(e.target.value))}
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={cardDetails.cvv}
                          onChange={(e) => handleCardDetailsChange('cvv', e.target.value.replace(/\D/g, ''))}
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cardholderName">Cardholder Name</Label>
                      <Input
                        id="cardholderName"
                        placeholder="John Doe"
                        value={cardDetails.cardholderName}
                        onChange={(e) => handleCardDetailsChange('cardholderName', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentMethod === 'PAYPAL' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">PayPal Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="paypalEmail">PayPal Email</Label>
                      <Input
                        id="paypalEmail"
                        type="email"
                        placeholder="your-email@example.com"
                        value={paypalDetails.email}
                        onChange={(e) => handlePayPalDetailsChange('email', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
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
              ? (paymentMethod === 'PAYPAL' ? 'Processing PayPal...' : 'Processing...')
              : (selectedPlan.isFree ? 'Activate Plan' : `Pay $${selectedPlan.price}`)
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}