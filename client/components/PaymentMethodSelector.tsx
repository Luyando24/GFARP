import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Wallet, DollarSign, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PaymentMethodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: {
    id: string;
    name: string;
    price: number;
    isFree: boolean;
    billingCycle?: 'monthly' | 'yearly';
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
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number; id: string } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const { toast } = useToast();

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    
    setValidatingPromo(true);
    try {
      const res = await fetch('/api/admin/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode })
      });
      const data = await res.json();
      
      if (data.success) {
        setAppliedDiscount({
          code: data.data.code,
          percent: data.data.discount_percent,
          id: data.data.id
        });
        toast({
          title: "Promo Code Applied!",
          description: `${data.data.discount_percent}% discount applied.`,
        });
      } else {
        toast({
          title: "Invalid Code",
          description: data.message || "Promo code is invalid or expired",
          variant: "destructive"
        });
        setAppliedDiscount(null);
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      toast({
        title: "Error",
        description: "Failed to validate promo code",
        variant: "destructive"
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const getDiscountedPrice = () => {
    if (!selectedPlan || !appliedDiscount) return selectedPlan?.price;
    const discountAmount = (selectedPlan.price * appliedDiscount.percent) / 100;
    return Math.max(0, selectedPlan.price - discountAmount); // Ensure price doesn't go below 0
  };

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
            billingCycle: selectedPlan.billingCycle || 'monthly',
            successUrl: `${window.location.origin}/academy-dashboard?tab=subscription&payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/academy-dashboard?tab=subscription&payment_cancelled=true`,
            promoCodeId: appliedDiscount?.id
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
              {/* Promo Code Section */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Promo Code</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      disabled={!!appliedDiscount}
                      className="w-full px-3 py-2 border rounded-md uppercase text-sm"
                    />
                    {appliedDiscount && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 h-4 w-4" />
                    )}
                  </div>
                  {appliedDiscount ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setAppliedDiscount(null);
                        setPromoCode('');
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button 
                      variant="secondary" 
                      onClick={handleValidatePromo}
                      disabled={!promoCode || validatingPromo}
                    >
                      {validatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </Button>
                  )}
                </div>
                {appliedDiscount && (
                  <p className="text-xs text-green-600 font-medium">
                    {appliedDiscount.percent}% discount applied! New price: ${getDiscountedPrice()?.toFixed(2)}
                  </p>
                )}
              </div>

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
              : (selectedPlan.isFree ? 'Activate Plan' : `Pay $${getDiscountedPrice()?.toFixed(2)}`)
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}