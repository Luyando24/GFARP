import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '../hooks/use-toast';
import { saveSession } from '@/lib/auth';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

const initialFormData: FormData = {
  email: '',
  password: '',
  confirmPassword: ''
};

export default function RegisterAcademy() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Enter a valid email address';
    if (!formData.password || formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
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
      const submitData = {
        email: formData.email,
        password: formData.password
      };

      const response = await fetch('/api/football-auth/academy/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      let data: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) data = await response.json();
      else throw new Error(await response.text());

      if (data.success) {
        const session = {
          userId: data.data.academy.id,
          role: 'academy' as const,
          schoolId: data.data.academy.id,
          tokens: { accessToken: data.data.token, expiresInSec: 24 * 3600 }
        };
        localStorage.setItem('academy_data', JSON.stringify(data.data.academy));
        localStorage.setItem('isNewRegistration', 'true');
        saveSession(session);
        toast({ title: 'Registration Successful', description: 'Let\'s complete your academy profile!' });
        navigate('/complete-profile');
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error: any) {
      toast({ title: 'Registration Failed', description: error?.message || 'Unexpected error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <header className="bg-gradient-to-r from-[#005391] via-[#0066b3] to-[#005391] shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Trophy className="h-5 w-5 text-[#005391]" />
              </div>
              <div className="text-white">
                <div className="text-xl font-black tracking-tight">GFARP</div>
                <div className="text-xs text-blue-100">Academy Registration</div>
              </div>
            </Link>

            <Button variant="ghost" asChild className="text-white hover:bg-white/20">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-full flex items-center justify-center mb-3 shadow-lg">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-xl font-bold text-[#001a33]">Create Your Account</h1>
                <p className="text-sm text-gray-600">Sign up with email and password</p>
              </div>
              <CardTitle className="sr-only">Register Academy</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none"
                    placeholder="academy@example.com"
                    required
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="password">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="confirmPassword">Confirm Password</label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#0066b3] hover:to-[#005391] text-white font-bold shadow-lg"
                >
                  {isSubmitting ? 'Registering...' : 'Create Account'}
                </Button>
              </form>

              <div className="text-center text-sm mt-4">
                Already have an account? <Link to="/academy-dashboard" className="text-[#005391] hover:underline">Login</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-[#001a33] text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span className="font-bold">FIFA Approved Platform</span>
          </div>
          <p className="text-blue-200 text-sm">© 2024 Global Football Academy Registration Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
