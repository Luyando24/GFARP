import React from 'react';
import { ArrowLeft, Trophy, Target, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function About() {
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
                        <Trophy className="h-8 w-8 text-[#005391]" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">About Soccer Circular</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Empowering football academies worldwide.</p>
                </div>

                <div className="grid gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                Who We Are
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-700 dark:text-slate-300">
                            <p>
                                Soccer Circular is the premier platform for football academy management and FIFA compliance. 
                                We provide a comprehensive suite of tools designed to help academies of all sizes—from local grassroots clubs to elite professional training centers—manage their operations, track player development, and ensure compliance with international regulations.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-red-500" />
                                Our Mission
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-700 dark:text-slate-300">
                            <p>
                                Our mission is to democratize access to professional-grade management tools for football academies globally. 
                                We believe that every player deserves a structured development path, and every academy deserves the tools to secure their financial future through proper solidarity mechanisms and training compensation tracking.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-green-500" />
                                Our Commitment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-700 dark:text-slate-300">
                            <p>
                                We are committed to data security, transparency, and the long-term success of our partners. 
                                By adhering to the highest standards of data protection and FIFA regulations, we ensure that your academy's data is safe, secure, and always accessible when you need it.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
