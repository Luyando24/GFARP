import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, ArrowRight } from 'lucide-react';

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();

  const getDashboardPath = () => {
    try {
      const sessionStr = localStorage.getItem("ipims_auth_session");
      if (!sessionStr) return '/';
      
      const session = JSON.parse(sessionStr);
      const role = session?.role;

      if (role === 'individual_player') return '/player/dashboard';
      if (role === 'academy' || role === 'agency_admin') return '/academy-dashboard';
      if (role === 'admin' || role === 'superadmin') return '/admin';
      return '/';
    } catch (error) {
      console.error('Error determining dashboard path:', error);
      return '/';
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(getDashboardPath());
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-6">
      <Card className="max-w-xl w-full shadow-2xl border-indigo-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
        
        <CardHeader className="text-center pb-8 pt-10">
          <div className="mx-auto w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <Crown className="h-12 w-12 text-indigo-600" />
          </div>
          <CardTitle className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Subscription Activated!</CardTitle>
          <CardDescription className="text-slate-600 font-medium text-lg mt-2">
            Welcome to the premium experience.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-10 pb-10">
          <div className="bg-indigo-600/5 rounded-2xl p-6 border border-indigo-100 mb-8 text-center">
            <p className="text-slate-700 font-semibold italic">"You are now ready to take your career to the next level."</p>
            <p className="text-xs text-indigo-500 font-bold uppercase mt-3 tracking-widest">Premium Member</p>
          </div>
          
          <div className="space-y-4">
            <Button 
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl transition-all duration-300"
              onClick={() => navigate(getDashboardPath())}
            >
              Go to My Dashboard
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
              Auto-redirecting in 5 seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;