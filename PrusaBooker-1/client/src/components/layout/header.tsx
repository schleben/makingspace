import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import NotificationPanel from "@/components/notification-panel";
import { QrCode, Bell, Settings, User } from "lucide-react";
import { Link, useLocation } from "wouter";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;
  
  // Check if user is admin (from backend)
  const isAdmin = user?.isAdmin;
  const isAdminRoute = location.startsWith("/admin");

  const toggleDashboard = () => {
    if (isAdminRoute) {
      setLocation("/");
    } else {
      setLocation("/admin/printers");
    }
  };

  return (
    <div className="bg-card shadow-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <NotificationPanel>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </NotificationPanel>

          {/* Admin Toggle Button - Only show for admin users */}
          {isAdmin && (
            <Button 
              variant={isAdminRoute ? "default" : "outline"} 
              size="sm"
              onClick={toggleDashboard}
              className="flex items-center gap-2"
            >
              {isAdminRoute ? <User className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {isAdminRoute ? "User View" : "Admin"}
              </span>
            </Button>
          )}

          {/* Quick Scan Button - Hide on admin routes */}
          {!isAdminRoute && (
            <Button asChild className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              <Link href="/scan-qr">
                <QrCode className="w-4 h-4 mr-2" />
                Quick Scan
              </Link>
            </Button>
          )}

          {/* Custom Action */}
          {action}
        </div>
      </div>
    </div>
  );
}
