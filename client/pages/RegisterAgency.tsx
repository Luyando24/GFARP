import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, ArrowLeft, Eye, EyeOff, Building2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '../hooks/use-toast';
import { saveSession } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { usePageTitle } from "@/hooks/usePageTitle";

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralCode?: string;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  referralCode: ''
};

export default function RegisterAgency() {
  const { t, dir } = useTranslation();
  usePageTitle("Agency Registration");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get('ref') || searchParams.get('referralCode');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode }));
      setIsReferralLocked(true);
    }
  }, [location.search]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t('auth.error.agencyNameRequired');
    if (!formData.email.trim()) newErrors.email = t('auth.error.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('auth.error.invalidEmail');
    if (!formData.password || formData.password.length < 8) newErrors.password = t('auth.error.passwordLength');
    if (!formData.confirmPassword) newErrors.confirmPassword = t('auth.error.confirmRequired');
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('auth.error.passwordMismatch');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const searchParams = new URLSearchParams(location.search);
      const plan = searchParams.get('plan');

      const submitData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        subscriptionPlan: plan,
        referralCode: formData.referralCode
      };
      
      const response = await fetch('/api/football-auth/agency/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (data.success) {
        const session = {
          userId: data.data.agency.id,
          role: 'agency_admin' as const,
          agencyId: data.data.agency.id,
          tokens: { accessToken: data.data.token, expiresInSec: 24 * 3600 }
        };
        
        localStorage.setItem('agency_data', JSON.stringify(data.data.agency));
        localStorage.setItem('isNewRegistration', 'true');
        saveSession(session);
        
        toast({ 
          title: t('auth.success.title'), 
          description: t('auth.success.agencyDesc') 
        });
        
        navigate('/complete-profile'); // Agencies can use the same profile completion flow
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (error: any) {
      toast({ 
        title: t('common.error'), 
        description: error?.message || 'An unexpected error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white" dir={dir}>
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-xl border-b border-yellow-400/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Building2 className="h-5 w-5 text-black" />
              </div>
              <div className="text-white">
                <div className="text-xl font-black tracking-tight uppercase italic">Soccer Circular</div>
                <div className="text-[10px] font-bold text-yellow-400 tracking-[0.2em] uppercase">{t('auth.register.agency')}</div>
              </div>
            </Link>

            <Button variant="ghost" asChild className="text-white hover:bg-white/10 hover:text-yellow-400">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('common.backHome')}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400"></div>
            
            <CardHeader className="text-center pb-8 pt-10">
              <div className="mb-6">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl flex items-center justify-center mb-4 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <UserCircle className="h-10 w-10 text-yellow-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('auth.register.agency')}</h1>
                <p className="text-sm text-slate-500 font-medium mt-2">{t('auth.register.agencySubtitle')}</p>
              </div>
            </CardHeader>
            
            <CardContent className="px-8 pb-10">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest" htmlFor="name">{t('auth.agencyName')}</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl focus:border-yellow-400 focus:outline-none transition-all font-medium text-slate-900 bg-slate-50/50"
                      placeholder="World Class Sports Agency"
                      required
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest" htmlFor="email">{t('auth.email')}</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-yellow-400 focus:outline-none transition-all font-medium text-slate-900 bg-slate-50/50"
                    placeholder="contact@agency.com"
                    required
                  />
                  {errors.email && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest" htmlFor="password">{t('auth.password')}</label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-yellow-400 focus:outline-none transition-all font-medium text-slate-900 bg-slate-50/50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest" htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-yellow-400 focus:outline-none transition-all font-medium text-slate-900 bg-slate-50/50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                {(errors.password || errors.confirmPassword) && (
                  <p className="text-red-500 text-[10px] font-bold uppercase">{errors.password || errors.confirmPassword}</p>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest" htmlFor="referralCode">{t('auth.label.referralCode')}</label>
                  <input
                    id="referralCode"
                    type="text"
                    value={formData.referralCode || ''}
                    onChange={(e) => handleInputChange('referralCode', e.target.value)}
                    className={`w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-yellow-400 focus:outline-none transition-all font-medium ${isReferralLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50/50 text-slate-900'}`}
                    placeholder={t('auth.placeholder.referralCode')}
                    disabled={isReferralLocked}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-gradient-to-r from-slate-900 to-blue-900 hover:from-blue-900 hover:to-slate-900 text-yellow-400 font-black uppercase tracking-widest shadow-2xl transition-all duration-300 mt-4 border border-yellow-400/30"
                >
                  {isSubmitting ? t('auth.registering') : t('auth.createAccount')}
                </Button>
              </form>

              <div className="text-center text-xs font-bold mt-8 text-slate-500">
                {t('auth.alreadyHaveAccount')} <Link to="/academy-dashboard" className="text-blue-600 hover:text-blue-800 underline underline-offset-4">{t('auth.loginLink')}</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-slate-950 text-white py-12 border-t border-yellow-400/20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <span className="font-black uppercase tracking-tighter text-xl">{t('auth.footer.approved')}</span>
          </div>
          <p className="text-slate-400 text-xs font-medium max-w-md mx-auto leading-relaxed">
            © 2024 Soccer Circular. {t('footer.copyright')}
            <br />
            Professional Talent Management Suite
          </p>
        </div>
      </footer>
    </div>
  );
}
