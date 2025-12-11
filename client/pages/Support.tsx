import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Mail, Phone, MessageSquare, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqData = [
    {
        question: "1. What are “Training Compensation” (TC) and “Solidarity Payments” (SP)?",
        answer: (
            <div className="space-y-2">
                <p><strong>Training Compensation (TC):</strong> A payment made when a youth-developed player signs their first professional contract abroad or transfers internationally before age 23. It compensates the clubs that trained the player between ages 12–21.</p>
                <p><strong>Solidarity Payments (SP):</strong> When an internationally transferred professional player changes clubs, 5% of the transfer fee is redistributed among the clubs that trained the player between ages 12–23.</p>
            </div>
        )
    },
    {
        question: "2. Do U.S. clubs need to be affiliated with FIFA to receive TC/SP?",
        answer: "No. FIFA affiliation is not required. What matters is that the club has proper training documentation."
    },
    {
        question: "3. Does being a “pay-to-play” club disqualify you from receiving TC/SP?",
        answer: "No. Pay-to-play status does not disqualify a club. As long as training was structured and documented, such clubs are eligible."
    },
    {
        question: "4. What kind of documentation is needed to claim TC/SP?",
        answer: "Clubs need robust evidence, such as: rosters, registration history, training logs, attendance records, tournament or ID-camp participation, coach evaluations, tryout acceptance and registration forms. Without proper documentation, claims likely will be rejected."
    },
    {
        question: "5. Do informal, grassroots, or recreational clubs qualify?",
        answer: "Yes. Even weekend-based recreational programs can qualify, provided their training was structured and documented."
    },
    {
        question: "6. Does high school or college soccer count toward TC/SP eligibility?",
        answer: "No. High school and college (e.g. NCAA) programs are not regarded as “training clubs” under FIFA regulations, so they are ineligible."
    },
    {
        question: "7. Does academy status (e.g. MLS NEXT) matter for eligibility?",
        answer: "No. What matters is documentation of training, not whether the club is part of a formal academy program."
    },
    {
        question: "8. Do domestic transfers within the U.S. trigger TC or SP?",
        answer: "No. TC and SP only apply to international transfers (i.e. transfer between clubs belonging to different national associations). Domestic U.S.–only transfers are excluded."
    },
    {
        question: "9. What about loan deals, do they generate any payments?",
        answer: "Only if the loan includes a transfer fee. If there is no transfer fee, then it does not trigger a Solidarity Payment."
    },
    {
        question: "10. How are payments split if a player trained at multiple clubs?",
        answer: "Payment is divided proportionally based on the number of years the player spent at each club during the eligible training ages."
    },
    {
        question: "11. What if a club merged with another, or changed name, can the new entity claim TC/SP?",
        answer: "Yes, the successor club may inherit the training rights, if there is documentation showing continuity of the training history."
    },
    {
        question: "12. What if a club lost original records (e.g. old paper rosters)? Is there a fallback?",
        answer: "Clubs can attempt to reconstruct records (e.g. old emails, archived tournament rosters, dated photos, coach statements, league archives, etc.). But FIFA expects evidence, so reconstructed or partial documentation will be scrutinized."
    },
    {
        question: "13. Is a club required to hire an attorney to file a claim?",
        answer: "Technically, no, but it is strongly advised. Having a qualified sports-law attorney familiar with U.S. and FIFA regulations helps avoid errors that might lead to rejection or disputes."
    },
    {
        question: "14. What kind of payments are we talking about, are amounts significant?",
        answer: "Potentially, yes. Training Compensation could range from roughly $10,000 up to over $200,000 depending on the caliber and category of the buying club. For Solidarity Payments, the amount depends on the transfer fee — e.g. a $5 million transfer could yield $250,000 to be divided among eligible training clubs."
    },
    {
        question: "15. Can a player or their parent/guardian block a club from claiming TC/SP?",
        answer: "No. These payments are made between clubs; they are not tied to the player’s contract or personal consent."
    },
    {
        question: "16. Does a player need to have played official matches (games/minutes) for the club to be eligible for compensation?",
        answer: "No. Match appearances do not matter. What counts is documented training even if the player never appeared in a formal game."
    },
    {
        question: "17. What’s the time window for filing a claim?",
        answer: "Clubs generally have up to five years from the date when the compensation obligation was triggered to file a claim. Waiting too long may forfeit eligibility."
    }
];

export default function Support() {
    const { toast } = useToast();
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
            title: "Message Sent",
            description: "We've received your message and will get back to you shortly.",
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
                        <HelpCircle className="h-8 w-8 text-[#005391]" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Support Center</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">We're here to help. Find answers to common questions or get in touch with our team.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Send us a message</CardTitle>
                                <CardDescription>Fill out the form below and we'll respond within 24 hours.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input 
                                                id="name" 
                                                placeholder="Your name" 
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                required 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input 
                                                id="email" 
                                                type="email" 
                                                placeholder="your@email.com" 
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">Subject</Label>
                                        <Input 
                                            id="subject" 
                                            placeholder="How can we help?" 
                                            value={formData.subject}
                                            onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="message">Message</Label>
                                        <Textarea 
                                            id="message" 
                                            placeholder="Tell us more about your issue..." 
                                            rows={5}
                                            value={formData.message}
                                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                                            required 
                                        />
                                    </div>
                                    <Button type="submit" className="w-full bg-[#005391] hover:bg-[#004275]" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            "Sending..."
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" /> Send Message
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
                                <CardTitle>Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <Mail className="h-5 w-5 text-[#005391]" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Email Us</p>
                                        <p className="text-sm text-slate-500">support@soccercircular.com</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <Phone className="h-5 w-5 text-[#005391]" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Call Us</p>
                                        <p className="text-sm text-slate-500">+1 (555) 123-4567</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <MessageSquare className="h-5 w-5 text-[#005391]" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Live Chat</p>
                                        <p className="text-sm text-slate-500">Available Mon-Fri, 9am-5pm EST</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* FAQ Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl text-[#005391]">Training Compensation & Solidarity Payments in U.S. Soccer</CardTitle>
                        <CardDescription>Frequently asked questions about compensation and payments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {faqData.map((faq, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger className="text-left font-medium">{faq.question}</AccordionTrigger>
                                    <AccordionContent className="text-slate-600 dark:text-slate-300">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
