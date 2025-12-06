import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function VerificationPending() {
  const location = useLocation();
  const email = location.state?.email || 'your email address';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Check your email
          </CardTitle>
          <CardDescription className="text-base mt-2">
            We've sent a verification link to <br />
            <span className="font-medium text-slate-900">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="text-center text-sm text-gray-500">
            <p>Click the link in the email to verify your account.</p>
            <p className="mt-2">If you don't see it, check your spam folder.</p>
          </div>

          <div className="border-t pt-6">
            <Link to="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </div>
          
          <div className="text-center text-xs text-gray-400">
            <p>Didn't receive the email? <span className="text-blue-600 cursor-pointer hover:underline">Resend</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
