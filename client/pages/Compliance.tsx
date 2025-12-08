import React from 'react';
import { ArrowLeft, Shield, CheckCircle, FileText, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Compliance() {
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
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">FIFA Compliance & Regulations</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Understanding the rules that govern global football.</p>
                </div>

                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Why Compliance Matters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-700 dark:text-slate-300">
                            <p className="mb-4">
                                Adhering to FIFA's Regulations on the Status and Transfer of Players (RSTP) is crucial for any academy that aspires to operate at a professional level. 
                                Compliance ensures:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Protection of Minors:</strong> Ensuring the safety and proper development of young players.</li>
                                <li><strong>Financial Security:</strong> Securing rights to Training Compensation and Solidarity Contributions.</li>
                                <li><strong>Transfer Legitimacy:</strong> Validating international transfers and preventing disputes.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-500" />
                                Key Regulations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Article 19: Protection of Minors</h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    International transfers of players are only permitted if the player is over the age of 18, with three limited exceptions (parents moving for non-football reasons, transfer within EU/EEA, or border proximity).
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Article 20: Training Compensation</h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Training compensation shall be paid to a player’s training club(s): (1) when a player signs his first contract as a professional, and (2) on each transfer of a professional until the end of the season of his 23rd birthday.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Article 21: Solidarity Mechanism</h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    If a professional is transferred before the expiry of his contract, any club that has contributed to his education and training shall receive a proportion of the compensation paid to his former club (solidarity contribution).
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ExternalLink className="h-5 w-5 text-purple-500" />
                                External Resources
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-700 dark:text-slate-300">
                            <p className="mb-4">
                                For the official and most up-to-date text of the regulations, please refer to the official FIFA documents.
                            </p>
                            <Button variant="outline" className="gap-2" onClick={() => window.open('https://digitalhub.fifa.com/m/64057863558c49b6/original/Regulations-on-the-Status-and-Transfer-of-Players-March-2024-edition.pdf', '_blank')}>
                                <FileText className="h-4 w-4" />
                                Download Official FIFA RSTP
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
