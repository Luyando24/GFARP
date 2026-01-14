import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Wallet, DollarSign, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PlayerPaymentMethodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: {
    id: string;
    name: string;
    price: number;
    billingCycle?: string;
  } | null;
  onSuccess: () => void;
}

export default function PlayerPaymentMethodSelector({
  isOpen,
  onClose,
  selectedPlan,
  onSuccess
}: PlayerPaymentMethodSelectorProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('CARD'); // Default to CARD
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;

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
        const response = await fetch('/api/individual-players/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId: selectedPlan.id,
            billingCycle: selectedPlan.billingCycle || 'one-time',
            successUrl: `${window.location.origin}/player-dashboard?tab=subscription&payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/player-dashboard?tab=subscription&payment_cancelled=true`,
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
            You are subscribing to the {selectedPlan.name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{selectedPlan.name}</span>
              <span className="font-bold text-lg">${selectedPlan.price}</span>
            </div>
            <div className="text-sm text-muted-foreground flex justify-between">
              <span>Billing Cycle</span>
              <span className="capitalize">{selectedPlan.billingCycle || 'One-time'}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 my-2 pt-2 flex justify-between items-center font-bold">
              <span>Total due today</span>
              <span>${selectedPlan.price}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Select Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={handlePaymentMethodChange} className="grid grid-cols-1 gap-3">
              <div>
                <RadioGroupItem value="CARD" id="card" className="peer sr-only" />
                <Label
                  htmlFor="card"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      <span className="font-semibold">Credit/Debit Card</span>
                    </div>
                    {paymentMethod === 'CARD' && <CheckCircle className="h-4 w-4 text-primary" />}
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing} className="w-full sm:w-auto">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay ${selectedPlan.price}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
