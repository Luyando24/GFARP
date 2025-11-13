import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';

const SubscriptionCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-600" />
            <CardTitle>Payment Cancelled</CardTitle>
          </div>
          <CardDescription>
            Your payment was cancelled. No changes have been made to your subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">You can return to the dashboard to try again.</p>
            <Button variant="outline" onClick={() => navigate('/academy-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionCancel;