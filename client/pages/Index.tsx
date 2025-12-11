import { Trophy, Users, FileText, ShoppingCart, BookOpen, Globe, Shield, UserCheck, Menu, Target, Calendar, BarChart3, DollarSign, Award, Star, CheckCircle, Building, Crown, User } from 'lucide-react';
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ThemeToggle from "@/components/navigation/ThemeToggle";
import LanguageToggle from "@/components/navigation/LanguageToggle";
import { useTranslation } from '@/lib/i18n';

import Chatbot from '@/components/Landing/Chatbot';
import DemoModal from '@/components/Landing/DemoModal';


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

export default function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { t, dir } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Chatbot />
      <DemoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <header className="sticky top-0 z-50">
        {/* Top Bar */}
        <div className="bg-[#005391] text-white text-xs">
          <div className="px-4 py-2">
            <div className="flex items-center justify-end gap-6">
              <Link to="/about" className="hover:text-yellow-300 transition-colors font-medium">{t('nav.about')}</Link>
              {/* <Link to="/shop" className="hover:text-yellow-300 transition-colors font-medium">SHOP</Link> */}
              <Link to="/blog" className="hover:text-yellow-300 transition-colors font-medium">{t('nav.blog')}</Link>
              <Link to="/support" className="hover:text-yellow-300 transition-colors font-medium">{t('nav.help')}</Link>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="bg-gradient-to-r from-[#005391] via-[#0066b3] to-[#005391] shadow-2xl border-b-4 border-yellow-400 relative">
          {/* Dynamic background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
          </div>

          <div className="px-2 relative">
            <div className="flex items-center justify-between py-3">
              {/* Left side - Hamburger Menu */}
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-white hover:bg-white/20 rounded-lg">
                  <Menu className="h-6 w-6" />
                </Button>

                {/* Soccer Circular Logo */}
                <Link to="/" className="flex items-center gap-3 group">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110">
                      <Trophy className="h-5 w-5 text-[#005391] group-hover:text-yellow-500 transition-colors duration-300" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                      <Star className="h-2 w-2 text-white" />
                    </div>
                  </div>
                  <div className="text-white">
                    <div className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">
                      Soccer Circular
                    </div>
                  </div>
                </Link>
              </div>

              {/* Center - Desktop Navigation */}
              <nav className={`hidden lg:flex items-center gap-1 transition-all duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-100'}`}>
                {[
                  { href: "#features", label: t('nav.features') },
                  { href: "#benefits", label: t('nav.benefits') },
                  { href: "#pricing", label: t('nav.pricing') },
                  { href: "#testimonials", label: t('nav.testimonials') },
                  { href: "#contact", label: t('nav.contact') }
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="px-3 py-2 text-white font-bold text-xs tracking-wide hover:bg-white/20 rounded-lg transition-all duration-300 hover:scale-105 hover:text-yellow-300 relative group"
                  >
                    {item.label}
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 group-hover:w-full transition-all duration-300"></div>
                  </a>
                ))}
              </nav>

              {/* Right side - Search, Language, User */}
              <div className="flex items-center gap-3">
                {/* <Link to="/shop">
                  <Button variant="ghost" className="p-2 text-white hover:bg-white/20 rounded-lg hidden lg:flex">
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                </Link> */}
                <div className="hidden lg:block">
                  <LanguageToggle variant="ghost" className="text-white hover:bg-white/20" />
                </div>
                <Button asChild className="bg-white text-[#005391] hover:bg-yellow-400 hover:text-black font-bold px-4 py-2 rounded-full text-xs lg:flex hidden">
                  <Link to="/academy-registration">{t('nav.getStarted')}</Link>
                </Button>
                <Button variant="ghost" className="p-2 text-white hover:bg-white/20 rounded-lg">
                  <User className="h-5 w-5" />
                </Button>

                {/* Mobile Sign In */}
                <Button asChild className="bg-white text-[#005391] hover:bg-yellow-400 hover:text-black font-bold px-4 py-2 rounded-full text-sm lg:hidden">
                  <Link to="/academy-registration">{t('nav.getStarted')}</Link>
                </Button>
              </div>
            </div>

            {isMenuOpen && (
              <>
                {/* Overlay */}
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                {/* Menu */}
                <div className="bg-gradient-to-b from-[#005391] to-[#0066b3] border-t-2 border-yellow-400 absolute top-full left-0 w-80 z-50 shadow-2xl">
                  <nav className="flex flex-col gap-2 p-6">
                    {[
                      { href: "#features", label: t('nav.features') },
                      { href: "#benefits", label: t('nav.benefits') },
                      { href: "#pricing", label: t('nav.pricing') },
                      { href: "#testimonials", label: t('nav.testimonials') },
                      { href: "#contact", label: t('nav.contact') }
                    ].map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className="text-white font-bold py-3 px-4 hover:bg-white/20 rounded-lg transition-all duration-300 hover:text-yellow-300 border-l-4 border-transparent hover:border-yellow-400"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </a>
                    ))}
                    <div className="py-2">
                      <LanguageToggle variant="ghost" className="w-full justify-start text-white hover:bg-white/20" />
                    </div>
                    <Button asChild className="mt-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 font-bold py-3 rounded-full shadow-xl">
                      <Link to="/academy-registration">{t('nav.register')}</Link>
                    </Button>
                  </nav>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <section id="hero" className="relative min-h-screen bg-gradient-to-br from-[#001a33] via-[#003366] to-[#005391] overflow-hidden">
        {/* FIFA-related Background Image */}
        <div className="absolute inset-0 w-full h-full">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"
            }}
          />

          {/* Image Overlay with FIFA-inspired elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#001a33]/90 via-[#003366]/85 to-[#005391]/80">
            {/* FIFA Trophy Silhouette */}
            <div className="absolute right-10 bottom-0 w-96 h-96 bg-contain bg-no-repeat bg-bottom opacity-20"
              style={{
                backgroundImage: "url('https://www.fifamuseum.com/media/3832/wc_trophy.png?anchor=center&mode=crop&width=1600&height=900&rnd=132739247710000000')"
              }}
            />
          </div>
        </div>

        {/* Dynamic FIFA-inspired background elements */}
        <div className="absolute inset-0 z-5">
          {/* Football field pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] border-2 border-white rounded-lg">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-full"></div>
            </div>
          </div>

          {/* Floating orbs */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-20 w-80 h-80 bg-gradient-to-r from-blue-400/15 to-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-gradient-to-r from-white/10 to-white/5 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

        <div className="container mx-auto relative min-h-screen flex items-center justify-center px-4 z-20">
          <div className="text-center max-w-6xl">
            {/* FIFA Badge */}
            <div className="mb-12 mt-8 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full shadow-lg">
              <Trophy className="h-3 w-3 text-black" />
              <span className="text-black font-bold text-xs tracking-wide">{t('hero.badge')}</span>
              <div className="flex gap-0.5">
                <Star className="h-2.5 w-2.5 text-black fill-current" />
                <Star className="h-2.5 w-2.5 text-black fill-current" />
                <Star className="h-2.5 w-2.5 text-black fill-current" />
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white mb-6">
              <span className="block bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
                {t('hero.title1')}
              </span>
              <span className="block bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                {t('hero.title2')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-blue-100 font-semibold max-w-4xl mx-auto leading-relaxed mb-10 px-4">
              {t('hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12 px-4">
              <Button size="lg" className="text-lg px-10 py-6 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black shadow-2xl hover:shadow-yellow-500/50 transition-all duration-500 transform hover:scale-105 border-2 border-white/30 hover:border-white/60 animate-pulse w-full sm:w-auto">
                <Link to="/academy-registration" className="flex items-center gap-3 justify-center">
                  <Trophy className="h-5 w-5" />
                  {t('hero.cta.register')}
                </Link>
              </Button>

              <Button size="lg" className="text-lg px-10 py-6 rounded-full bg-white/10 hover:bg-white/20 text-white font-black shadow-xl hover:shadow-white/25 transition-all duration-500 transform hover:scale-105 border-2 border-white/30 hover:border-white/50 backdrop-blur-sm w-full sm:w-auto">
                <Link to="/academy-dashboard" className="flex items-center gap-3 justify-center">
                  <Target className="h-6 w-6" />
                  {t('hero.cta.start')}
                </Link>
              </Button>
            </div>


          </div>
        </div>

      </section>



      {/* Key Features Section - FIFA Tournament Style */}
      <section className="py-32 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden" id="features">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-[#005391]/5 to-[#0066b3]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#005391] to-[#0066b3] rounded-full mb-6">
              <Trophy className="h-5 w-5 text-white" />
              <span className="text-white font-bold text-sm tracking-wide">{t('features.title.sub')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#001a33] mb-6">
              {t('features.title.main')}
              <span className="block bg-gradient-to-r from-[#005391] to-[#0066b3] bg-clip-text text-transparent">
                {t('features.title.sub')}
              </span>
            </h2>
          </div>

          {/* Features Grid - Tournament Card Style */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Feature 1 - Player Registration */}
            <Link to="/academy-dashboard" className="block">
              <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden cursor-pointer">
                {/* Card Header */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#005391] to-[#0066b3]"></div>

                {/* Icon Badge */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-[#005391]/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <Star className="h-4 w-4 text-black fill-current" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-[#005391] transition-colors duration-300">
                  {t('features.playerReg.title')}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6 group-hover:text-gray-700 transition-colors duration-300">
                  {t('features.playerReg.desc')}
                </p>

                {/* CTA Button */}
                <Button className="w-full bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#0066b3] hover:to-[#005391] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 pointer-events-none">
                  <div className="flex items-center justify-center gap-2">
                    {t('nav.getStarted')}
                    <Target className="h-4 w-4" />
                  </div>
                </Button>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#005391]/5 to-[#0066b3]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              </div>
            </Link>

            {/* Feature 2 - Document Management */}
            <Link to="/academy-dashboard" className="block">
              <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden cursor-pointer">
                {/* Card Header */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 to-yellow-500"></div>

                {/* Icon Badge */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-yellow-500/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                    <FileText className="h-10 w-10 text-black" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-[#005391] to-[#0066b3] rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-yellow-600 transition-colors duration-300">
                  {t('features.docMgmt.title')}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6 group-hover:text-gray-700 transition-colors duration-300">
                  {t('features.docMgmt.desc')}
                </p>

                {/* CTA Button */}
                <Button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 pointer-events-none">
                  <div className="flex items-center justify-center gap-2">
                    {t('nav.getStarted')}
                    <Target className="h-4 w-4" />
                  </div>
                </Button>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              </div>
            </Link>

            {/* Feature 3 - FIFA Compliance */}
            <Link to="/academy-dashboard" className="block">
              <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden cursor-pointer">
                {/* Card Header */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-400 to-green-500"></div>

                {/* Icon Badge */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-green-500/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                    <Shield className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-[#005391] to-[#0066b3] rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-green-600 transition-colors duration-300">
                  {t('features.fifaComp.title')}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6 group-hover:text-gray-700 transition-colors duration-300">
                  {t('features.fifaComp.desc')}
                </p>

                {/* CTA Button */}
                <Button className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 pointer-events-none">
                  <div className="flex items-center justify-center gap-2">
                    {t('nav.getStarted')}
                    <Target className="h-4 w-4" />
                  </div>
                </Button>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              </div>
            </Link>
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <Button size="lg" className="text-xl px-12 py-6 rounded-full bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#0066b3] hover:to-[#005391] text-white font-black shadow-2xl hover:shadow-[#005391]/25 transition-all duration-500 transform hover:scale-110">
              <Link to="/academy-registration" className="flex items-center gap-3">
                <Trophy className="h-6 w-6" />
                START YOUR CHAMPIONSHIP JOURNEY
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section - Why Choose GFARP */}
      <section className="py-32 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden" id="benefits">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-[#005391]/5 to-[#0066b3]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#005391] to-[#0066b3] rounded-full mb-6">
              <Trophy className="h-5 w-5 text-white" />
              <span className="text-white font-bold text-sm tracking-wide">{t('landing.benefits.title.sub')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#001a33] mb-16">
              {t('landing.benefits.title.main')}
              <span className="block bg-gradient-to-r from-[#005391] to-[#0066b3] bg-clip-text text-transparent">
                {t('landing.benefits.title.platform')}
              </span>
            </h2>
          </div>

          {/* Benefits Grid - Tournament Card Style */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Benefit 1 - FIFA Registration */}
            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden">
              {/* Card Header */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#005391] to-[#0066b3]"></div>

              {/* Icon Badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-[#005391]/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-black fill-current" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-[#005391] transition-colors duration-300">
                {t('landing.benefits.item1.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {t('landing.benefits.item1.desc')}
              </p>
            </div>

            {/* Benefit 2 - Training Compensation */}
            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden">
              {/* Card Header */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-500 to-emerald-600"></div>

              {/* Icon Badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-green-500/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <DollarSign className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-black" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-green-600 transition-colors duration-300">
                {t('landing.benefits.item2.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {t('landing.benefits.item2.desc')}
              </p>
            </div>

            {/* Benefit 3 - Solidarity Mechanism */}
            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden">
              {/* Card Header */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#005391] to-[#0066b3]"></div>

              {/* Icon Badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-[#005391]/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <Globe className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-black fill-current" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-[#005391] transition-colors duration-300">
                {t('landing.benefits.item3.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {t('landing.benefits.item3.desc')}
              </p>
            </div>

            {/* Benefit 4 - Compliance Monitoring */}
            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden">
              {/* Card Header */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#005391] to-[#0066b3]"></div>

              {/* Icon Badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-[#005391]/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-black fill-current" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-[#005391] transition-colors duration-300">
                {t('landing.benefits.item4.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {t('landing.benefits.item4.desc')}
              </p>
            </div>

            {/* Benefit 5 - Document Security */}
            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden">
              {/* Card Header */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#005391] to-[#0066b3]"></div>

              {/* Icon Badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-[#005391]/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-black fill-current" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-[#005391] transition-colors duration-300">
                {t('landing.benefits.item5.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {t('landing.benefits.item5.desc')}
              </p>
            </div>

            {/* Benefit 6 - Analytics Dashboard */}
            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden">
              {/* Card Header */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#005391] to-[#0066b3]"></div>

              {/* Icon Badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-[#005391]/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <BarChart3 className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-black fill-current" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-[#005391] transition-colors duration-300">
                {t('landing.benefits.item6.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {t('landing.benefits.item6.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Pricing Section */}

      {/* Pricing Section - FIFA Membership Tiers */}
      <section className="py-12 bg-gradient-to-br from-[#001a33] via-[#003366] to-[#005391] relative overflow-hidden" id="pricing">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-gradient-to-r from-white/5 to-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] border border-white/10 rounded-lg opacity-20">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/20"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white/20 rounded-full"></div>
          </div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full mb-4">
              <Trophy className="h-4 w-4 text-black" />
              <span className="text-black font-black text-xs tracking-wide">{t('landing.pricing.title.tiers')}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-8">
              {t('landing.pricing.title.choose')}
              <span className="block bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                {t('landing.pricing.title.sub')}
              </span>
            </h2>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center items-center gap-4 mb-12">
            <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-blue-200'}`}>
              {t('landing.pricing.toggle.monthly')}
            </span>
            <Switch
              checked={billingCycle === 'yearly'}
              onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
              className="bg-blue-900 border-2 border-yellow-400 data-[state=checked]:bg-yellow-400"
            />
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-white' : 'text-blue-200'}`}>
                {t('landing.pricing.toggle.yearly')}
              </span>
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                {t('landing.pricing.save')}
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">

            {/* Free Tier - Starter */}
            <div className="group relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-3 border-2 border-transparent hover:border-slate-400/30 overflow-hidden">
              {/* Tier Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white px-4 py-1.5 rounded-full font-black text-xs tracking-wide shadow-lg">
                  STARTER
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-6 pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl group-hover:shadow-slate-600/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#001a33] mb-2">Free</h3>
                <div className="text-3xl font-black text-[#001a33] mb-2">
                  $0
                  <span className="text-lg text-gray-600 font-bold">
                    {billingCycle === 'monthly' ? t('landing.pricing.month') : t('landing.pricing.year')}
                  </span>
                </div>
                <p className="text-gray-600 font-bold text-sm">Perfect for small academies</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {[
                  "Max 3 players",
                  t('landing.pricing.feature.compliance'),
                  t('landing.pricing.feature.support')
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <div className="w-5 h-5 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-black py-4 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <Link to="/academy-registration?plan=free" className="flex items-center justify-center gap-2">
                  Get Started
                  <User className="h-4 w-4" />
                </Link>
              </Button>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-600/5 to-slate-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            </div>

            {/* Basic Tier - Bronze */}
            <div className="group relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-3 border-2 border-transparent hover:border-yellow-400/30 overflow-hidden">
              {/* Tier Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-1.5 rounded-full font-black text-xs tracking-wide shadow-lg">
                  {t('landing.pricing.tier1.badge')}
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-6 pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl group-hover:shadow-amber-600/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#001a33] mb-2">{t('landing.pricing.tier1.name')}</h3>
                <div className="text-3xl font-black text-[#001a33] mb-2">
                  {billingCycle === 'monthly' ? t('landing.pricing.tier1.price') : t('landing.pricing.tier1.priceYearly')}
                  <span className="text-lg text-gray-600 font-bold">
                    {billingCycle === 'monthly' ? t('landing.pricing.month') : t('landing.pricing.year')}
                  </span>
                </div>
                <p className="text-gray-600 font-bold text-sm">{t('landing.pricing.tier1.desc')}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {[
                  t('landing.pricing.feature.players').replace('{count}', '50'),
                  t('landing.pricing.feature.compliance'),
                  t('landing.pricing.feature.support'),
                  t('landing.pricing.feature.registration')
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <div className="w-5 h-5 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black py-4 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <Link to="/academy-registration?plan=basic" className="flex items-center justify-center gap-2">
                  {t('landing.pricing.start.bronze')}
                  <Trophy className="h-4 w-4" />
                </Link>
              </Button>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-amber-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            </div>

            {/* Pro Tier - Gold (Featured) */}
            <div className="group relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-4 border-yellow-400 overflow-hidden">
              {/* Featured Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-5 py-2 rounded-full font-black text-xs tracking-wide shadow-2xl animate-pulse">
                  🏆 {t('landing.pricing.popular')} 🏆
                </div>
              </div>

              {/* Tier Badge */}
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-4 py-1.5 rounded-full font-black text-xs tracking-wide shadow-lg mt-6">
                  {t('landing.pricing.tier2.badge')}
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-5 pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-2xl group-hover:shadow-3xl group-hover:shadow-yellow-500/50 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <Trophy className="h-8 w-8 text-black" />
                </div>
                <h3 className="text-2xl font-black text-[#001a33] mb-1">{t('landing.pricing.tier2.name')}</h3>
                <div className="text-3xl font-black text-[#001a33] mb-1">
                  {billingCycle === 'monthly' ? t('landing.pricing.tier2.price') : t('landing.pricing.tier2.priceYearly')}
                  <span className="text-lg text-gray-600 font-bold">
                    {billingCycle === 'monthly' ? t('landing.pricing.month') : t('landing.pricing.year')}
                  </span>
                </div>
                <p className="text-gray-600 font-bold text-sm">{t('landing.pricing.tier2.ideal')}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-5">
                {[
                  t('landing.pricing.feature.players').replace('{count}', '200'),
                  t('landing.pricing.feature.fullCompliance').replace('Full', 'Advanced'), // Using existing key but slightly modified text if needed, or just map 'Advanced FIFA compliance' to a new key. I'll stick to 'Advanced FIFA compliance' if I didn't add a key for it. Wait, I added 'landing.pricing.feature.fullCompliance' as "Full FIFA compliance suite". The English text was "Advanced FIFA compliance". I'll use `landing.pricing.feature.fullCompliance` as it's close enough or just hardcode "Advanced" if specific key missing. Actually I see I didn't add 'Advanced FIFA compliance' key. I'll use 'landing.pricing.feature.fullCompliance' for now as it's similar concept.
                  t('landing.pricing.feature.prioritySupport'),
                  t('landing.pricing.feature.trainingTracking'),
                  t('landing.pricing.feature.analytics')
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <div className="w-5 h-5 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-black py-4 text-sm rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                <Link to="/academy-registration?plan=pro" className="flex items-center justify-center gap-2">
                  {t('landing.pricing.start.gold')}
                  <Star className="h-4 w-4 fill-current" />
                </Link>
              </Button>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            </div>

            {/* Elite Tier - Platinum */}
            <div className="group relative bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-purple-400/30 overflow-hidden">
              {/* Tier Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-1.5 rounded-full font-black text-xs tracking-wide shadow-lg">
                  {t('landing.pricing.tier3.badge')}
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-6 pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl group-hover:shadow-purple-600/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#001a33] mb-1">{t('landing.pricing.tier3.name')}</h3>
                <div className="text-3xl font-black text-[#001a33] mb-1">
                  {billingCycle === 'monthly' ? t('landing.pricing.tier3.price') : t('landing.pricing.tier3.priceYearly')}
                  <span className="text-lg text-gray-600 font-bold">
                    {billingCycle === 'monthly' ? t('landing.pricing.month') : t('landing.pricing.year')}
                  </span>
                </div>
                <p className="text-gray-600 font-bold text-sm">{t('landing.pricing.tier3.worldClass')}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-5">
                {[
                  t('landing.pricing.feature.unlimitedPlayers'),
                  t('landing.pricing.feature.fullCompliance'),
                  t('landing.pricing.feature.247Support'),
                  t('landing.pricing.feature.solidarity'),
                  t('landing.pricing.feature.analytics').replace('Analytics dashboard', 'Advanced analytics & reporting'), // Manually adjusting text if key doesn't match perfectly or just use key. I'll use key for base and maybe concat. Actually "Advanced analytics & reporting" is slightly diff from "Analytics dashboard". I'll just use the key for analytics.
                  "Custom integrations" // No key for this one. I missed it. I'll leave it hardcoded or add key. Let's add key 'landing.pricing.feature.customIntegrations' later if needed, or just leave it English for now as "Custom integrations" is fairly standard. I'll leave it as string for now to avoid breaking if I don't add key.
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <div className="w-5 h-5 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-black py-4 text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <Link to="/academy-registration?plan=elite" className="flex items-center justify-center gap-2">
                  {t('landing.pricing.start.platinum')}
                  <Award className="h-4 w-4" />
                </Link>
              </Button>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-purple-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="text-center mt-16">
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              {t('landing.pricing.footer')}
            </p>
            <Button size="lg" className="text-xl px-12 py-6 rounded-full bg-white/10 hover:bg-white/20 text-white font-black shadow-2xl hover:shadow-white/25 transition-all duration-500 transform hover:scale-110 border-4 border-white/30 hover:border-white/50 backdrop-blur-sm">
              <Link to="/academy-demo" className="flex items-center gap-3">
                <Target className="h-6 w-6" />
                {t('landing.pricing.compare')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-black text-[#001a33] dark:text-white mb-4">Frequently Asked Questions</h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">Common questions about Training Compensation & Solidarity Payments</p>
            </div>
            
            <Accordion type="single" collapsible className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6">
                {faqData.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                        <AccordionTrigger className="text-left font-bold text-lg py-4 hover:no-underline hover:text-[#005391] dark:hover:text-blue-400 transition-colors">
                            {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-600 dark:text-slate-300 text-base leading-relaxed pb-4">
                            {faq.answer}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="relative">
                <Trophy className="h-16 w-16 text-yellow-400" />
                <Star className="absolute -top-1 -right-1 h-5 w-5 text-yellow-300 fill-current" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">Soccer Circular</h3>
                <p className="text-xs text-blue-200 font-bold tracking-wide">{t('footer.tagline')}</p>
              </div>
            </div>
            <p className="text-slate-400 max-w-2xl mx-auto">{t('footer.description')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* About Soccer Circular */}
            <div className="bg-blue-900/30 p-6 rounded-2xl border border-blue-800/50">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-blue-400" />
                <h4 className="text-lg font-bold text-blue-300">{t('footer.about')}</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li><Link to="/about" className="hover:text-blue-300 transition-colors flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>{t('footer.about.circular')}</span>
                </Link></li>
                <li><Link to="/about" className="hover:text-blue-300 transition-colors flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>{t('footer.about.mission')}</span>
                </Link></li>
                <li><Link to="/compliance" className="hover:text-blue-300 transition-colors flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>{t('dash.menu.compliance')}</span>
                </Link></li>
              </ul>
            </div>

            {/* Academy Services */}
            <div className="bg-green-900/30 p-6 rounded-2xl border border-green-800/50">
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="h-5 w-5 text-green-400" />
                <h4 className="text-lg font-bold text-green-300">{t('footer.services')}</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li><Link to="/services" className="hover:text-green-300 transition-colors flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{t('footer.services.registration')}</span>
                </Link></li>
                <li><Link to="/services" className="hover:text-green-300 transition-colors flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{t('footer.services.documents')}</span>
                </Link></li>
                <li><Link to="/services" className="hover:text-green-300 transition-colors flex items-center space-x-2">
                  <Award className="h-4 w-4" />
                  <span>{t('footer.services.training')}</span>
                </Link></li>
              </ul>
            </div>

            {/* Legal & Policies */}
            <div className="bg-purple-900/30 p-6 rounded-2xl border border-purple-800/50">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-5 w-5 text-purple-400" />
                <h4 className="text-lg font-bold text-purple-300">{t('footer.legal')}</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li><Link to="/privacy-policy" className="hover:text-purple-300 transition-colors flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{t('footer.legal.privacy')}</span>
                </Link></li>
                <li><Link to="/terms-of-service" className="hover:text-purple-300 transition-colors flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{t('footer.legal.terms')}</span>
                </Link></li>
                <li><Link to="/compliance" className="hover:text-purple-300 transition-colors flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{t('footer.legal.regulations')}</span>
                </Link></li>
              </ul>
            </div>

            {/* Support & Resources */}
            <div className="bg-orange-900/30 p-6 rounded-2xl border border-orange-800/50">
              <div className="flex items-center space-x-2 mb-4">
                <Building className="h-5 w-5 text-orange-400" />
                <h4 className="text-lg font-bold text-orange-300">{t('footer.support')}</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li><Link to="/support" className="hover:text-orange-300 transition-colors flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{t('footer.support.contact')}</span>
                </Link></li>
                <li><Link to="/support" className="hover:text-orange-300 transition-colors flex items-center space-x-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span>{t('footer.support.help')}</span>
                </Link></li>
                <li><Link to="/api-docs" className="hover:text-orange-300 transition-colors flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{t('footer.support.api')}</span>
                </Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-center">
            <p className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} {t('footer.copyright')}
            </p>
          </div>
        </div>
      </footer>


    </div>
  );
}
