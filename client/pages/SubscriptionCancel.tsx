import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';

const SubscriptionCancel: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    try {
      const sessionStr = localStorage.getItem("ipims_auth_session");
      if (!sessionStr) {
        navigate('/');
        return;
      }
      
      const session = JSON.parse(sessionStr);
      const role = session?.role;

      if (role === 'individual_player') {
        navigate('/player/dashboard');
      } else if (role === 'academy' || role === 'agency_admin') {
        navigate('/academy-dashboard');
      } else if (role === 'admin' || role === 'superadmin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error determining dashboard path:', error);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-xl w-full shadow-2xl border-red-100">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Payment Cancelled</CardTitle>
          <CardDescription className="text-slate-500 font-medium mt-2">
            Your payment process was interrupted. No charges have been made to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8 text-center">
            <p className="text-sm text-slate-600 font-medium">Don't worry, your progress has been saved. You can try again whenever you're ready.</p>
          </div>
          
          <Button 
            variant="default" 
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-widest shadow-lg"
            onClick={handleBackToDashboard}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionCancel;