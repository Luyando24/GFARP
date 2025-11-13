import React from 'react';
import { AlertCircle, Crown, ArrowRight } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

interface SubscriptionNoticeProps {
  title?: string;
  message?: string;
  onUpgradeClick?: () => void;
  onDismiss?: () => void;
  variant?: 'default' | 'compact';
}

export function SubscriptionNotice({
  title = "Subscription Required",
  message = "You've reached your current plan's limit. Upgrade to continue adding players and unlock more features.",
  onUpgradeClick,
  onDismiss,
  variant = 'default'
}: SubscriptionNoticeProps) {
  
  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Default navigation to subscription tab in academy dashboard
      const currentPath = window.location.pathname;
      if (currentPath.includes('/academy-dashboard')) {
        // If already on academy dashboard, scroll to subscription tab
        const subscriptionTab = document.querySelector('[data-value="subscription"]');
        if (subscriptionTab) {
          (subscriptionTab as HTMLElement).click();
        }
      } else {
        // Navigate to academy dashboard with subscription tab
        window.location.href = '/academy-dashboard?tab=subscription';
      }
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex-shrink-0">
          <Crown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {title}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {message}
          </p>
        </div>
        <Button 
          onClick={handleUpgradeClick}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Upgrade
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/20 dark:via-slate-900 dark:to-indigo-950/20">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
              <Crown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {title}
              </CardTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                Upgrade Required
              </Badge>
            </div>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              {message}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleUpgradeClick}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
          >
            <Crown className="mr-2 h-4 w-4" />
            View Subscription Plans
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          {onDismiss && (
            <Button 
              variant="outline" 
              onClick={onDismiss}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/20"
            >
              Maybe Later
            </Button>
          )}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-100 dark:border-blue-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Why upgrade?</p>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• Add unlimited players to your academy</li>
                <li>• Access advanced analytics and reports</li>
                <li>• Get priority customer support</li>
                <li>• Unlock premium features and integrations</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SubscriptionNotice;