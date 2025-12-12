import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link to="/">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="h-8 w-8 text-[#005391]" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
                </div>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Introduction</CardTitle>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none">
                        <p>
                            Soccer Circular ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our academy management platform.
                        </p>
                        <p>
                            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
                        </p>
                    </CardContent>
                </Card>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Information We Collect</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Personal Data</h3>
                        <p>
                            Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Site or when you choose to participate in various activities related to the Site.
                        </p>

                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">Derivative Data</h3>
                        <p>
                            Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.
                        </p>

                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">Financial Data</h3>
                        <p>
                            Financial information, such as data related to your payment method (e.g., valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services from the Site.
                        </p>
                    </CardContent>
                </Card>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Use of Your Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-slate-700 dark:text-slate-300">
                        <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>Create and manage your account.</li>
                            <li>Process your payments and refunds.</li>
                            <li>Email you regarding your account or order.</li>
                            <li>Enable user-to-user communications.</li>
                            <li>Generate a personal profile about you to make future visits to the Site more personalized.</li>
                            <li>Increase the efficiency and operation of the Site.</li>
                            <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
                            <li>Prevent fraudulent transactions, monitor against theft, and protect against criminal activity.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Disclosure of Your Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
                        <p>
                            We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
                            <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact Us</CardTitle>
                    </CardHeader>
                    <CardContent className="text-slate-700 dark:text-slate-300">
                        <p>If you have questions or comments about this Privacy Policy, please contact us at:</p>
                        <div className="mt-4">
                            <p className="font-semibold">Soccer Circular</p>
                            <p>Email: sofwan@rihlasoccer.com</p>
                            <p>Phone: +1 (555) 123-4567</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
