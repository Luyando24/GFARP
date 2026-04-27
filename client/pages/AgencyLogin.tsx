import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@/lib/api";
import { saveSession, useAuth } from "@/lib/auth";
import { handleError, validateEmail, validateRequired } from "@/lib/errors";
import { Building, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import SEO from "@/components/SEO";

export default function AgencyLogin() {
  const navigate = useNavigate();
  const { t, dir } = useTranslation();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      if (session.role === 'agency_admin') {
        navigate("/academy-dashboard"); // Currently agencies use the same dashboard component
      }
    }
  }, [session, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      validateRequired(email, "Email");
      validateRequired(password, "Password");
      
      if (!validateEmail(email)) {
        throw new Error(t('auth.error.invalidEmail'));
      }
      
      // Agency login endpoint
      const response: any = await Api.post('football-auth/agency/login', { email, password });
      
      if (response.success) {
        // Transform agency response to match AuthSession format
        const session = {
          userId: response.data.agency.id,
          role: 'agency_admin',
          agencyId: response.data.agency.id,
          tokens: {
            accessToken: response.data.token,
            expiresInSec: 7 * 24 * 3600 // 7 days
          }
        };
        
        // Store additional agency data
        localStorage.setItem('agency_data', JSON.stringify(response.data.agency));
        
        saveSession(session as any);
        navigate("/academy-dashboard");
      } else {
        throw new Error(response.message || t('auth.error.loginFailed'));
      }
    } catch (e: any) {
      const errorMessage = String(e?.message || e);
      setError(errorMessage);
      handleError(e, "Agency Login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden" dir={dir}>
      <SEO title="Agency Login | Soccer Circular" />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white rounded-full"></div>
        <div className="absolute top-40 right-32 w-24 h-24 border-2 border-white rounded-full"></div>
        <div className="absolute bottom-32 left-1/4 w-16 h-16 border-2 border-white rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-20 h-20 border-2 border-white rounded-full"></div>
      </div>

      {/* Back to Home Button */}
      <Link 
        to="/portal" 
        className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-yellow-400 transition-colors duration-200 z-10 font-bold"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">Back to Portal</span>
      </Link>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-600"></div>
        
        <CardHeader className="text-center pb-6">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl transform rotate-3">
              <Building className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-1">
              Agency Portal
            </h1>
            <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">Professional Talent Management</p>
          </div>
          <CardTitle className="text-xl font-bold text-slate-800">Welcome Back</CardTitle>
          <p className="text-sm text-slate-600 mt-1">Access your agency dashboard and player portfolio</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest" htmlFor="email">
                Agency Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="agency@example.com"
                className="h-12 border-slate-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl font-medium"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 border-slate-200 focus:border-orange-500 focus:ring-orange-500 pr-10 rounded-xl font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 h-4 w-4" />
                <span>Remember Agency</span>
              </label>
              <Link to="/forgot-password" title="Forgot password" className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide">
                Forgot Access?
              </Link>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-500 text-white font-black uppercase tracking-widest shadow-xl hover:shadow-orange-500/20 transition-all duration-300 rounded-xl"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </div>
              ) : (
                "Enter Agency Portal"
              )}
            </Button>
          </form>

          <div className="text-center pt-6 border-t border-slate-100">
            <p className="text-sm font-bold text-slate-500">
               New Agency?{" "}
               <Link className="text-blue-600 hover:text-blue-800 underline underline-offset-4" to="/agency-registration">
                 Register Portfolio
               </Link>
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
