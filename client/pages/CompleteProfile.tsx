import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, ArrowLeft, CheckCircle2, Building2, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '../hooks/use-toast';

interface ProfileData {
    name: string;
    foundedYear: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    directorName: string;
    directorEmail: string;
    directorPhone: string;
}

const currentYear = new Date().getFullYear();

export default function CompleteProfile() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<ProfileData>({
        name: '',
        foundedYear: '',
        phone: '',
        address: '',
        city: '',
        country: 'United States',
        directorName: '',
        directorEmail: '',
        directorPhone: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    // Get academy data from localStorage
    const academyData = JSON.parse(localStorage.getItem('academy_data') || '{}');

    useEffect(() => {
        // Pre-fill data from academy data if available
        // But ONLY if the user is not brand new (i.e. has some existing data)
        // However, for a brand new registration flow, we usually want empty fields
        // except maybe email and name which we already know.
        
        if (academyData) {
            setFormData(prev => ({
                ...prev,
                // Pre-fill name if available, but don't overwrite if user already typed
                name: prev.name || academyData.name || '', 
                // Pre-fill email from academy data (this is usually correct/desired)
                directorEmail: prev.directorEmail || academyData.email || '',
                // Only pre-fill these if they actually exist in the data source and aren't just placeholders
                // In a "new account" flow, these should be empty from the backend anyway due to my previous fix.
                // But just in case local storage has stale data:
                phone: academyData.phone || '',
                address: academyData.address || '',
                city: academyData.city || '',
                country: academyData.country || 'United States', // Keep default
                directorName: academyData.directorName || '',
                directorPhone: academyData.directorPhone || '',
                foundedYear: academyData.foundedYear ? String(academyData.foundedYear) : ''
            }));
        }
    }, []);

    const totalSteps = 3;
    const progress = (step / totalSteps) * 100;

    const handleInputChange = (field: keyof ProfileData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateStep = (currentStep: number): boolean => {
        const newErrors: Record<string, string> = {};

        if (currentStep === 1) {
            if (!formData.name.trim()) newErrors.name = 'Academy name is required';
            if (formData.foundedYear && (parseInt(formData.foundedYear) < 1800 || parseInt(formData.foundedYear) > currentYear)) {
                newErrors.foundedYear = `Year must be between 1800 and ${currentYear}`;
            }
        } else if (currentStep === 2) {
            if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
            if (!formData.address.trim()) newErrors.address = 'Address is required';
        } else if (currentStep === 3) {
            if (!formData.directorName.trim()) newErrors.directorName = 'Director name is required';
            if (!formData.directorEmail.trim()) newErrors.directorEmail = 'Email is required';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.directorEmail)) {
                newErrors.directorEmail = 'Enter a valid email address';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => Math.min(prev + 1, totalSteps));
        }
    };

    const handleBack = () => {
        setStep(prev => Math.max(prev - 1, 1));
    };

    const handleSkip = () => {
        toast({
            title: 'Profile Incomplete',
            description: 'You can complete your profile anytime from the dashboard settings.',
        });
        navigate('/academy-dashboard');
    };

    const handleSubmit = async () => {
        if (!validateStep(step)) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/academies/${academyData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    phone: formData.phone,
                    address: formData.address,
                    directorName: formData.directorName,
                    directorEmail: formData.directorEmail,
                    directorPhone: formData.directorPhone || formData.phone,
                    foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined
                })
            });

            const data = await response.json();

            if (data.success || response.ok) {
                // Update local storage
                const updatedAcademyData = {
                    ...academyData,
                    name: formData.name,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    country: formData.country,
                    directorName: formData.directorName,
                    profileComplete: true
                };
                localStorage.setItem('academy_data', JSON.stringify(updatedAcademyData));
                localStorage.removeItem('isNewRegistration'); // Clear new registration flag

                toast({
                    title: 'Profile Completed! 🎉',
                    description: 'Welcome to your academy dashboard.',
                });
                navigate('/academy-dashboard');
            } else {
                throw new Error(data.message || 'Failed to update profile');
            }
        } catch (error: any) {
            toast({
                title: 'Update Failed',
                description: error?.message || 'Could not save profile. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-full flex items-center justify-center mb-4 shadow-lg">
                                <Building2 className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-[#001a33] mb-2">Academy Information</h2>
                            <p className="text-gray-600">Let's start with the basics about your academy</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="name">
                                    Academy Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none mt-1"
                                    placeholder="e.g., Elite Football Academy"
                                />
                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="foundedYear">
                                    Founded Year <span className="text-gray-400">(Optional)</span>
                                </label>
                                <input
                                    id="foundedYear"
                                    type="number"
                                    value={formData.foundedYear}
                                    onChange={(e) => handleInputChange('foundedYear', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none mt-1"
                                    placeholder={currentYear.toString()}
                                    min="1800"
                                    max={currentYear}
                                />
                                {errors.foundedYear && <p className="text-red-500 text-sm mt-1">{errors.foundedYear}</p>}
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-full flex items-center justify-center mb-4 shadow-lg">
                                <MapPin className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-[#001a33] mb-2">Contact & Location</h2>
                            <p className="text-gray-600">Where can we reach you?</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="phone">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none mt-1"
                                    placeholder="+1 234 567 8900"
                                />
                                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="address">
                                    Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none mt-1"
                                    placeholder="123 Main St, New York, NY"
                                />
                                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700" htmlFor="city">
                                        City <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="city"
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => handleInputChange('city', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none mt-1"
                                        placeholder="New York"
                                    />
                                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700" htmlFor="country">
                                        Country
                                    </label>
                                    <input
                                        id="country"
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => handleInputChange('country', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none mt-1"
                                        placeholder="United States"
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
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-full flex items-center justify-center mb-4 shadow-lg">
                                <User className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-[#001a33] mb-2">Leadership Details</h2>
                            <p className="text-gray-600">Tell us about the academy director</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="directorName">
                                    Director Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="directorName"
                                    type="text"
                                    value={formData.directorName}
                                    onChange={(e) => handleInputChange('directorName', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none mt-1"
                                    placeholder="Full name"
                                />
                                {errors.directorName && <p className="text-red-500 text-sm mt-1">{errors.directorName}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="directorEmail">
                                    Director Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="directorEmail"
                                    type="email"
                                    value={formData.directorEmail}
                                    onChange={(e) => handleInputChange('directorEmail', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none mt-1"
                                    placeholder="director@academy.com"
                                />
                                {errors.directorEmail && <p className="text-red-500 text-sm mt-1">{errors.directorEmail}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="directorPhone">
                                    Director Phone <span className="text-gray-400">(Optional)</span>
                                </label>
                                <input
                                    id="directorPhone"
                                    type="tel"
                                    value={formData.directorPhone}
                                    onChange={(e) => handleInputChange('directorPhone', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#005391] focus:outline-none mt-1"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-[#005391] via-[#0066b3] to-[#005391] shadow-xl py-4">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Trophy className="h-5 w-5 text-[#005391]" />
                        </div>
                        <div className="text-white">
                            <div className="text-xl font-black tracking-tight">Soccer Circular</div>
                            <div className="text-xs text-blue-100">Complete Your Profile</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Step {step} of {totalSteps}</span>
                        <span className="text-sm font-medium text-[#005391]">{Math.round(progress)}% Complete</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#005391] to-[#0066b3] transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
                <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-8">
                        {renderStepContent()}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                            <div>
                                {step > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleBack}
                                        className="flex items-center gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleSkip}
                                    className="text-gray-600 hover:text-gray-900"
                                >
                                    Complete Later
                                </Button>

                                {step < totalSteps ? (
                                    <Button
                                        type="button"
                                        onClick={handleNext}
                                        className="bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#0066b3] hover:to-[#005391] text-white flex items-center gap-2"
                                    >
                                        Next
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white flex items-center gap-2"
                                    >
                                        {isSubmitting ? 'Saving...' : (
                                            <>
                                                Complete Profile
                                                <CheckCircle2 className="h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* Footer */}
            <footer className="bg-[#001a33] text-white py-6">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-blue-200 text-sm">© 2024 Soccer Circular Academy Registration Platform</p>
                </div>
            </footer>
        </div>
    );
}
