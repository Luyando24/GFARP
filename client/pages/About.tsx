import React from 'react';
import { ArrowLeft, Trophy, Target, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

export default function About() {
    const { t, dir } = useTranslation();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8" dir={dir}>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link to="/">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('common.previous')}
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-4">
                        <Trophy className="h-8 w-8 text-[#005391]" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('footer.about.circular')}</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{t('footer.description')}</p>
                </div>

                <div className="grid gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                {t('footer.about')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-700 dark:text-slate-300">
                            <p>
                                {t('landing.benefits.item1.desc')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-red-500" />
                                {t('footer.about.mission')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-700 dark:text-slate-300">
                            <p>
                                {t('landing.benefits.item2.desc')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-green-500" />
                                {t('landing.benefits.item5.title')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-700 dark:text-slate-300">
                            <p>
                                {t('landing.benefits.item5.desc')}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
