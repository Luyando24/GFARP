import React, { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Send, Instagram, Linkedin, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/lib/i18n';
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Contact() {
    const { toast } = useToast();
    const { t, dir } = useTranslation();
    usePageTitle("Contact Us");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast({
            title: t('contact.form.successTitle'),
            description: t('contact.form.successDesc'),
        });

        setFormData({
            name: '',
            email: '',
            subject: '',
            message: ''
        });
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8" dir={dir}>
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Link to="/">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('common.previous')}
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-4">
                        <Mail className="h-8 w-8 text-[#005391]" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('nav.contact')}</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{t('contact.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('contact.form.title')}</CardTitle>
                                <CardDescription>{t('contact.form.desc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">{t('contact.form.name')}</Label>
                                            <Input
                                                id="name"
                                                placeholder={t('contact.form.namePlaceholder')}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">{t('contact.form.email')}</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder={t('contact.form.emailPlaceholder')}
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">{t('contact.form.subject')}</Label>
                                        <Input
                                            id="subject"
                                            placeholder={t('contact.form.subjectPlaceholder')}
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="message">{t('contact.form.message')}</Label>
                                        <Textarea
                                            id="message"
                                            placeholder={t('contact.form.messagePlaceholder')}
                                            rows={5}
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full bg-[#005391] hover:bg-[#004275]" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            t('contact.form.sending')
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" /> {t('contact.form.submit')}
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('contact.info.title')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full mt-1">
                                        <Mail className="h-5 w-5 text-[#005391]" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{t('contact.info.email')}</p>
                                        <p className="text-sm text-slate-500">sofwan@rihlasoccer.com</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full mt-1">
                                        <Phone className="h-5 w-5 text-[#005391]" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{t('contact.info.call')}</p>
                                        <p className="text-sm text-slate-500">(626) 200 3339</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full mt-1">
                                        <MapPin className="h-5 w-5 text-[#005391]" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{t('contact.info.visit')}</p>
                                        <p className="text-sm text-slate-500">
                                            123 Soccer Avenue<br />
                                            Sports City, SC 90210
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <p className="font-medium mb-3">{t('contact.info.follow')}</p>
                                    <div className="flex gap-4">
                                        <a href="https://www.instagram.com/safwanamireh?igsh=NTc4MTIwNjQ2YQ%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="bg-slate-100 p-2 rounded-full text-slate-600 hover:text-pink-600 hover:bg-pink-50 transition-colors">
                                            <Instagram className="h-5 w-5" />
                                        </a>
                                        <a href="https://www.linkedin.com/in/safwanamireh?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" target="_blank" rel="noopener noreferrer" className="bg-slate-100 p-2 rounded-full text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                            <Linkedin className="h-5 w-5" />
                                        </a>
                                        <a href="https://www.facebook.com/profile.php?id=61584639460003&mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="bg-slate-100 p-2 rounded-full text-slate-600 hover:text-blue-800 hover:bg-blue-50 transition-colors">
                                            <Facebook className="h-5 w-5" />
                                        </a>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
