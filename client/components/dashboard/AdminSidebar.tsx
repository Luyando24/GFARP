import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building, 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3, 
  Shield, 
  Database,
  Bell,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navigationGroups = [
  {
    title: 'General',
    items: [
      {
        title: 'Dashboard',
        href: '/admin',
        icon: BarChart3,
        description: 'Overview and analytics'
      },
      {
        title: 'Notifications',
        href: '/admin/notifications',
        icon: Bell,
        description: 'System notifications'
      },
    ]
  },
  {
    title: 'Management',
    items: [
      {
        title: 'Subscriptions',
        href: '/admin/subscriptions',
        icon: CreditCard,
        description: 'Billing and plans'
      },
      {
        title: 'Super Admins',
        href: '/admin/super-admins',
        icon: Shield,
        description: 'Admin user management'
      },
    ]
  },
  {
    title: 'System',
    items: [
      {
        title: 'System Settings',
        href: '/admin/settings',
        icon: Settings,
        description: 'System configuration'
      },
      {
        title: 'Database',
        href: '/admin/database',
        icon: Database,
        description: 'Database management'
      },
      {
        title: 'Support',
        href: '/admin/support',
        icon: HelpCircle,
        description: 'Help and support'
      },
    ]
  }
];

export default function AdminSidebar({ collapsed = false, onToggle, mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const location = useLocation();
  const { dir } = useTranslation();

  return (
    <div className={cn(
      "fixed inset-y-0 z-50 flex h-[100dvh] w-64 flex-col bg-card transition-transform duration-300 lg:static lg:z-auto lg:h-full lg:translate-x-0",
      dir === 'rtl' ? "right-0 border-l" : "left-0 border-r",
      mobileOpen ? "translate-x-0" : dir === 'rtl' ? "translate-x-full" : "-translate-x-full",
      collapsed ? "lg:w-16" : "lg:w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className={cn("flex items-center gap-2", collapsed && "lg:hidden")}>
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Admin Panel</span>
        </div>
        {onMobileClose && (
          <Button variant="ghost" size="icon" onClick={onMobileClose} className="h-8 w-8 lg:hidden" aria-label="Close navigation">
            <X className="h-4 w-4" />
          </Button>
        )}
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="hidden h-8 w-8 lg:inline-flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-6 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className={cn("px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2", collapsed && "lg:hidden")}>
                {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || 
                                (item.href !== '/admin' && location.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                      collapsed && "lg:justify-center lg:px-2"
                    )}
                    title={collapsed ? item.title : undefined}
                    onClick={onMobileClose}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div className={cn("flex flex-col", collapsed && "lg:hidden")}>
                        <span>{item.title}</span>
                        <span className="text-xs opacity-70 leading-tight">{item.description}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className={cn("text-xs text-muted-foreground", collapsed && "lg:hidden")}>
            <p>Soccer Circular Admin v1.0</p>
            <p>System Management</p>
        </div>
      </div>
    </div>
  );
}
