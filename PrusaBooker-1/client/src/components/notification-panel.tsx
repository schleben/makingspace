import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCircle, AlertTriangle, Info, X, Check } from "lucide-react";

interface NotificationPanelProps {
  children: React.ReactNode;
}

export default function NotificationPanel({ children }: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadNotifications = notifications.filter((n: any) => !n.read);
  const readNotifications = notifications.filter((n: any) => n.read);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error':
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-success bg-success/5';
      case 'warning':
        return 'border-l-warning bg-warning/5';
      case 'error':
        return 'border-l-destructive bg-destructive/5';
      default:
        return 'border-l-primary bg-primary/5';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const NotificationItem = ({ notification }: { notification: any }) => (
    <div
      className={`border-l-4 p-4 transition-colors hover:bg-muted/50 ${getNotificationColor(notification.type)} ${
        !notification.read ? 'bg-opacity-100' : 'bg-opacity-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {getNotificationIcon(notification.type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                {notification.title}
              </p>
              {!notification.read && (
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
              )}
            </div>
            <p className={`text-xs break-words ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTimeAgo(notification.createdAt)}
            </p>
          </div>
        </div>
        
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsRead(notification.id);
            }}
            className="ml-2 h-6 w-6 p-0 hover:bg-background/80"
          >
            <Check className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={panelRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {children}
      </div>

      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-80 max-h-96 shadow-lg border z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              {unreadNotifications.length > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {unreadNotifications.length} new
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No notifications</p>
                <p className="text-xs text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="space-y-0">
                  {/* Unread notifications first */}
                  {unreadNotifications.map((notification: any) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                  
                  {/* Separator if there are both read and unread notifications */}
                  {unreadNotifications.length > 0 && readNotifications.length > 0 && (
                    <div className="border-t border-border mx-4" />
                  )}
                  
                  {/* Read notifications */}
                  {readNotifications.slice(0, 5).map((notification: any) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              </ScrollArea>
            )}

            {notifications.length > 0 && (
              <div className="border-t border-border p-3">
                <Button
                  variant="ghost"
                  className="w-full text-sm text-primary hover:text-primary/90"
                  onClick={() => {
                    // In a real implementation, this would navigate to a full notifications page
                    toast({
                      title: "Coming Soon",
                      description: "Full notifications page is under development",
                    });
                  }}
                >
                  View all notifications
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
