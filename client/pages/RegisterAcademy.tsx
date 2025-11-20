import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  Users,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  FileText,
  Shield,
  CheckCircle,
  ArrowLeft,
  Globe,
  Star,
  Target,
  Award,
  Crown,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '../hooks/use-toast';
import { saveSession } from '@/lib/auth';

interface FormData {
  // Academy Information
  academyName: string;
  establishedYear: string;

  // Contact Information
  email: string;
  phone: string;
  phoneCountryCode: string;

  // Account Security
  password: string;
  confirmPassword: string;

  // Address Information
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;

  // Director Information
  directorName: string;
  directorEmail: string;
  directorPhone: string;

  // Academy Details
  playerCapacity: string;
  ageGroups: string[];
  facilities: string[];

  // Subscription Plan
  selectedPlan: string;

  // Legal
  termsAccepted: boolean;
  fifaCompliance: boolean;
}

const initialFormData: FormData = {
  academyName: '',
  establishedYear: '',
  email: '',
  phone: '',
  phoneCountryCode: '+1',
  // Account Security
  password: '',
  confirmPassword: '',
  // Address Information
  address: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  // Director Information
  directorName: '',
  directorEmail: '',
  directorPhone: '',
  // Academy Details
  playerCapacity: '',
  ageGroups: [],
  facilities: [],
  // Subscription Plan
  selectedPlan: 'free',
  // Legal
  termsAccepted: false,
  fifaCompliance: false
};

const ageGroupOptions = [
  'Under 8', 'Under 10', 'Under 12', 'Under 14',
  'Under 16', 'Under 18', 'Under 21', 'Senior'
];

const facilityOptions = [
  'Training Pitches', 'Indoor Facilities', 'Gymnasium',
  'Medical Center', 'Dormitories', 'Cafeteria',
  'Equipment Storage', 'Video Analysis Room'
];

