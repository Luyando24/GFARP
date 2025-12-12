import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

export default function TermsOfService() {
    const { t, dir } = useTranslation();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8" dir={dir}>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link to="/">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('services.back')}
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-4">
                        <FileText className="h-8 w-8 text-[#005391]" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('footer.legal.terms')}</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{t('common.lastUpdated')} {new Date().toLocaleDateString()}</p>
                </div>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{t('terms.agreement')}</CardTitle>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                        <p>
                            These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Soccer Circular ("we," "us" or "our"), concerning your access to and use of the Soccer Circular website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").
                        </p>
                        <p className="mt-4">
                            You agree that by accessing the Site, you have read, understood, and agree to be bound by all of these Terms of Service. If you do not agree with all of these Terms of Service, then you are expressly prohibited from using the Site and you must discontinue use immediately.
                        </p>
                    </CardContent>
                </Card>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{t('terms.intellectual')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
                        <p>
                            Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.
                        </p>
                    </CardContent>
                </Card>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{t('terms.userRep')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-slate-700 dark:text-slate-300">
                        <p>By using the Site, you represent and warrant that:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>All registration information you submit will be true, accurate, current, and complete.</li>
                            <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
                            <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
                            <li>You are not a minor in the jurisdiction in which you reside.</li>
                            <li>You will not access the Site through automated or non-human means, whether through a bot, script or otherwise.</li>
                            <li>You will not use the Site for any illegal or unauthorized purpose.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{t('terms.subscription')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
                        <p>
                            Some parts of the Service are billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set either on a monthly or annual basis, depending on the type of subscription plan you select when purchasing a Subscription.
                        </p>
                        <p>
                            At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions unless you cancel it or Soccer Circular cancels it. You may cancel your Subscription renewal either through your online account management page or by contacting Soccer Circular customer support team.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('common.contactUs')}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-slate-700 dark:text-slate-300">
                        <p>In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at:</p>
                        <div className="mt-4">
                            <p className="font-semibold">Soccer Circular</p>
                            <p>Email: sofwan@rihlasoccer.com</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
