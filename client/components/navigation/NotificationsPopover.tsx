import React, { useState, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: string;
    userNotificationId: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    category: string;
    actionUrl?: string;
    read: boolean;
    createdAt: string;
}

export function NotificationsPopover() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // Get userId from storage
            const storage = JSON.parse(localStorage.getItem('football-auth-storage') || '{}');
            const userId = storage?.state?.user?.id;

            if (!userId) return;

            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${apiUrl}/notifications/list?userId=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
                }
            });
            const result = await response.json();
            
            if (result.success) {
                setNotifications(result.data);
                setUnreadCount(result.data.filter((n: Notification) => !n.read).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Optional: Poll every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (userNotificationId: string) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            await fetch(`${apiUrl}/notifications/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
                },
                body: JSON.stringify({ userNotificationId })
            });

            // Update local state
            setNotifications(prev => prev.map(n => 
                n.userNotificationId === userNotificationId ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {unreadCount} New
                        </Badge>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <div 
                                    key={notification.id} 
                                    className={`flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    onClick={() => !notification.read && markAsRead(notification.userNotificationId)}
                                >
                                    <div className="mt-1">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                    {!notification.read && (
                                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
