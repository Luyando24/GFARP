import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { 
  Building, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Calendar,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface RegistrationFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  contactPerson: string;
  phone: string;
  phoneCountryCode: string;
  address: string;
  city: string;
  country: string;
  foundedYear: string;
  description: string;
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  subscribeToNewsletter: boolean;
}

interface FormErrors {
  [key: string]: string;
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  message: string;
}

export default function AcademyRegistrationForm() {
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactPerson: '',
    phone: '',
    phoneCountryCode: '+1',
    address: '',
    city: '',
    country: '',
    foundedYear: '',
    description: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
    subscribeToNewsletter: false
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<ValidationResult>({
    isValid: false,
    score: 0,
    message: ''
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  const totalSteps = 4;

  // Password validation
  const validatePassword = (password: string): ValidationResult => {
    let score = 0;
    let message = '';

    if (password.length < 8) {
      return { isValid: false, score: 0, message: 'Password must be at least 8 characters long' };
    }

    if (password.length >= 8) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/\d/.test(password)) score += 20;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;

    if (score < 60) {
      message = 'Weak password';
    } else if (score < 80) {
      message = 'Good password';
    } else {
      message = 'Strong password';
    }

    return {
      isValid: score >= 60,
      score,
      message
    };
  };

  // Form validation for each step
  const validateStep = (step: number): FormErrors => {
    const errors: FormErrors = {};

    switch (step) {
      case 1: // Basic Information
        if (!formData.name.trim()) errors.name = 'Academy name is required';
        if (!formData.email.trim()) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = 'Invalid email format';
        }
        if (!formData.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
        if (!formData.phone.trim()) errors.phone = 'Phone number is required';
        break;

      case 2: // Location & Details
        if (!formData.address.trim()) errors.address = 'Address is required';
        if (!formData.city.trim()) errors.city = 'City is required';
        if (!formData.country.trim()) errors.country = 'Country is required';
        
        if (formData.foundedYear) {
          const year = parseInt(formData.foundedYear);
          const currentYear = new Date().getFullYear();
          if (isNaN(year) || year < 1800 || year > currentYear) {
            errors.foundedYear = `Founded year must be between 1800 and ${currentYear}`;
          }
        }
        break;

      case 3: // Security
        if (!formData.password) {
          errors.password = 'Password is required';
        } else {
          const validation = validatePassword(formData.password);
          if (!validation.isValid) {
            errors.password = validation.message;
          }
        }

        if (!formData.confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
        break;

      case 4: // Terms & Conditions
        if (!formData.agreeToTerms) {
          errors.agreeToTerms = 'You must agree to the terms and conditions';
        }
        if (!formData.agreeToPrivacy) {
          errors.agreeToPrivacy = 'You must agree to the privacy policy';
        }
        break;
    }

    return errors;
  };

  // Handle input changes
  const handleInputChange = (field: keyof RegistrationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Real-time password validation
    if (field === 'password' && typeof value === 'string') {
      setPasswordValidation(validatePassword(value));
    }
  };

  // Navigate between steps
  const nextStep = () => {
    const errors = validateStep(currentStep);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before proceeding',
        variant: 'destructive'
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Submit form
  const handleSubmit = async () => {
    const errors = validateStep(currentStep);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before submitting',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        contactPerson: formData.contactPerson,
        phone: `${formData.phoneCountryCode}${formData.phone}`,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
        description: formData.description || undefined
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
        toast({
          title: 'Registration Successful!',
          description: 'Your academy has been registered successfully. Please check your email for verification instructions.',
        });

        // Redirect to login or dashboard
        navigate('/auth/login?registered=true');
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get progress percentage
  const getProgress = () => {
    return (currentStep / totalSteps) * 100;
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Building className="w-12 h-12 mx-auto text-blue-600 mb-2" />
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <p className="text-muted-foreground">Tell us about your academy</p>
            </div>

            <div>
              <Label htmlFor="name">Academy Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your academy name"
                className={formErrors.name ? 'border-red-500' : ''}
              />
              {formErrors.name && (
                <p className="text-sm text-red-500 mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="academy@example.com"
                className={formErrors.email ? 'border-red-500' : ''}
              />
              {formErrors.email && (
                <p className="text-sm text-red-500 mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="contactPerson">Contact Person *</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                placeholder="Director or manager name"
                className={formErrors.contactPerson ? 'border-red-500' : ''}
              />
              {formErrors.contactPerson && (
                <p className="text-sm text-red-500 mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.contactPerson}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="flex gap-2">
                <Select 
                  value={formData.phoneCountryCode} 
                  onValueChange={(value) => handleInputChange('phoneCountryCode', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+7 840">🇦🇧 +7 840</SelectItem>
                    <SelectItem value="+93">🇦🇫 +93</SelectItem>
                    <SelectItem value="+355">🇦🇱 +355</SelectItem>
                    <SelectItem value="+213">🇩🇿 +213</SelectItem>
                    <SelectItem value="+1 684">🇦🇸 +1 684</SelectItem>
                    <SelectItem value="+376">🇦🇩 +376</SelectItem>
                    <SelectItem value="+244">🇦🇴 +244</SelectItem>
                    <SelectItem value="+1 264">🇦🇮 +1 264</SelectItem>
                    <SelectItem value="+672">🇦🇶 +672</SelectItem>
                    <SelectItem value="+1 268">🇦🇬 +1 268</SelectItem>
                    <SelectItem value="+54">🇦🇷 +54</SelectItem>
                    <SelectItem value="+374">🇦🇲 +374</SelectItem>
                    <SelectItem value="+297">🇦🇼 +297</SelectItem>
                    <SelectItem value="+61">🇦🇺 +61</SelectItem>
                    <SelectItem value="+43">🇦🇹 +43</SelectItem>
                    <SelectItem value="+994">🇦🇿 +994</SelectItem>
                    <SelectItem value="+1 242">🇧🇸 +1 242</SelectItem>
                    <SelectItem value="+973">🇧🇭 +973</SelectItem>
                    <SelectItem value="+880">🇧🇩 +880</SelectItem>
                    <SelectItem value="+1 246">🇧🇧 +1 246</SelectItem>
                    <SelectItem value="+375">🇧🇾 +375</SelectItem>
                    <SelectItem value="+32">🇧🇪 +32</SelectItem>
                    <SelectItem value="+501">🇧🇿 +501</SelectItem>
                    <SelectItem value="+229">🇧🇯 +229</SelectItem>
                    <SelectItem value="+1 441">🇧🇲 +1 441</SelectItem>
                    <SelectItem value="+975">🇧🇹 +975</SelectItem>
                    <SelectItem value="+591">🇧🇴 +591</SelectItem>
                    <SelectItem value="+387">🇧🇦 +387</SelectItem>
                    <SelectItem value="+267">🇧🇼 +267</SelectItem>
                    <SelectItem value="+55">🇧🇷 +55</SelectItem>
                    <SelectItem value="+246">🇮🇴 +246</SelectItem>
                    <SelectItem value="+673">🇧🇳 +673</SelectItem>
                    <SelectItem value="+359">🇧🇬 +359</SelectItem>
                    <SelectItem value="+226">🇧🇫 +226</SelectItem>
                    <SelectItem value="+257">🇧🇮 +257</SelectItem>
                    <SelectItem value="+855">🇰🇭 +855</SelectItem>
                    <SelectItem value="+237">🇨🇲 +237</SelectItem>
                    <SelectItem value="+1">🇨🇦 +1</SelectItem>
                    <SelectItem value="+238">🇨🇻 +238</SelectItem>
                    <SelectItem value="+1 345">🇰🇾 +1 345</SelectItem>
                    <SelectItem value="+236">🇨🇫 +236</SelectItem>
                    <SelectItem value="+235">🇹🇩 +235</SelectItem>
                    <SelectItem value="+56">🇨🇱 +56</SelectItem>
                    <SelectItem value="+86">🇨🇳 +86</SelectItem>
                    <SelectItem value="+61">🇨🇽 +61</SelectItem>
                    <SelectItem value="+61">🇨🇨 +61</SelectItem>
                    <SelectItem value="+57">🇨🇴 +57</SelectItem>
                    <SelectItem value="+269">🇰🇲 +269</SelectItem>
                    <SelectItem value="+242">🇨🇬 +242</SelectItem>
                    <SelectItem value="+243">🇨🇩 +243</SelectItem>
                    <SelectItem value="+682">🇨🇰 +682</SelectItem>
                    <SelectItem value="+506">🇨🇷 +506</SelectItem>
                    <SelectItem value="+225">🇨🇮 +225</SelectItem>
                    <SelectItem value="+385">🇭🇷 +385</SelectItem>
                    <SelectItem value="+53">🇨🇺 +53</SelectItem>
                    <SelectItem value="+357">🇨🇾 +357</SelectItem>
                    <SelectItem value="+420">🇨🇿 +420</SelectItem>
                    <SelectItem value="+45">🇩🇰 +45</SelectItem>
                    <SelectItem value="+253">🇩🇯 +253</SelectItem>
                    <SelectItem value="+1 767">🇩🇲 +1 767</SelectItem>
                    <SelectItem value="+1 809">🇩🇴 +1 809</SelectItem>
                    <SelectItem value="+593">🇪🇨 +593</SelectItem>
                    <SelectItem value="+20">🇪🇬 +20</SelectItem>
                    <SelectItem value="+503">🇸🇻 +503</SelectItem>
                    <SelectItem value="+240">🇬🇶 +240</SelectItem>
                    <SelectItem value="+291">🇪🇷 +291</SelectItem>
                    <SelectItem value="+372">🇪🇪 +372</SelectItem>
                    <SelectItem value="+251">🇪🇹 +251</SelectItem>
                    <SelectItem value="+500">🇫🇰 +500</SelectItem>
                    <SelectItem value="+298">🇫🇴 +298</SelectItem>
                    <SelectItem value="+679">🇫🇯 +679</SelectItem>
                    <SelectItem value="+358">🇫🇮 +358</SelectItem>
                    <SelectItem value="+33">🇫🇷 +33</SelectItem>
                    <SelectItem value="+594">🇬🇫 +594</SelectItem>
                    <SelectItem value="+689">🇵🇫 +689</SelectItem>
                    <SelectItem value="+241">🇬🇦 +241</SelectItem>
                    <SelectItem value="+220">🇬🇲 +220</SelectItem>
                    <SelectItem value="+995">🇬🇪 +995</SelectItem>
                    <SelectItem value="+49">🇩🇪 +49</SelectItem>
                    <SelectItem value="+233">🇬🇭 +233</SelectItem>
                    <SelectItem value="+350">🇬🇮 +350</SelectItem>
                    <SelectItem value="+30">🇬🇷 +30</SelectItem>
                    <SelectItem value="+299">🇬🇱 +299</SelectItem>
                    <SelectItem value="+1 473">🇬🇩 +1 473</SelectItem>
                    <SelectItem value="+590">🇬🇵 +590</SelectItem>
                    <SelectItem value="+1 671">🇬🇺 +1 671</SelectItem>
                    <SelectItem value="+502">🇬🇹 +502</SelectItem>
                    <SelectItem value="+44">🇬🇬 +44</SelectItem>
                    <SelectItem value="+224">🇬🇳 +224</SelectItem>
                    <SelectItem value="+245">🇬🇼 +245</SelectItem>
                    <SelectItem value="+592">🇬🇾 +592</SelectItem>
                    <SelectItem value="+509">🇭🇹 +509</SelectItem>
                    <SelectItem value="+39">🇻🇦 +39</SelectItem>
                    <SelectItem value="+504">🇭🇳 +504</SelectItem>
                    <SelectItem value="+852">🇭🇰 +852</SelectItem>
                    <SelectItem value="+36">🇭🇺 +36</SelectItem>
                    <SelectItem value="+354">🇮🇸 +354</SelectItem>
                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                    <SelectItem value="+62">🇮🇩 +62</SelectItem>
                    <SelectItem value="+98">🇮🇷 +98</SelectItem>
                    <SelectItem value="+964">🇮🇶 +964</SelectItem>
                    <SelectItem value="+353">🇮🇪 +353</SelectItem>
                    <SelectItem value="+44">🇮🇲 +44</SelectItem>
                    <SelectItem value="+972">🇮🇱 +972</SelectItem>
                    <SelectItem value="+39">🇮🇹 +39</SelectItem>
                    <SelectItem value="+1 876">🇯🇲 +1 876</SelectItem>
                    <SelectItem value="+81">🇯🇵 +81</SelectItem>
                    <SelectItem value="+44">🇯🇪 +44</SelectItem>
                    <SelectItem value="+962">🇯🇴 +962</SelectItem>
                    <SelectItem value="+7">🇰🇿 +7</SelectItem>
                    <SelectItem value="+254">🇰🇪 +254</SelectItem>
                    <SelectItem value="+686">🇰🇮 +686</SelectItem>
                    <SelectItem value="+850">🇰🇵 +850</SelectItem>
                    <SelectItem value="+82">🇰🇷 +82</SelectItem>
                    <SelectItem value="+965">🇰🇼 +965</SelectItem>
                    <SelectItem value="+996">🇰🇬 +996</SelectItem>
                    <SelectItem value="+856">🇱🇦 +856</SelectItem>
                    <SelectItem value="+371">🇱🇻 +371</SelectItem>
                    <SelectItem value="+961">🇱🇧 +961</SelectItem>
                    <SelectItem value="+266">🇱🇸 +266</SelectItem>
                    <SelectItem value="+231">🇱🇷 +231</SelectItem>
                    <SelectItem value="+218">🇱🇾 +218</SelectItem>
                    <SelectItem value="+423">🇱🇮 +423</SelectItem>
                    <SelectItem value="+370">🇱🇹 +370</SelectItem>
                    <SelectItem value="+352">🇱🇺 +352</SelectItem>
                    <SelectItem value="+853">🇲🇴 +853</SelectItem>
                    <SelectItem value="+389">🇲🇰 +389</SelectItem>
                    <SelectItem value="+261">🇲🇬 +261</SelectItem>
                    <SelectItem value="+265">🇲🇼 +265</SelectItem>
                    <SelectItem value="+60">🇲🇾 +60</SelectItem>
                    <SelectItem value="+960">🇲🇻 +960</SelectItem>
                    <SelectItem value="+223">🇲🇱 +223</SelectItem>
                    <SelectItem value="+356">🇲🇹 +356</SelectItem>
                    <SelectItem value="+692">🇲🇭 +692</SelectItem>
                    <SelectItem value="+596">🇲🇶 +596</SelectItem>
                    <SelectItem value="+222">🇲🇷 +222</SelectItem>
                    <SelectItem value="+230">🇲🇺 +230</SelectItem>
                    <SelectItem value="+262">🇾🇹 +262</SelectItem>
                    <SelectItem value="+52">🇲🇽 +52</SelectItem>
                    <SelectItem value="+691">🇫🇲 +691</SelectItem>
                    <SelectItem value="+373">🇲🇩 +373</SelectItem>
                    <SelectItem value="+377">🇲🇨 +377</SelectItem>
                    <SelectItem value="+976">🇲🇳 +976</SelectItem>
                    <SelectItem value="+382">🇲🇪 +382</SelectItem>
                    <SelectItem value="+1 664">🇲🇸 +1 664</SelectItem>
                    <SelectItem value="+212">🇲🇦 +212</SelectItem>
                    <SelectItem value="+258">🇲🇿 +258</SelectItem>
                    <SelectItem value="+95">🇲🇲 +95</SelectItem>
                    <SelectItem value="+264">🇳🇦 +264</SelectItem>
                    <SelectItem value="+674">🇳🇷 +674</SelectItem>
                    <SelectItem value="+977">🇳🇵 +977</SelectItem>
                    <SelectItem value="+31">🇳🇱 +31</SelectItem>
                    <SelectItem value="+599">🇧🇶 +599</SelectItem>
                    <SelectItem value="+687">🇳🇨 +687</SelectItem>
                    <SelectItem value="+64">🇳🇿 +64</SelectItem>
                    <SelectItem value="+505">🇳🇮 +505</SelectItem>
                    <SelectItem value="+227">🇳🇪 +227</SelectItem>
                    <SelectItem value="+234">🇳🇬 +234</SelectItem>
                    <SelectItem value="+683">🇳🇺 +683</SelectItem>
                    <SelectItem value="+672">🇳🇫 +672</SelectItem>
                    <SelectItem value="+1 670">🇲🇵 +1 670</SelectItem>
                    <SelectItem value="+47">🇳🇴 +47</SelectItem>
                    <SelectItem value="+968">🇴🇲 +968</SelectItem>
                    <SelectItem value="+92">🇵🇰 +92</SelectItem>
                    <SelectItem value="+680">🇵🇼 +680</SelectItem>
                    <SelectItem value="+970">🇵🇸 +970</SelectItem>
                    <SelectItem value="+507">🇵🇦 +507</SelectItem>
                    <SelectItem value="+675">🇵🇬 +675</SelectItem>
                    <SelectItem value="+595">🇵🇾 +595</SelectItem>
                    <SelectItem value="+51">🇵🇪 +51</SelectItem>
                    <SelectItem value="+63">🇵🇭 +63</SelectItem>
                    <SelectItem value="+64">🇵🇳 +64</SelectItem>
                    <SelectItem value="+48">🇵🇱 +48</SelectItem>
                    <SelectItem value="+351">🇵🇹 +351</SelectItem>
                    <SelectItem value="+1 787">🇵🇷 +1 787</SelectItem>
                    <SelectItem value="+974">🇶🇦 +974</SelectItem>
                    <SelectItem value="+262">🇷🇪 +262</SelectItem>
                    <SelectItem value="+40">🇷🇴 +40</SelectItem>
                    <SelectItem value="+7">🇷🇺 +7</SelectItem>
                    <SelectItem value="+250">🇷🇼 +250</SelectItem>
                    <SelectItem value="+590">🇧🇱 +590</SelectItem>
                    <SelectItem value="+290">🇸🇭 +290</SelectItem>
                    <SelectItem value="+1 869">🇰🇳 +1 869</SelectItem>
                    <SelectItem value="+1 758">🇱🇨 +1 758</SelectItem>
                    <SelectItem value="+590">🇲🇫 +590</SelectItem>
                    <SelectItem value="+508">🇵🇲 +508</SelectItem>
                    <SelectItem value="+1 784">🇻🇨 +1 784</SelectItem>
                    <SelectItem value="+685">🇼🇸 +685</SelectItem>
                    <SelectItem value="+378">🇸🇲 +378</SelectItem>
                    <SelectItem value="+239">🇸🇹 +239</SelectItem>
                    <SelectItem value="+966">🇸🇦 +966</SelectItem>
                    <SelectItem value="+221">🇸🇳 +221</SelectItem>
                    <SelectItem value="+381">🇷🇸 +381</SelectItem>
                    <SelectItem value="+248">🇸🇨 +248</SelectItem>
                    <SelectItem value="+232">🇸🇱 +232</SelectItem>
                    <SelectItem value="+65">🇸🇬 +65</SelectItem>
                    <SelectItem value="+1 721">🇸🇽 +1 721</SelectItem>
                    <SelectItem value="+421">🇸🇰 +421</SelectItem>
                    <SelectItem value="+386">🇸🇮 +386</SelectItem>
                    <SelectItem value="+677">🇸🇧 +677</SelectItem>
                    <SelectItem value="+252">🇸🇴 +252</SelectItem>
                    <SelectItem value="+27">🇿🇦 +27</SelectItem>
                    <SelectItem value="+500">🇬🇸 +500</SelectItem>
                    <SelectItem value="+211">🇸🇸 +211</SelectItem>
                    <SelectItem value="+34">🇪🇸 +34</SelectItem>
                    <SelectItem value="+94">🇱🇰 +94</SelectItem>
                    <SelectItem value="+249">🇸🇩 +249</SelectItem>
                    <SelectItem value="+597">🇸🇷 +597</SelectItem>
                    <SelectItem value="+47">🇸🇯 +47</SelectItem>
                    <SelectItem value="+268">🇸🇿 +268</SelectItem>
                    <SelectItem value="+46">🇸🇪 +46</SelectItem>
                    <SelectItem value="+41">🇨🇭 +41</SelectItem>
                    <SelectItem value="+963">🇸🇾 +963</SelectItem>
                    <SelectItem value="+886">🇹🇼 +886</SelectItem>
                    <SelectItem value="+992">🇹🇯 +992</SelectItem>
                    <SelectItem value="+255">🇹🇿 +255</SelectItem>
                    <SelectItem value="+66">🇹🇭 +66</SelectItem>
                    <SelectItem value="+670">🇹🇱 +670</SelectItem>
                    <SelectItem value="+228">🇹🇬 +228</SelectItem>
                    <SelectItem value="+690">🇹🇰 +690</SelectItem>
                    <SelectItem value="+676">🇹🇴 +676</SelectItem>
                    <SelectItem value="+1 868">🇹🇹 +1 868</SelectItem>
                    <SelectItem value="+216">🇹🇳 +216</SelectItem>
                    <SelectItem value="+90">🇹🇷 +90</SelectItem>
                    <SelectItem value="+993">🇹🇲 +993</SelectItem>
                    <SelectItem value="+1 649">🇹🇨 +1 649</SelectItem>
                    <SelectItem value="+688">🇹🇻 +688</SelectItem>
                    <SelectItem value="+256">🇺🇬 +256</SelectItem>
                    <SelectItem value="+380">🇺🇦 +380</SelectItem>
                    <SelectItem value="+971">🇦🇪 +971</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                    <SelectItem value="+598">🇺🇾 +598</SelectItem>
                    <SelectItem value="+998">🇺🇿 +998</SelectItem>
                    <SelectItem value="+678">🇻🇺 +678</SelectItem>
                    <SelectItem value="+58">🇻🇪 +58</SelectItem>
                    <SelectItem value="+84">🇻🇳 +84</SelectItem>
                    <SelectItem value="+1 284">🇻🇬 +1 284</SelectItem>
                    <SelectItem value="+1 340">🇻🇮 +1 340</SelectItem>
                    <SelectItem value="+681">🇼🇫 +681</SelectItem>
                    <SelectItem value="+212">🇪🇭 +212</SelectItem>
                    <SelectItem value="+967">🇾🇪 +967</SelectItem>
                    <SelectItem value="+260">🇿🇲 +260</SelectItem>
                    <SelectItem value="+263">🇿🇼 +263</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="XXX XXX XXX"
                  className={`flex-1 ${formErrors.phone ? 'border-red-500' : ''}`}
                />
              </div>
              {formErrors.phone && (
                <p className="text-sm text-red-500 mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.phone}
                </p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <MapPin className="w-12 h-12 mx-auto text-blue-600 mb-2" />
              <h3 className="text-lg font-semibold">Location & Details</h3>
              <p className="text-muted-foreground">Where is your academy located?</p>
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Complete academy address"
                rows={3}
                className={formErrors.address ? 'border-red-500' : ''}
              />
              {formErrors.address && (
                <p className="text-sm text-red-500 mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.address}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City name"
                  className={formErrors.city ? 'border-red-500' : ''}
                />
                {formErrors.city && (
                  <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.city}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(value) => handleInputChange('country', value)}
                >
                  <SelectTrigger className={formErrors.country ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zambia">Zambia</SelectItem>
                    <SelectItem value="South Africa">South Africa</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                    <SelectItem value="Ghana">Ghana</SelectItem>
                    <SelectItem value="Tanzania">Tanzania</SelectItem>
                    <SelectItem value="Uganda">Uganda</SelectItem>
                    <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.country && (
                  <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.country}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <Label htmlFor="foundedYear">Founded Year</Label>
                <Input
                  id="foundedYear"
                  type="number"
                  value={formData.foundedYear}
                  onChange={(e) => handleInputChange('foundedYear', e.target.value)}
                  placeholder="YYYY"
                  min="1800"
                  max={new Date().getFullYear()}
                  className={formErrors.foundedYear ? 'border-red-500' : ''}
                />
                {formErrors.foundedYear && (
                  <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.foundedYear}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Academy Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of your academy, its mission, and programs"
                rows={4}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 mx-auto text-blue-600 mb-2" />
              <h3 className="text-lg font-semibold">Security Setup</h3>
              <p className="text-muted-foreground">Create a secure password for your account</p>
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Create a strong password"
                  className={formErrors.password ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Password strength:</span>
                    <span className={`font-medium ${
                      passwordValidation.score < 60 ? 'text-red-500' :
                      passwordValidation.score < 80 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {passwordValidation.message}
                    </span>
                  </div>
                  <Progress 
                    value={passwordValidation.score} 
                    className="mt-1"
                  />
                </div>
              )}

              {formErrors.password && (
                <p className="text-sm text-red-500 mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.password}
                </p>
              )}

              <div className="text-xs text-muted-foreground mt-2">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>At least 8 characters</li>
                  <li>Uppercase and lowercase letters</li>
                  <li>At least one number</li>
                  <li>At least one special character</li>
                </ul>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  className={formErrors.confirmPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <FileText className="w-12 h-12 mx-auto text-blue-600 mb-2" />
              <h3 className="text-lg font-semibold">Terms & Conditions</h3>
              <p className="text-muted-foreground">Please review and accept our terms</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked as boolean)}
                  className={formErrors.agreeToTerms ? 'border-red-500' : ''}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="agreeToTerms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the Terms and Conditions *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you agree to our{' '}
                    <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
                      Terms of Service
                    </a>
                  </p>
                </div>
              </div>
              {formErrors.agreeToTerms && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.agreeToTerms}
                </p>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToPrivacy"
                  checked={formData.agreeToPrivacy}
                  onCheckedChange={(checked) => handleInputChange('agreeToPrivacy', checked as boolean)}
                  className={formErrors.agreeToPrivacy ? 'border-red-500' : ''}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="agreeToPrivacy"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the Privacy Policy *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you agree to our{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                      Privacy Policy
                    </a>
                  </p>
                </div>
              </div>
              {formErrors.agreeToPrivacy && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.agreeToPrivacy}
                </p>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="subscribeToNewsletter"
                  checked={formData.subscribeToNewsletter}
                  onCheckedChange={(checked) => handleInputChange('subscribeToNewsletter', checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="subscribeToNewsletter"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Subscribe to newsletter (optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive updates about new features and academy management tips
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Registration Summary</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Academy:</strong> {formData.name}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Contact:</strong> {formData.contactPerson}</p>
                <p><strong>Location:</strong> {formData.city}, {formData.country}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Academy Registration</CardTitle>
            <CardDescription>
              Join our platform and start managing your football academy
            </CardDescription>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(getProgress())}% Complete</span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Register Academy
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center space-x-2 pt-4">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i + 1 <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
            <a href="/auth/login" className="text-blue-600 hover:underline">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}