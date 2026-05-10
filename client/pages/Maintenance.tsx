import React from 'react';
import { Shield, Hammer, Clock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MaintenanceProps {
  message?: string;
  endTime?: string;
}

const Maintenance: React.FC<MaintenanceProps> = ({ 
  message = "Soccer Circular is currently undergoing scheduled maintenance. We'll be back shortly!",
  endTime 
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo/Icon */}
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-gradient-to-br from-[#005391] to-[#0066b3] rounded-full flex items-center justify-center shadow-2xl mx-auto">
            <Shield className="h-12 w-12 text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <Hammer className="h-6 w-6 text-[#005391]" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Under Maintenance
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {message}
          </p>
        </div>

        <Card className="border-2 border-yellow-400 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-[#005391] dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Expected Return
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {endTime || "Coming back soon"}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We're currently making some improvements to enhance your experience. 
                Thank you for your patience!
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
          <Button 
            className="w-full sm:w-auto bg-[#005391] hover:bg-[#00447a]"
            onClick={() => window.open('mailto:support@soccercircular.com')}
          >
            Contact Support
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
          <Globe className="h-4 w-4" />
          <p className="text-xs font-medium uppercase tracking-widest">Soccer Circular Global</p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
