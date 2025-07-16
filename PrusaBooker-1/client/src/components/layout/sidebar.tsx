import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  GraduationCap, 
  Printer, 
  Users, 
  Video,
  Award,
  Box
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "My Bookings", href: "/bookings", icon: Calendar },
  { name: "Training", href: "/training", icon: GraduationCap },
];

const adminNavigation = [
  { name: "Manage Printers", href: "/admin/printers", icon: Printer },
  { name: "Booking Management", href: "/admin/bookings", icon: Calendar },
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "Credential Management", href: "/admin/credentials", icon: Award },
  { name: "Training Content", href: "/admin/training", icon: Video },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow bg-card border-r border-border overflow-y-auto">
        {/* Logo Section */}
        <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-border">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3">
            <Box className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-card-foreground">MakerSpace</h1>
            <p className="text-sm text-muted-foreground">3D Printer Hub</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg group transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-card-foreground hover:bg-muted"
                )}>
                  <item.icon className={cn(
                    "mr-3 w-5 h-5",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-card-foreground"
                  )} />
                  {item.name}
                </a>
              </Link>
            );
          })}

          {/* Admin Section */}
          {user?.isAdmin && (
            <div className="pt-6 mt-6 border-t border-border">
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Admin Controls
              </p>
              
              {adminNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <a className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-lg group transition-colors",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-card-foreground hover:bg-muted"
                    )}>
                      <item.icon className={cn(
                        "mr-3 w-5 h-5",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-card-foreground"
                      )} />
                      {item.name}
                    </a>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Profile Section */}
        <div className="flex-shrink-0 border-t border-border p-4">
          <div className="flex items-center">
            <img 
              className="w-10 h-10 rounded-full object-cover" 
              src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"} 
              alt="User profile" 
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-card-foreground">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.email || "User"
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.isAdmin ? "Admin" : "User"}
              </p>
            </div>
          </div>
          
          <div className="mt-3">
            <button 
              onClick={() => window.location.href = "/api/logout"}
              className="w-full text-left text-sm text-muted-foreground hover:text-card-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
