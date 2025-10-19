import React, { useState } from 'react';
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
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FormData {
  // Academy Information
  academyName: string;
  establishedYear: string;
  registrationNumber: string;
  
  // Contact Information
  email: string;
  phone: string;
  website: string;
  
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
  registrationNumber: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  directorName: '',
  directorEmail: '',
  directorPhone: '',
  playerCapacity: '',
  ageGroups: [],
  facilities: [],
  selectedPlan: 'basic',
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

const subscriptionPlans = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: '$99',
    period: '/month',
    features: [
      'Up to 50 players',
      'Basic player management',
      'Transfer documentation',
      'Email support'
    ],
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'pro',
    name: 'Professional Plan',
    price: '$199',
    period: '/month',
    features: [
      'Up to 200 players',
      'Advanced analytics',
      'FIFA compliance tools',
      'Priority support',
      'Training compensation'
    ],
    color: 'from-green-500 to-green-600',
    popular: true
  },
  {
    id: 'elite',
    name: 'Elite Plan',
    price: '$399',
    period: '/month',
    features: [
      'Unlimited players',
      'Full FIFA integration',
      'Custom branding',
      '24/7 dedicated support',
      'Advanced reporting'
    ],
    color: 'from-purple-500 to-purple-600'
  }
];

export default function RegisterAcademy() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Set initial plan from URL params
  React.useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan && ['basic', 'pro', 'elite'].includes(plan)) {
      setFormData(prev => ({ ...prev, selectedPlan: plan }));
    }
  }, [searchParams]);

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
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
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
        break;
      case 4:
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions';
        if (!formData.fifaCompliance) newErrors.fifaCompliance = 'FIFA compliance agreement is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to success page or dashboard
      navigate('/academy-dashboard', { 
        state: { 
          message: 'Academy registration successful! Welcome to GFARP.',
          academyName: formData.academyName 
        }
      });
    } catch (error) {
      console.error('Registration failed:', error);
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
                <label className="block text-sm font-bold text-[#001a33] mb-2">Registration Number</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                  placeholder="Official registration number"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#001a33] mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                  placeholder="https://www.youracademy.com"
                />
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
                <label className="block text-sm font-bold text-[#001a33] mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none transition-colors"
                  placeholder="+1 (555) 123-4567"
                />
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
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#005391] to-[#0066b3] rounded-full mb-4">
                <Trophy className="h-4 w-4 text-white" />
                <span className="text-white font-bold text-sm">SUBSCRIPTION & TERMS</span>
              </div>
              <h2 className="text-2xl font-bold text-[#001a33]">Choose your plan & finalize</h2>
              <p className="text-gray-600 mt-2">Select a subscription plan and agree to terms</p>
            </div>

            {/* Subscription Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {subscriptionPlans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    formData.selectedPlan === plan.id 
                      ? 'ring-4 ring-[#005391] shadow-xl' 
                      : 'hover:shadow-lg'
                  } ${plan.popular ? 'border-2 border-[#005391]' : ''}`}
                  onClick={() => handleInputChange('selectedPlan', plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-[#005391] to-[#0066b3] text-white px-4 py-1">
                        MOST POPULAR
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl font-bold text-[#001a33]">{plan.name}</CardTitle>
                    <div className="text-3xl font-black text-[#005391]">
                      {plan.price}<span className="text-sm text-gray-500">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.termsAccepted}
                  onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                  className="w-5 h-5 text-[#005391] border-2 border-gray-300 rounded focus:ring-[#005391] mt-1"
                />
                <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                  I agree to the <Link to="/terms" className="text-[#005391] hover:underline font-semibold">Terms and Conditions</Link> and <Link to="/privacy" className="text-[#005391] hover:underline font-semibold">Privacy Policy</Link>
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
            </div>

            <Alert className="border-[#005391] bg-blue-50">
              <Shield className="h-4 w-4 text-[#005391]" />
              <AlertDescription className="text-[#005391]">
                Your academy will be reviewed for FIFA compliance within 5-7 business days after registration.
              </AlertDescription>
            </Alert>
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
            <span className="text-sm font-semibold text-[#001a33]">Step {currentStep} of 4</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#005391] to-[#0066b3] h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 4) * 100}%` }}
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

                {currentStep < 4 ? (
                  <Button
                    onClick={handleNext}
                    className="px-8 py-3 bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#0066b3] hover:to-[#005391] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Next Step
                    <Target className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Registering...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <Award className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
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