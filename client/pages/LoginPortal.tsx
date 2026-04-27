import React from "react";
import { Link } from "react-router-dom";
import { Trophy, User, Building2, Building, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import SEO from "@/components/SEO";

export default function LoginPortal() {
  const { t, dir } = useTranslation();

  const portals = [
    {
      id: "player",
      title: "Player Portal",
      description: "For individual players looking to manage their professional profile and connect with academies.",
      icon: User,
      color: "from-green-500 to-emerald-600",
      loginUrl: "/player/login",
      registerUrl: "/player/register",
      features: ["Professional Profile", "Document Management", "Scout Visibility"]
    },
    {
      id: "academy",
      title: "Academy Portal",
      description: "For football academies managing multiple players, compliance, and training compensation.",
      icon: Building2,
      color: "from-[#005391] to-[#0066b3]",
      loginUrl: "/login",
      registerUrl: "/academy-registration",
      features: ["Player Management", "FIFA Compliance", "Team Analytics"]
    },
    {
      id: "agency",
      title: "Agency Portal",
      description: "For talent agencies and scouts managing a portfolio of players across multiple regions.",
      icon: Building,
      color: "from-amber-500 to-orange-600",
      loginUrl: "/agency/login",
      registerUrl: "/agency-registration",
      features: ["Portfolio Management", "Contract Tracking", "Agent Dashboard"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" dir={dir}>
      <SEO title="Login Portal | Soccer Circular" />
      
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-yellow-500 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 left-1/2 w-64 h-64 bg-green-500 rounded-full blur-3xl"></div>
      </div>

      <header className="relative z-10 p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-[#005391] transition-colors font-medium">
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="text-center mb-16 max-w-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-6 transform rotate-3">
            <Trophy className="h-8 w-8 text-[#005391]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight uppercase italic">
            Select Your <span className="text-[#005391]">Portal</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Choose the platform that matches your role in the football ecosystem to access your specialized tools and dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Card key={portal.id} className="group relative overflow-hidden border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${portal.color}`}></div>
                
                <CardHeader className="pt-8">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center mb-4 shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                    {portal.title}
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 font-medium min-h-[60px]">
                    {portal.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-8">
                  <div className="space-y-4 mb-8">
                    {portal.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${portal.color}`}></div>
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button asChild className={`w-full py-6 font-black uppercase tracking-widest bg-gradient-to-r ${portal.color} text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300`}>
                      <Link to={portal.loginUrl}>
                        Login to Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full py-6 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 transition-all duration-300">
                      <Link to={portal.registerUrl}>
                        Register Now
                      </Link>
                    </Button>
                  </div>
                </CardContent>

                {/* Decorative background pattern */}
                <div className="absolute -bottom-8 -right-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                  <Icon size={160} />
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      <footer className="relative z-10 py-12 text-center border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          © 2024 Soccer Circular | Professional talent Management
        </p>
      </footer>
    </div>
  );
}
