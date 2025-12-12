import React from 'react';
import { ArrowLeft, User, FileText, Award, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

export default function Services() {
    const { t, dir } = useTranslation();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8" dir={dir}>
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Link to="/">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('services.back')}
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-4">
                        <Award className="h-8 w-8 text-[#005391]" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('services.title')}</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{t('services.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-500" />
                                {t('footer.services.registration')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                {t('services.registration.desc')}
                            </p>
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>{t('services.registration.list1')}</li>
                                <li>{t('services.registration.list2')}</li>
                                <li>{t('services.registration.list3')}</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-green-500" />
                                {t('footer.services.documents')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                {t('services.docs.desc')}
                            </p>
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>{t('services.docs.list1')}</li>
                                <li>{t('services.docs.list2')}</li>
                                <li>{t('services.docs.list3')}</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-purple-500" />
                                {t('footer.services.training')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                {t('services.compensation.desc')}
                            </p>
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>{t('services.compensation.list1')}</li>
                                <li>{t('services.compensation.list2')}</li>
                                <li>{t('services.compensation.list3')}</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-orange-500" />
                                {t('services.analytics.title')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                {t('services.analytics.desc')}
                            </p>
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>{t('services.analytics.list1')}</li>
                                <li>{t('services.analytics.list2')}</li>
                                <li>{t('services.analytics.list3')}</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
