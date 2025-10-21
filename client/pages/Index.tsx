import { Trophy, Users, FileText, ShoppingCart, BookOpen, Globe, Shield, UserCheck, Menu, Target, Calendar, BarChart3, DollarSign, Award, Star, CheckCircle, Building, Crown, User, Lightbulb } from 'lucide-react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import { useState } from 'react';

import Chatbot from '@/components/Landing/Chatbot';
import DemoModal from '@/components/Landing/DemoModal';

export default function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Chatbot />
      <DemoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <header className="sticky top-0 z-50">
        {/* Top Bar */}
         <div className="bg-[#005391] text-white text-xs">
           <div className="px-4 py-2">
             <div className="flex items-center justify-end gap-6">
               <a href="#about" className="hover:text-yellow-300 transition-colors font-medium">ABOUT US</a>
               <a href="#support" className="hover:text-yellow-300 transition-colors font-medium">SUPPORT</a>
               <Link to="/shop" className="hover:text-yellow-300 transition-colors font-medium">SHOP</Link>
               <a href="#blog" className="hover:text-yellow-300 transition-colors font-medium">BLOG</a>
               <a href="#help" className="hover:text-yellow-300 transition-colors font-medium">HELP CENTER</a>
               <Link to="/admin-dashboard" className="hover:text-yellow-300 transition-colors font-medium">ADMIN (TEST)</Link>
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
                
                {/* GFARP Logo */}
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
                       GFARP
                     </div>
                   </div>
                 </Link>
              </div>
              
              {/* Center - Desktop Navigation */}
               <nav className={`hidden lg:flex items-center gap-1 transition-all duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-100'}`}>
                 {[
                   { href: "#features", label: "FEATURES" },
                   { href: "#benefits", label: "BENEFITS" },
                   { href: "#pricing", label: "PRICING" },
                   { href: "#testimonials", label: "TESTIMONIALS" },
                   { href: "#contact", label: "CONTACT" }
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
                <Link to="/shop">
                  <Button variant="ghost" className="p-2 text-white hover:bg-white/20 rounded-lg hidden lg:flex">
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="ghost" className="p-2 text-white hover:bg-white/20 rounded-lg hidden lg:flex">
                  <Globe className="h-5 w-5" />
                </Button>
                <Button asChild className="bg-white text-[#005391] hover:bg-yellow-400 hover:text-black font-bold px-4 py-2 rounded-full text-xs lg:flex hidden">
                  <Link to="/academy-registration">GET STARTED</Link>
                </Button>
                <Button variant="ghost" className="p-2 text-white hover:bg-white/20 rounded-lg">
                  <User className="h-5 w-5" />
                </Button>
                
                {/* Mobile Sign In */}
                <Button asChild className="bg-white text-[#005391] hover:bg-yellow-400 hover:text-black font-bold px-4 py-2 rounded-full text-sm lg:hidden">
                  <Link to="/academy-registration">GET STARTED</Link>
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
                     { href: "#features", label: "FEATURES" },
                     { href: "#benefits", label: "BENEFITS" },
                     { href: "#pricing", label: "PRICING" },
                     { href: "#testimonials", label: "TESTIMONIALS" },
                     { href: "#contact", label: "CONTACT" }
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
                   <Button asChild className="mt-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 font-bold py-3 rounded-full shadow-xl">
                     <Link to="/academy-registration">REGISTER ACADEMY</Link>
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
              <span className="text-black font-bold text-xs tracking-wide">FIFA APPROVED PLATFORM</span>
              <div className="flex gap-0.5">
                <Star className="h-2.5 w-2.5 text-black fill-current" />
                <Star className="h-2.5 w-2.5 text-black fill-current" />
                <Star className="h-2.5 w-2.5 text-black fill-current" />
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white mb-6">
              <span className="block bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
                INVEST IN YOUR PLAYERS'
              </span>
              <span className="block bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                FUTURE WITH FIFA
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-blue-100 font-semibold max-w-4xl mx-auto leading-relaxed mb-10 px-4">
              Register your academy players today • Secure future compensation payments • 
              <span className="text-yellow-300"> Your first step towards long-term financial stability</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12 px-4">
              <Button size="lg" className="text-lg px-10 py-6 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black shadow-2xl hover:shadow-yellow-500/50 transition-all duration-500 transform hover:scale-105 border-2 border-white/30 hover:border-white/60 animate-pulse w-full sm:w-auto">
                <Link to="/academy-registration" className="flex items-center gap-3 justify-center">
                  <Trophy className="h-5 w-5" />
                  REGISTER ACADEMY
                </Link>
              </Button>
              
              <Button size="lg" className="text-lg px-10 py-6 rounded-full bg-white/10 hover:bg-white/20 text-white font-black shadow-xl hover:shadow-white/25 transition-all duration-500 transform hover:scale-105 border-2 border-white/30 hover:border-white/50 backdrop-blur-sm w-full sm:w-auto">
                <Link to="/academy-dashboard" className="flex items-center gap-3 justify-center">
                  <Target className="h-6 w-6" />
                  TRY DEMO
                </Link>
              </Button>
            </div>


          </div>
        </div>

      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-b from-[#001a33] to-[#003366] relative overflow-hidden" id="how-it-works">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-[#005391]/10 to-[#0066b3]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full mb-6">
              <Lightbulb className="h-5 w-5 text-black" />
              <span className="text-black font-bold text-sm tracking-wide">SIMPLE PROCESS</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6">
              HOW IT
              <span className="block bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                WORKS
              </span>
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Four simple steps to secure your academy's financial future with FIFA
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 px-4">
            {/* Step 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/20 hover:border-yellow-500/50 transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 w-12 h-12 rounded-full flex items-center justify-center mb-6 text-black font-bold text-xl">1</div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Register Academy</h3>
              <p className="text-blue-100">Create your academy profile and verify your credentials with our FIFA-approved system.</p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/20 hover:border-yellow-500/50 transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 w-12 h-12 rounded-full flex items-center justify-center mb-6 text-black font-bold text-xl">2</div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Add Players</h3>
              <p className="text-blue-100">Register all your players with complete profiles, documentation, and training history.</p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/20 hover:border-yellow-500/50 transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 w-12 h-12 rounded-full flex items-center justify-center mb-6 text-black font-bold text-xl">3</div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Track Progress</h3>
              <p className="text-blue-100">Monitor player development and transfers through our FIFA-connected dashboard.</p>
            </div>
            
            {/* Step 4 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/20 hover:border-yellow-500/50 transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 w-12 h-12 rounded-full flex items-center justify-center mb-6 text-black font-bold text-xl">4</div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Receive Compensation</h3>
              <p className="text-blue-100">Get automatic notifications and secure payments when your players advance to professional clubs.</p>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="text-center">
            <Button size="lg" className="text-lg px-10 py-6 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black shadow-2xl hover:shadow-yellow-500/50 transition-all duration-500 transform hover:scale-105 border-2 border-white/30 hover:border-white/60">
              <Link to="/academy-registration" className="flex items-center gap-3">
                <Trophy className="h-5 w-5" />
                START YOUR JOURNEY TODAY
              </Link>
            </Button>
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
              <span className="text-white font-bold text-sm tracking-wide">CHAMPIONSHIP FEATURES</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#001a33] mb-6">
              WORLD-CLASS
              <span className="block bg-gradient-to-r from-[#005391] to-[#0066b3] bg-clip-text text-transparent">
                PLATFORM FEATURES
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
                  PLAYER REGISTRATION SYSTEM
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6 group-hover:text-gray-700 transition-colors duration-300">
                  Championship-level player registration with FIFA-compliant documentation, medical records, and comprehensive contract management system.
                </p>

                {/* CTA Button */}
                <Button className="w-full bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#0066b3] hover:to-[#005391] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 pointer-events-none">
                  <div className="flex items-center justify-center gap-2">
                    TRY DEMO
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
                  DOCUMENT MANAGEMENT
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6 group-hover:text-gray-700 transition-colors duration-300">
                  Elite-grade secure cloud storage for player documents, contracts, medical certificates, and FIFA registration forms with military-level encryption.
                </p>

                {/* CTA Button */}
                <Button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 pointer-events-none">
                  <div className="flex items-center justify-center gap-2">
                    TRY DEMO
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
                  FIFA COMPLIANCE
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6 group-hover:text-gray-700 transition-colors duration-300">
                  World Cup-standard automated compliance checks, training compensation calculations, and solidarity mechanism management with real-time FIFA integration.
                </p>

                {/* CTA Button */}
                <Button className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 pointer-events-none">
                  <div className="flex items-center justify-center gap-2">
                    TRY DEMO
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
              <span className="text-white font-bold text-sm tracking-wide">CHAMPIONSHIP BENEFITS</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#001a33] mb-16">
              WHY CHOOSE
              <span className="block bg-gradient-to-r from-[#005391] to-[#0066b3] bg-clip-text text-transparent">
                GFARP PLATFORM
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
                FIFA REGISTRATION SIMPLIFIED
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                Streamline FIFA player registration with automated compliance checks and document validation for seamless academy operations.
              </p>
            </div>

            {/* Benefit 2 - Training Compensation */}
            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-4 border-2 border-transparent hover:border-[#005391]/20 overflow-hidden">
              {/* Card Header */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#005391] to-[#0066b3]"></div>
              
              {/* Icon Badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-[#005391]/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <DollarSign className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-black fill-current" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-black text-[#001a33] mb-4 group-hover:text-[#005391] transition-colors duration-300">
                TRAINING COMPENSATION
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                Automated calculation and tracking of training compensation fees for player transfers with complete transparency.
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
                SOLIDARITY MECHANISM
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                Manage solidarity payments and track player development history across multiple academies worldwide.
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
                COMPLIANCE MONITORING
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                Real-time monitoring of FIFA compliance status with automated alerts and comprehensive reporting.
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
                DOCUMENT SECURITY
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                Secure cloud storage for player contracts, medical certificates, and registration documents with encryption.
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
                ANALYTICS DASHBOARD
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                Comprehensive analytics on player registrations, compliance rates, and academy performance metrics.
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
              <span className="text-black font-black text-xs tracking-wide">FIFA MEMBERSHIP TIERS</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-8">
              CHOOSE YOUR
              <span className="block bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                CHAMPIONSHIP LEVEL
              </span>
            </h2>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            
            {/* Basic Tier - Bronze */}
            <div className="group relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-3 border-2 border-transparent hover:border-yellow-400/30 overflow-hidden">
              {/* Tier Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-1.5 rounded-full font-black text-xs tracking-wide shadow-lg">
                  BRONZE TIER
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-6 pt-3">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl group-hover:shadow-amber-600/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#001a33] mb-2">BASIC</h3>
                <div className="text-3xl font-black text-[#001a33] mb-2">
                  $29<span className="text-lg text-gray-600 font-bold">/month</span>
                </div>
                <p className="text-gray-600 font-bold text-sm">Perfect for emerging academies</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {[
                  "Up to 50 players",
                  "5GB cloud storage",
                  "Basic FIFA compliance",
                  "Email support",
                  "Player registration system"
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
                  START BRONZE TIER
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
                  🏆 MOST POPULAR 🏆
                </div>
              </div>

              {/* Tier Badge */}
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-4 py-1.5 rounded-full font-black text-xs tracking-wide shadow-lg mt-6">
                  GOLD TIER
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-5 pt-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-2xl group-hover:shadow-3xl group-hover:shadow-yellow-500/50 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <Trophy className="h-8 w-8 text-black" />
                </div>
                <h3 className="text-2xl font-black text-[#001a33] mb-1">PRO</h3>
                <div className="text-3xl font-black text-[#001a33] mb-1">
                  $79<span className="text-lg text-gray-600 font-bold">/month</span>
                </div>
                <p className="text-gray-600 font-bold text-sm">Ideal for championship academies</p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-5">
                {[
                  "Up to 200 players",
                  "25GB cloud storage",
                  "Advanced FIFA compliance",
                  "Priority support",
                  "Training compensation tracking",
                  "Analytics dashboard"
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
                  START GOLD TIER
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
                  PLATINUM TIER
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-5 pt-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:shadow-xl group-hover:shadow-purple-600/25 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#001a33] mb-1">ELITE</h3>
                <div className="text-3xl font-black text-[#001a33] mb-1">
                  $149<span className="text-lg text-gray-600 font-bold">/month</span>
                </div>
                <p className="text-gray-600 font-bold text-sm">For world-class academies</p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-5">
                {[
                  "Unlimited players",
                  "100GB cloud storage",
                  "Full FIFA compliance suite",
                  "24/7 dedicated support",
                  "Solidarity mechanism management",
                  "Advanced analytics & reporting",
                  "Custom integrations"
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
                  START PLATINUM TIER
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
              All plans include FIFA-compliant security, regular updates, and access to our championship support team.
            </p>
            <Button size="lg" className="text-xl px-12 py-6 rounded-full bg-white/10 hover:bg-white/20 text-white font-black shadow-2xl hover:shadow-white/25 transition-all duration-500 transform hover:scale-110 border-4 border-white/30 hover:border-white/50 backdrop-blur-sm">
              <Link to="/academy-demo" className="flex items-center gap-3">
                <Target className="h-6 w-6" />
                COMPARE ALL FEATURES
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section - FIFA Player Cards Style */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden" id="testimonials">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-500/30 mb-6">
              <Trophy className="w-4 h-4 text-amber-400 mr-2" />
              <span className="text-amber-300 font-semibold text-sm tracking-wide">CHAMPION TESTIMONIALS</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight mb-8">
              <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                WORLD-CLASS ACADEMY
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                SUCCESS STORIES
              </span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Player Card 1 - Marco Rodriguez */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-3xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-blue-500/25">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-xl shadow-lg">
                        MR
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-black text-white text-lg">Marco Rodriguez</h4>
                      <p className="text-blue-300 text-sm font-semibold">Director</p>
                      <p className="text-blue-400/80 text-xs">Barcelona Youth Academy</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-black text-2xl">95</div>
                    <div className="text-amber-300 text-xs font-semibold">RATING</div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <div className="text-center">
                    <div className="text-green-400 font-black text-lg">300+</div>
                    <div className="text-slate-400 text-xs">PLAYERS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-black text-lg">5★</div>
                    <div className="text-slate-400 text-xs">RATING</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-400 font-black text-lg">2Y</div>
                    <div className="text-slate-400 text-xs">USING</div>
                  </div>
                </div>
                
                {/* Quote */}
                <div className="relative">
                  <div className="absolute -top-2 -left-2 text-blue-500/30 text-3xl font-black">"</div>
                  <p className="text-slate-300 text-sm leading-relaxed italic pl-6">
                    GFARP has revolutionized how we handle FIFA registrations for our 300+ players. What used to take our staff weeks now takes hours. The compliance monitoring has saved us from potential FIFA sanctions.
                  </p>
                </div>
                
                {/* Achievement Badge */}
                <div className="mt-6 inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
                  <CheckCircle className="w-3 h-3 text-green-400 mr-2" />
                  <span className="text-green-300 text-xs font-semibold">FIFA COMPLIANT</span>
                </div>
              </div>
            </div>
            
            {/* Player Card 2 - James Smith */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-orange-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-3xl border border-red-500/30 hover:border-red-400/50 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-red-500/25">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-black text-xl shadow-lg">
                        JS
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-black text-white text-lg">James Smith</h4>
                      <p className="text-red-300 text-sm font-semibold">Academy Manager</p>
                      <p className="text-red-400/80 text-xs">Manchester United Academy</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-black text-2xl">98</div>
                    <div className="text-amber-300 text-xs font-semibold">RATING</div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <div className="text-center">
                    <div className="text-green-400 font-black text-lg">450+</div>
                    <div className="text-slate-400 text-xs">PLAYERS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-black text-lg">5★</div>
                    <div className="text-slate-400 text-xs">RATING</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-400 font-black text-lg">3Y</div>
                    <div className="text-slate-400 text-xs">USING</div>
                  </div>
                </div>
                
                {/* Quote */}
                <div className="relative">
                  <div className="absolute -top-2 -left-2 text-red-500/30 text-3xl font-black">"</div>
                  <p className="text-slate-300 text-sm leading-relaxed italic pl-6">
                    The training compensation tracking feature has been a game-changer. We can now accurately calculate and manage solidarity payments, ensuring we're fully compliant with FIFA regulations while maximizing our revenue.
                  </p>
                </div>
                
                {/* Achievement Badge */}
                <div className="mt-6 inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-500/30">
                  <DollarSign className="w-3 h-3 text-blue-400 mr-2" />
                  <span className="text-blue-300 text-xs font-semibold">REVENUE OPTIMIZED</span>
                </div>
              </div>
            </div>
            
            {/* Player Card 3 - Andrea Lopez */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm p-8 rounded-3xl border border-purple-500/30 hover:border-purple-400/50 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-purple-500/25">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-black text-xl shadow-lg">
                        AL
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-black text-white text-lg">Andrea Lopez</h4>
                      <p className="text-purple-300 text-sm font-semibold">Operations Director</p>
                      <p className="text-purple-400/80 text-xs">Real Madrid Academy</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-black text-2xl">96</div>
                    <div className="text-amber-300 text-xs font-semibold">RATING</div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <div className="text-center">
                    <div className="text-green-400 font-black text-lg">500+</div>
                    <div className="text-slate-400 text-xs">PLAYERS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-black text-lg">4★</div>
                    <div className="text-slate-400 text-xs">RATING</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-400 font-black text-lg">1Y</div>
                    <div className="text-slate-400 text-xs">USING</div>
                  </div>
                </div>
                
                {/* Quote */}
                <div className="relative">
                  <div className="absolute -top-2 -left-2 text-purple-500/30 text-3xl font-black">"</div>
                  <p className="text-slate-300 text-sm leading-relaxed italic pl-6">
                    As one of the world's largest academies, we needed a robust solution that could scale. GFARP's Elite plan handles our 500+ players effortlessly, and the analytics help us make data-driven decisions about our youth development program.
                  </p>
                </div>
                
                {/* Achievement Badge */}
                <div className="mt-6 inline-flex items-center px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30">
                  <BarChart3 className="w-3 h-3 text-purple-400 mr-2" />
                  <span className="text-purple-300 text-xs font-semibold">ELITE SCALE</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Call to Action */}
          <div className="text-center mt-16">
            <Link to="/academy-registration">
              <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-black px-8 py-4 rounded-2xl text-lg shadow-lg hover:shadow-xl hover:shadow-amber-500/25 transition-all duration-300 group">
                <Trophy className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                JOIN THE CHAMPIONS
              </Button>
            </Link>
          </div>
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
                <h3 className="text-2xl font-black text-white">GFARP</h3>
                <p className="text-xs text-blue-200 font-bold tracking-wide">Global Football Academy Platform</p>
              </div>
            </div>
            <p className="text-slate-400 max-w-2xl mx-auto">Join the world's most trusted FIFA registration platform used by elite academies worldwide</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* About GFARP */}
            <div className="bg-blue-900/30 p-6 rounded-2xl border border-blue-800/50">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-blue-400" />
                <h4 className="text-lg font-bold text-blue-300">ABOUT GFARP</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li><a href="#" className="hover:text-blue-300 transition-colors flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>About GFARP</span>
                </a></li>
                <li><a href="#" className="hover:text-blue-300 transition-colors flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Our Mission</span>
                </a></li>
                <li><a href="#" className="hover:text-blue-300 transition-colors flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>FIFA Compliance</span>
                </a></li>
              </ul>
            </div>

            {/* Academy Services */}
            <div className="bg-green-900/30 p-6 rounded-2xl border border-green-800/50">
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="h-5 w-5 text-green-400" />
                <h4 className="text-lg font-bold text-green-300">ACADEMY SERVICES</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li><a href="#" className="hover:text-green-300 transition-colors flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Player Registration</span>
                </a></li>
                <li><a href="#" className="hover:text-green-300 transition-colors flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Document Management</span>
                </a></li>
                <li><a href="#" className="hover:text-green-300 transition-colors flex items-center space-x-2">
                  <Award className="h-4 w-4" />
                  <span>Training Compensation</span>
                </a></li>
              </ul>
            </div>

            {/* Legal & Policies */}
            <div className="bg-purple-900/30 p-6 rounded-2xl border border-purple-800/50">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-5 w-5 text-purple-400" />
                <h4 className="text-lg font-bold text-purple-300">LEGAL & POLICIES</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li><a href="#" className="hover:text-purple-300 transition-colors flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Privacy Policy</span>
                </a></li>
                <li><a href="#" className="hover:text-purple-300 transition-colors flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Terms of Service</span>
                </a></li>
                <li><a href="#" className="hover:text-purple-300 transition-colors flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>FIFA Regulations</span>
                </a></li>
              </ul>
            </div>

            {/* Support & Resources */}
            <div className="bg-orange-900/30 p-6 rounded-2xl border border-orange-800/50">
              <div className="flex items-center space-x-2 mb-4">
                <Building className="h-5 w-5 text-orange-400" />
                <h4 className="text-lg font-bold text-orange-300">SUPPORT & RESOURCES</h4>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li><a href="#" className="hover:text-orange-300 transition-colors flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Contact Support</span>
                </a></li>
                <li><a href="#" className="hover:text-orange-300 transition-colors flex items-center space-x-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Help Center</span>
                </a></li>
                <li><a href="#" className="hover:text-orange-300 transition-colors flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>API Documentation</span>
                </a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-center">
            <p className="text-slate-400 text-sm">
              &copy; 2024 GFARP - Global Football Academy Registration Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>


    </div>
  );
}
