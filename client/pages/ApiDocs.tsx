import React from 'react';
import { ArrowLeft, Code, BookOpen, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ApiDocs() {
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
                        <Code className="h-8 w-8 text-[#005391]" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">API Documentation</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Integrate Soccer Circular with your existing systems.</p>
                </div>

                <div className="grid gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Introduction</CardTitle>
                            <CardDescription>Welcome to the Soccer Circular API reference.</CardDescription>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                            <p>
                                The Soccer Circular API is organized around REST. Our API has predictable resource-oriented URLs, accepts form-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes, authentication, and verbs.
                            </p>
                            <p>
                                You can use the Soccer Circular API to access Academy data, manage players, upload documents, and more.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Terminal className="h-5 w-5 text-slate-500" />
                                Authentication
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-slate-700 dark:text-slate-300">
                                Authenticate your account when using the API by including your secret API key in the request. You can manage your API keys in the Dashboard.
                            </p>
                            <div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                Authorization: Bearer YOUR_API_KEY
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-500" />
                                Endpoints
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="border-b pb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">GET</span>
                                        <code className="text-sm font-mono text-slate-800 dark:text-slate-200">/api/academies</code>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">List all academies.</p>
                                </div>
                                <div className="border-b pb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">POST</span>
                                        <code className="text-sm font-mono text-slate-800 dark:text-slate-200">/api/players</code>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Register a new player.</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded">GET</span>
                                        <code className="text-sm font-mono text-slate-800 dark:text-slate-200">/api/compliance/status</code>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Check academy compliance status.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-center">
                        <Button className="bg-[#005391] hover:bg-[#004275]">
                            <BookOpen className="mr-2 h-4 w-4" />
                            View Full Reference
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
