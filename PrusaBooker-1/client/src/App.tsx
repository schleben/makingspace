import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";

import Bookings from "@/pages/bookings";
import Training from "@/pages/training";
import AdminPrinters from "@/pages/admin/printers";
import AdminUsers from "@/pages/admin/users";
import AdminCredentials from "@/pages/admin/credentials";
import AdminTrainingContent from "@/pages/admin/training-content";
import AdminBookings from "@/pages/admin/bookings";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="lg:pl-64 flex flex-col flex-1">
              <MobileNav />
              <Switch>
                <Route path="/" component={Dashboard} />

                <Route path="/bookings" component={Bookings} />
                <Route path="/training" component={Training} />
                <Route path="/admin/printers" component={AdminPrinters} />
                <Route path="/admin/users" component={AdminUsers} />
                <Route path="/admin/credentials" component={AdminCredentials} />
                <Route path="/admin/training" component={AdminTrainingContent} />
                <Route path="/admin/bookings" component={AdminBookings} />
                <Route component={NotFound} />
              </Switch>
            </div>
          </div>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
