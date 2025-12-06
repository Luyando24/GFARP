import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '../hooks/use-toast';
import { saveSession } from '@/lib/auth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch('/api/football-auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage('Your email has been successfully verified!');
          
          // Auto-login if data is returned
          if (data.data && data.data.token) {
             const session = {
              userId: data.data.user.id,
              role: 'academy',
              schoolId: data.data.user.academy_id, // Mapping academy_id to schoolId for compatibility
              tokens: { accessToken: data.data.token, expiresInSec: 24 * 3600 }
            };
            
            // Fetch full academy details to store in local storage (optional but good for UX)
            // For now, we rely on what we have or subsequent calls
            localStorage.setItem('isNewRegistration', 'false'); // Clear new reg flag
            saveSession(session);
            
            toast({
              title: "Verification Successful",
              description: "Redirecting to dashboard...",
            });

            setTimeout(() => {
              navigate('/academy-dashboard');
            }, 2000);
          }
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The token may be invalid or expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again later.');
      }
    };

    verifyToken();
  }, [token, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-gray-50">
            {status === 'loading' && <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-10 w-10 text-green-500" />}
            {status === 'error' && <XCircle className="h-10 w-10 text-red-500" />}
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Verified'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {status === 'success' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500">
                You will be automatically redirected to your dashboard in a few seconds.
              </p>
              <Button onClick={() => navigate('/academy-dashboard')} className="w-full bg-[#005391] hover:bg-[#004274]">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500">
                Please contact support if you believe this is an error or try registering again.
              </p>
              <div className="flex gap-3">
                 <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                  Back to Home
                </Button>
                <Button onClick={() => navigate('/academy-registration')} className="flex-1">
                  Register Again
                </Button>
              </div>
            </div>
          )}
          
           {status === 'loading' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500">
                Please wait while we verify your account credentials...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
