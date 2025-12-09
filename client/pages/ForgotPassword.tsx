import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@/lib/api";
import { handleError, validateEmail, validateRequired } from "@/lib/errors";
import { Trophy, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      validateRequired(email, "Email");
      
      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email address");
      }
      
      const response = await Api.requestPasswordReset(email);
      
      if (response.success) {
        setSuccess(true);
        toast({
          title: "Reset Link Sent",
          description: "If an account exists with this email, you will receive a password reset link shortly.",
        });
      } else {
        throw new Error(response.message || 'Failed to request password reset');
      }
    } catch (e: any) {
      const errorMessage = String(e?.message || e);
      setError(errorMessage);
      handleError(e, "Password Reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-green-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white rounded-full"></div>
        <div className="absolute top-40 right-32 w-24 h-24 border-2 border-white rounded-full"></div>
        <div className="absolute bottom-32 left-1/4 w-16 h-16 border-2 border-white rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-20 h-20 border-2 border-white rounded-full"></div>
      </div>

      {/* Back to Login Button */}
      <Link 
        to="/login" 
        className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-yellow-300 transition-colors duration-200 z-10"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-medium">Back to Login</span>
      </Link>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
              Soccer Circular
            </h1>
            <p className="text-sm text-gray-600">Password Recovery</p>
          </div>
          <CardTitle className="text-xl text-gray-800">Forgot Password?</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Enter your email to receive reset instructions</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
                <p className="font-medium">Check your email</p>
                <p className="text-sm mt-1">We've sent a password reset link to <strong>{email}</strong></p>
              </div>
              <Button 
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Return to Login
              </Button>
              <button 
                onClick={() => setSuccess(false)}
                className="text-sm text-blue-600 hover:underline"
              >
                Didn't receive the email? Try again
              </button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="academy@example.com"
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 pl-10"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </div>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}