export default function RegisterAcademy() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Load subscription plans from database
  useEffect(() => {
    const loadSubscriptionPlans = async () => {
      try {
        setPlansLoading(true);
        console.log('[FRONTEND] Fetching subscription plans from /api/subscriptions/plans');
        const response = await fetch('/api/subscriptions/plans');
        console.log('[FRONTEND] Response status:', response.status, response.statusText);

        const data = await response.json();
        console.log('[FRONTEND] Response data:', data);

        if (data.success && data.data) {
          console.log('[FRONTEND] Received', data.data.length, 'plans');
          // Transform database plans to match UI format
          const transformedPlans = data.data.map((plan: any) => ({
            id: plan.id,
            name: plan.name,
            price: plan.isFree ? '$0' : `$${plan.price}`,
            period: plan.billingCycle === 'LIFETIME' ? '' : '/month',
            features: plan.features,
            color: getColorForPlan(plan.name),
            popular: plan.name === 'Basic Plan' // Mark Basic as popular
          }));
          setSubscriptionPlans(transformedPlans);

          // Set default plan to Free Plan if available
          const freePlan = transformedPlans.find((p: any) => p.name === 'Free Plan');
          if (freePlan && !formData.selectedPlan) {
            setFormData(prev => ({ ...prev, selectedPlan: freePlan.id }));
          }
        } else {
          console.error('[FRONTEND] API returned success:false or no data:', data);
        }
      } catch (error) {
        console.error('[FRONTEND] Error loading subscription plans:', error);
        toast({
          title: "Error",
          description: "Failed to load subscription plans. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setPlansLoading(false);
      }
    };

    loadSubscriptionPlans();
  }, []);

  // Helper function to assign colors to plans
  const getColorForPlan = (planName: string) => {
    switch (planName) {
      case 'Free Plan': return 'from-gray-500 to-gray-600';
      case 'Basic Plan': return 'from-blue-500 to-blue-600';
      case 'Pro Plan': return 'from-green-500 to-green-600';
      case 'Elite Plan': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  // Set initial plan from URL params
  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan && subscriptionPlans.length > 0) {
      const foundPlan = subscriptionPlans.find(p => p.id === plan || p.name.toLowerCase().includes(plan.toLowerCase()));
      if (foundPlan) {
        setFormData(prev => ({ ...prev, selectedPlan: foundPlan.id }));
      }
    }
  }, [searchParams, subscriptionPlans]);

  const handleInputChange = (field: keyof FormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleArrayToggle = (field: 'ageGroups' | 'facilities', value: string) => {
    const currentArray = formData[field] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    handleInputChange(field, newArray);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.academyName.trim()) newErrors.academyName = 'Academy name is required';
        if (!formData.establishedYear.trim()) newErrors.establishedYear = 'Established year is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Enter a valid email address';
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
        // Password validation
        if (!formData.password || formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else {
          const hasUpper = /[A-Z]/.test(formData.password);
          const hasLower = /[a-z]/.test(formData.password);
          const hasNumber = /[0-9]/.test(formData.password);
          if (!hasUpper || !hasLower || !hasNumber) {
            newErrors.password = 'Include upper, lower case letters and a number';
          }
        }
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
      case 2:
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.country.trim()) newErrors.country = 'Country is required';
        break;
      case 3:
        if (!formData.directorName.trim()) newErrors.directorName = 'Director name is required';
        if (!formData.directorEmail.trim()) newErrors.directorEmail = 'Director email is required';
        if (!formData.playerCapacity.trim()) newErrors.playerCapacity = 'Player capacity is required';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions';
        if (!formData.fifaCompliance) newErrors.fifaCompliance = 'FIFA compliance agreement is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        // Skip to submission after step 3
        handleSubmit();
      } else {
        setCurrentStep(prev => Math.min(prev + 1, 3));
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        name: formData.academyName,
        email: formData.email,
        password: formData.password,
        contactPerson: formData.directorName,
        phone: `${formData.phoneCountryCode}${formData.phone}`,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        foundedYear: formData.establishedYear ? parseInt(formData.establishedYear) : undefined,
        description: `Academy with capacity for ${formData.playerCapacity} players. Age groups: ${formData.ageGroups.join(', ')}. Facilities: ${formData.facilities.join(', ')}.`,
        subscriptionPlan: formData.selectedPlan
      };

      const response = await fetch('/api/football-auth/academy/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (data.success) {
        // Save session to automatically log in the user
        const session = {
          userId: data.data.academy.id,
          role: 'academy',
          schoolId: data.data.academy.id,
          tokens: {
            accessToken: data.data.token,
            expiresInSec: 24 * 3600 // 24 hours
          }
        };

        // Store additional academy data
        localStorage.setItem('academy_data', JSON.stringify(data.data.academy));
        localStorage.setItem('subscription_data', JSON.stringify({ plan: formData.selectedPlan, status: 'ACTIVE' }));

        saveSession(session);

        toast({
          title: 'Registration Successful!',
          description: 'Your academy has been registered successfully. Welcome to GFARP!',
        });

        // Redirect to academy dashboard
        navigate('/academy-dashboard', {
          state: {
            message: 'Academy registration successful! Welcome to GFARP.',
            academyName: formData.academyName
          }
        });
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#005391] to-[#0066b3] rounded-full mb-4">
                <Building className="h-4 w-4 text-white" />
                <span className="text-white font-bold text-sm">ACADEMY INFORMATION</span>
              </div>
              <h2 className="text-2xl font-bold text-[#001a33]">Tell us about your academy</h2>
              <p className="text-gray-600 mt-2">Basic information about your football academy</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#001a33] mb-2">Academy Name *</label>
                <input
                  type="text"
                  value={formData.academyName}
                  onChange={(e) => handleInputChange('academyName', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                  placeholder="Enter academy name"
                />
                {errors.academyName && <p className="text-red-500 text-sm mt-1">{errors.academyName}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#001a33] mb-2">Established Year *</label>
                <input
                  type="number"
                  value={formData.establishedYear}
                  onChange={(e) => handleInputChange('establishedYear', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear()}
                />
                {errors.establishedYear && <p className="text-red-500 text-sm mt-1">{errors.establishedYear}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#001a33] mb-2">Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                  placeholder="contact@youracademy.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#001a33] mb-2">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                    placeholder="Choose a secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#001a33] mb-2">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#001a33] mb-2">Phone Number *</label>
                <div className="flex gap-2">
                  <select
                    value={formData.phoneCountryCode}
                    onChange={(e) => handleInputChange('phoneCountryCode', e.target.value)}
                    className="px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors bg-white min-w-[120px]"
                  >
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+7 840">🇦🇧 +7 840</option>
                    <option value="+93">🇦🇫 +93</option>
                    <option value="+355">🇦🇱 +355</option>
                    <option value="+213">🇩🇿 +213</option>
                    <option value="+1 684">🇦🇸 +1 684</option>
                    <option value="+376">🇦🇩 +376</option>
                    <option value="+244">🇦🇴 +244</option>
                    <option value="+1 264">🇦🇮 +1 264</option>
                    <option value="+672">🇦🇶 +672</option>
                    <option value="+1 268">🇦🇬 +1 268</option>
                    <option value="+54">🇦🇷 +54</option>
                    <option value="+374">🇦🇲 +374</option>
                    <option value="+297">🇦🇼 +297</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+43">🇦🇹 +43</option>
                    <option value="+994">🇦🇿 +994</option>
                    <option value="+1 242">🇧🇸 +1 242</option>
                    <option value="+973">🇧🇭 +973</option>
                    <option value="+880">🇧🇩 +880</option>
                    <option value="+1 246">🇧🇧 +1 246</option>
                    <option value="+375">🇧🇾 +375</option>
                    <option value="+32">🇧🇪 +32</option>
                    <option value="+501">🇧🇿 +501</option>
                    <option value="+229">🇧🇯 +229</option>
                    <option value="+1 441">🇧🇲 +1 441</option>
                    <option value="+975">🇧🇹 +975</option>
                    <option value="+591">🇧🇴 +591</option>
                    <option value="+387">🇧🇦 +387</option>
                    <option value="+267">🇧🇼 +267</option>
                    <option value="+55">🇧🇷 +55</option>
                    <option value="+246">🇮🇴 +246</option>
                    <option value="+673">🇧🇳 +673</option>
                    <option value="+359">🇧🇬 +359</option>
                    <option value="+226">🇧🇫 +226</option>
                    <option value="+257">🇧🇮 +257</option>
                    <option value="+855">🇰🇭 +855</option>
                    <option value="+237">🇨🇲 +237</option>
                    <option value="+1">🇨🇦 +1</option>
                    <option value="+238">🇨🇻 +238</option>
                    <option value="+1 345">🇰🇾 +1 345</option>
                    <option value="+236">🇨🇫 +236</option>
                    <option value="+235">🇹🇩 +235</option>
                    <option value="+56">🇨🇱 +56</option>
                    <option value="+86">🇨🇳 +86</option>
                    <option value="+61">🇨🇽 +61</option>
                    <option value="+61">🇨🇨 +61</option>
                    <option value="+57">🇨🇴 +57</option>
                    <option value="+269">🇰🇲 +269</option>
                    <option value="+242">🇨🇬 +242</option>
                    <option value="+243">🇨🇩 +243</option>
                    <option value="+682">🇨🇰 +682</option>
                    <option value="+506">🇨🇷 +506</option>
                    <option value="+225">🇨🇮 +225</option>
                    <option value="+385">🇭🇷 +385</option>
                    <option value="+53">🇨🇺 +53</option>
                    <option value="+357">🇨🇾 +357</option>
                    <option value="+420">🇨🇿 +420</option>
                    <option value="+45">🇩🇰 +45</option>
                    <option value="+253">🇩🇯 +253</option>
                    <option value="+1 767">🇩🇲 +1 767</option>
                    <option value="+1 809">🇩🇴 +1 809</option>
                    <option value="+593">🇪🇨 +593</option>
                    <option value="+20">🇪🇬 +20</option>
                    <option value="+503">🇸🇻 +503</option>
                    <option value="+240">🇬🇶 +240</option>
                    <option value="+291">🇪🇷 +291</option>
                    <option value="+372">🇪🇪 +372</option>
                    <option value="+251">🇪🇹 +251</option>
                    <option value="+500">🇫🇰 +500</option>
                    <option value="+298">🇫🇴 +298</option>
                    <option value="+679">🇫🇯 +679</option>
                    <option value="+358">🇫🇮 +358</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+594">🇬🇫 +594</option>
                    <option value="+689">🇵🇫 +689</option>
                    <option value="+241">🇬🇦 +241</option>
                    <option value="+220">🇬🇲 +220</option>
                    <option value="+995">🇬🇪 +995</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+233">🇬🇭 +233</option>
                    <option value="+350">🇬🇮 +350</option>
                    <option value="+30">🇬🇷 +30</option>
                    <option value="+299">🇬🇱 +299</option>
                    <option value="+1 473">🇬🇩 +1 473</option>
                    <option value="+590">🇬🇵 +590</option>
                    <option value="+1 671">🇬🇺 +1 671</option>
                    <option value="+502">🇬🇹 +502</option>
                    <option value="+44">🇬🇬 +44</option>
                    <option value="+224">🇬🇳 +224</option>
                    <option value="+245">🇬🇼 +245</option>
                    <option value="+592">🇬🇾 +592</option>
                    <option value="+509">🇭🇹 +509</option>
                    <option value="+39">🇻🇦 +39</option>
                    <option value="+504">🇭🇳 +504</option>
                    <option value="+852">🇭🇰 +852</option>
                    <option value="+36">🇭🇺 +36</option>
                    <option value="+354">🇮🇸 +354</option>
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+62">🇮🇩 +62</option>
                    <option value="+98">🇮🇷 +98</option>
                    <option value="+964">🇮🇶 +964</option>
                    <option value="+353">🇮🇪 +353</option>
                    <option value="+44">🇮🇲 +44</option>
                    <option value="+972">🇮🇱 +972</option>
                    <option value="+39">🇮🇹 +39</option>
                    <option value="+1 876">🇯🇲 +1 876</option>
                    <option value="+81">🇯🇵 +81</option>
                    <option value="+44">🇯🇪 +44</option>
                    <option value="+962">🇯🇴 +962</option>
                    <option value="+7">🇰🇿 +7</option>
                    <option value="+254">🇰🇪 +254</option>
                    <option value="+686">🇰🇮 +686</option>
                    <option value="+850">🇰🇵 +850</option>
                    <option value="+82">🇰🇷 +82</option>
                    <option value="+965">🇰🇼 +965</option>
                    <option value="+996">🇰🇬 +996</option>
                    <option value="+856">🇱🇦 +856</option>
                    <option value="+371">🇱🇻 +371</option>
                    <option value="+961">🇱🇧 +961</option>
                    <option value="+266">🇱🇸 +266</option>
                    <option value="+231">🇱🇷 +231</option>
                    <option value="+218">🇱🇾 +218</option>
                    <option value="+423">🇱🇮 +423</option>
                    <option value="+370">🇱🇹 +370</option>
                    <option value="+352">🇱🇺 +352</option>
                    <option value="+853">🇲🇴 +853</option>
                    <option value="+389">🇲🇰 +389</option>
                    <option value="+261">🇲🇬 +261</option>
                    <option value="+265">🇲🇼 +265</option>
                    <option value="+60">🇲🇾 +60</option>
                    <option value="+960">🇲🇻 +960</option>
                    <option value="+223">🇲🇱 +223</option>
                    <option value="+356">🇲🇹 +356</option>
                    <option value="+692">🇲🇭 +692</option>
                    <option value="+596">🇲🇶 +596</option>
                    <option value="+222">🇲🇷 +222</option>
                    <option value="+230">🇲🇺 +230</option>
                    <option value="+262">🇾🇹 +262</option>
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+691">🇫🇲 +691</option>
                    <option value="+373">🇲🇩 +373</option>
                    <option value="+377">🇲🇨 +377</option>
                    <option value="+976">🇲🇳 +976</option>
                    <option value="+382">🇲🇪 +382</option>
                    <option value="+1 664">🇲🇸 +1 664</option>
                    <option value="+212">🇲🇦 +212</option>
                    <option value="+258">🇲🇿 +258</option>
                    <option value="+95">🇲🇲 +95</option>
                    <option value="+264">🇳🇦 +264</option>
                    <option value="+674">🇳🇷 +674</option>
                    <option value="+977">🇳🇵 +977</option>
                    <option value="+31">🇳🇱 +31</option>
                    <option value="+599">🇧🇶 +599</option>
                    <option value="+687">🇳🇨 +687</option>
                    <option value="+64">🇳🇿 +64</option>
                    <option value="+505">🇳🇮 +505</option>
                    <option value="+227">🇳🇪 +227</option>
                    <option value="+234">🇳🇬 +234</option>
                    <option value="+683">🇳🇺 +683</option>
                    <option value="+672">🇳🇫 +672</option>
                    <option value="+1 670">🇲🇵 +1 670</option>
                    <option value="+47">🇳🇴 +47</option>
                    <option value="+968">🇴🇲 +968</option>
                    <option value="+92">🇵🇰 +92</option>
                    <option value="+680">🇵🇼 +680</option>
                    <option value="+970">🇵🇸 +970</option>
                    <option value="+507">🇵🇦 +507</option>
                    <option value="+675">🇵🇬 +675</option>
                    <option value="+595">🇵🇾 +595</option>
                    <option value="+51">🇵🇪 +51</option>
                    <option value="+63">🇵🇭 +63</option>
                    <option value="+64">🇵🇳 +64</option>
                    <option value="+48">🇵🇱 +48</option>
                    <option value="+351">🇵🇹 +351</option>
                    <option value="+1 787">🇵🇷 +1 787</option>
                    <option value="+974">🇶🇦 +974</option>
                    <option value="+262">🇷🇪 +262</option>
                    <option value="+40">🇷🇴 +40</option>
                    <option value="+7">🇷🇺 +7</option>
                    <option value="+250">🇷🇼 +250</option>
                    <option value="+590">🇧🇱 +590</option>
                    <option value="+290">🇸🇭 +290</option>
                    <option value="+1 869">🇰🇳 +1 869</option>
                    <option value="+1 758">🇱🇨 +1 758</option>
                    <option value="+590">🇲🇫 +590</option>
                    <option value="+508">🇵🇲 +508</option>
                    <option value="+1 784">🇻🇨 +1 784</option>
                    <option value="+685">🇼🇸 +685</option>
                    <option value="+378">🇸🇲 +378</option>
                    <option value="+239">🇸🇹 +239</option>
                    <option value="+966">🇸🇦 +966</option>
                    <option value="+221">🇸🇳 +221</option>
                    <option value="+381">🇷🇸 +381</option>
                    <option value="+248">🇸🇨 +248</option>
                    <option value="+232">🇸🇱 +232</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+1 721">🇸🇽 +1 721</option>
                    <option value="+421">🇸🇰 +421</option>
                    <option value="+386">🇸🇮 +386</option>
                    <option value="+677">🇸🇧 +677</option>
                    <option value="+252">🇸🇴 +252</option>
                    <option value="+27">🇿🇦 +27</option>
                    <option value="+500">🇬🇸 +500</option>
                    <option value="+211">🇸🇸 +211</option>
                    <option value="+34">🇪🇸 +34</option>
                    <option value="+94">🇱🇰 +94</option>
                    <option value="+249">🇸🇩 +249</option>
                    <option value="+597">🇸🇷 +597</option>
                    <option value="+47">🇸🇯 +47</option>
                    <option value="+268">🇸🇿 +268</option>
                    <option value="+46">🇸🇪 +46</option>
                    <option value="+41">🇨🇭 +41</option>
                    <option value="+963">🇸🇾 +963</option>
                    <option value="+886">🇹🇼 +886</option>
                    <option value="+992">🇹🇯 +992</option>
                    <option value="+255">🇹🇿 +255</option>
                    <option value="+66">🇹🇭 +66</option>
                    <option value="+670">🇹🇱 +670</option>
                    <option value="+228">🇹🇬 +228</option>
                    <option value="+690">🇹🇰 +690</option>
                    <option value="+676">🇹🇴 +676</option>
                    <option value="+1 868">🇹🇹 +1 868</option>
                    <option value="+216">🇹🇳 +216</option>
                    <option value="+90">🇹🇷 +90</option>
                    <option value="+993">🇹🇲 +993</option>
                    <option value="+1 649">🇹🇨 +1 649</option>
                    <option value="+688">🇹🇻 +688</option>
                    <option value="+256">🇺🇬 +256</option>
                    <option value="+380">🇺🇦 +380</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+598">🇺🇾 +598</option>
                    <option value="+998">🇺🇿 +998</option>
                    <option value="+678">🇻🇺 +678</option>
                    <option value="+58">🇻🇪 +58</option>
                    <option value="+84">🇻🇳 +84</option>
                    <option value="+1 284">🇻🇬 +1 284</option>
                    <option value="+1 340">🇻🇮 +1 340</option>
                    <option value="+681">🇼🇫 +681</option>
                    <option value="+212">🇪🇭 +212</option>
                    <option value="+967">🇾🇪 +967</option>
                    <option value="+260">🇿🇲 +260</option>
                    <option value="+263">🇿🇼 +263</option>
                  </select>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                    placeholder="123-456-7890"
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#005391] to-[#0066b3] rounded-full mb-4">
                <MapPin className="h-4 w-4 text-white" />
                <span className="text-white font-bold text-sm">LOCATION DETAILS</span>
              </div>
              <h2 className="text-2xl font-bold text-[#001a33]">Where is your academy located?</h2>
              <p className="text-gray-600 mt-2">Provide the complete address of your academy</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[#001a33] mb-2">Street Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                  placeholder="123 Football Street"
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-[#001a33] mb-2">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                    placeholder="City name"
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#001a33] mb-2">State/Province</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                    placeholder="State or Province"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-[#001a33] mb-2">Country *</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                    placeholder="Country name"
                  />
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#001a33] mb-2">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#005391] to-[#0066b3] rounded-full mb-4">
                <User className="h-4 w-4 text-white" />
                <span className="text-white font-bold text-sm">ACADEMY DETAILS</span>
              </div>
              <h2 className="text-2xl font-bold text-[#001a33]">Academy management & facilities</h2>
              <p className="text-gray-600 mt-2">Information about your director and academy capabilities</p>
            </div>

            <div className="space-y-8">
              {/* Director Information */}
              <div>
                <h3 className="text-lg font-bold text-[#001a33] mb-4 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-[#005391]" />
                  Director Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-[#001a33] mb-2">Director Name *</label>
                    <input
                      type="text"
                      value={formData.directorName}
                      onChange={(e) => handleInputChange('directorName', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                      placeholder="Full name"
                    />
                    {errors.directorName && <p className="text-red-500 text-sm mt-1">{errors.directorName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#001a33] mb-2">Director Email *</label>
                    <input
                      type="email"
                      value={formData.directorEmail}
                      onChange={(e) => handleInputChange('directorEmail', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                      placeholder="director@academy.com"
                    />
                    {errors.directorEmail && <p className="text-red-500 text-sm mt-1">{errors.directorEmail}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#001a33] mb-2">Director Phone</label>
                    <input
                      type="tel"
                      value={formData.directorPhone}
                      onChange={(e) => handleInputChange('directorPhone', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#001a33] mb-2">Player Capacity *</label>
                    <input
                      type="number"
                      value={formData.playerCapacity}
                      onChange={(e) => handleInputChange('playerCapacity', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                      placeholder="100"
                      min="1"
                    />
                    {errors.playerCapacity && <p className="text-red-500 text-sm mt-1">{errors.playerCapacity}</p>}
                  </div>
                </div>
              </div>

              {/* Age Groups */}
              <div>
                <h3 className="text-lg font-bold text-[#001a33] mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#005391]" />
                  Age Groups
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ageGroupOptions.map((ageGroup) => (
                    <label key={ageGroup} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.ageGroups.includes(ageGroup)}
                        onChange={() => handleArrayToggle('ageGroups', ageGroup)}
                        className="w-4 h-4 text-[#005391] border-2 border-gray-300 rounded focus:ring-[#005391]"
                      />
                      <span className="text-sm font-medium text-gray-700">{ageGroup}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Facilities */}
              <div>
                <h3 className="text-lg font-bold text-[#001a33] mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5 text-[#005391]" />
                  Available Facilities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {facilityOptions.map((facility) => (
                    <label key={facility} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.facilities.includes(facility)}
                        onChange={() => handleArrayToggle('facilities', facility)}
                        className="w-4 h-4 text-[#005391] border-2 border-gray-300 rounded focus:ring-[#005391]"
                      />
                      <span className="text-sm font-medium text-gray-700">{facility}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="mt-8 pt-8 border-t space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.termsAccepted}
                    onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                    className="w-5 h-5 text-[#005391] border-2 border-gray-300 rounded focus:ring-[#005391] mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                    I agree to the <span className="text-[#005391] hover:underline font-semibold">Terms and Conditions</span> and <span className="text-[#005391] hover:underline font-semibold">Privacy Policy</span>
                  </label>
                </div>
                {errors.termsAccepted && <p className="text-red-500 text-sm">{errors.termsAccepted}</p>}

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="fifa"
                    checked={formData.fifaCompliance}
                    onChange={(e) => handleInputChange('fifaCompliance', e.target.checked)}
                    className="w-5 h-5 text-[#005391] border-2 border-gray-300 rounded focus:ring-[#005391] mt-1"
                  />
                  <label htmlFor="fifa" className="text-sm text-gray-700 cursor-pointer">
                    I agree to comply with FIFA regulations and standards for academy operations
                  </label>
                </div>
                {errors.fifaCompliance && <p className="text-red-500 text-sm">{errors.fifaCompliance}</p>}

                <div className="bg-blue-50 border border-[#005391] rounded-lg p-4 flex items-start gap-3">
                  <Shield className="h-5 w-5 text-[#005391] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#005391]">
                    Your academy will be reviewed for FIFA compliance within 5-7 business days after registration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
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

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#001a33]">Step {currentStep} of 3</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 3) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[#005391] to-[#0066b3] h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 md:p-12">
              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-12 pt-8 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="px-8 py-3 border-2 border-gray-300 hover:border-[#005391] hover:text-[#005391]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <Button
                  onClick={currentStep < 3 ? handleNext : handleSubmit}
                  disabled={isSubmitting}
                  className={`px-8 py-3 ${currentStep === 3
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    : 'bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#0066b3] hover:to-[#005391]'
                    } text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Registering...
                    </>
                  ) : currentStep === 3 ? (
                    <>
                      Complete Registration
                      <Award className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next Step
                      <Target className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#001a33] text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span className="font-bold">FIFA Approved Platform</span>
          </div>
          <p className="text-blue-200 text-sm">
            © 2024 Global Football Academy Registration Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}