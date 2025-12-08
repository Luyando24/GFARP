import React from 'react';
import { ArrowLeft, User, FileText, Award, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Services() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Link to="/">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-4">
                        <Award className="h-8 w-8 text-[#005391]" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Academy Services</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Comprehensive tools for modern football academies.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-500" />
                                Player Registration
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                Streamline your player onboarding process with our digital registration system. 
                                Capture all necessary details, medical history, and guardian information in one secure place.
                            </p>
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>Digital profiles for every player</li>
                                <li>Photo and ID upload</li>
                                <li>Medical and emergency contact tracking</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-green-500" />
                                Document Management
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                Keep your academy audit-ready with our centralized document management system. 
                                Upload, organize, and track expiration dates for all critical compliance documents.
                            </p>
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>Secure cloud storage</li>
                                <li>Expiration alerts</li>
                                <li>Easy sharing and export</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-purple-500" />
                                Training Compensation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                Ensure you never miss out on solidarity payments and training compensation. 
                                Our system automatically tracks player movement and calculates potential revenue.
                            </p>
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>Automated calculations</li>
                                <li>Transfer history tracking</li>
                                <li>Claim generation assistance</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-orange-500" />
                                Performance Analytics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                Make data-driven decisions with our advanced analytics dashboard. 
                                Monitor player development, academy growth, and financial health.
                            </p>
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>Player progress reports</li>
                                <li>Financial forecasting</li>
                                <li>Customizable dashboards</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
