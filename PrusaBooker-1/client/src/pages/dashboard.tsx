import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import PrinterCard from "@/components/printer-card";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: printers = [], isLoading: printersLoading } = useQuery({
    queryKey: ["/api/printers"],
    retry: false,
  });

  const { data: userCredentials = [], isLoading: credentialsLoading } = useQuery({
    queryKey: ["/api/credentials/user"],
    retry: false,
  });

  const { data: credentialTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["/api/credentials/types"],
    retry: false,
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  if (isLoading || printersLoading || credentialsLoading || typesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user has required credentials
  const requiredCredentials = credentialTypes.filter((ct: any) => ct.isRequired);
  const missingCredentials = requiredCredentials.filter((required: any) => 
    !userCredentials.some((uc: any) => uc.credentialTypeId === required.id)
  );

  const unreadNotifications = notifications.filter((n: any) => !n.read);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Dashboard" subtitle="Manage your 3D printing sessions" />
      
      <main className="flex-1 overflow-y-auto p-6">
        {/* Credentials Status Banner */}
        {missingCredentials.length > 0 && (
          <Alert className="mb-6 border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              You need to complete training for: {missingCredentials.map((mc: any) => mc.name).join(", ")}. 
              <Link href="/training" className="font-medium underline ml-1">
                Start training now
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Printer Status Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Printer Availability</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-success rounded-full mr-2"></div>
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-destructive rounded-full mr-2"></div>
                <span className="text-muted-foreground">In Use</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-warning rounded-full mr-2"></div>
                <span className="text-muted-foreground">Maintenance</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {printers.map((printer: any) => (
              <PrinterCard 
                key={printer.id} 
                printer={printer} 
                canBook={missingCredentials.length === 0}
              />
            ))}
          </div>
        </div>



        {/* Training Progress Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-6">Training Progress</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {credentialTypes.map((credentialType: any) => {
              const hasCredential = userCredentials.some((uc: any) => uc.credentialTypeId === credentialType.id);
              
              return (
                <Card key={credentialType.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                          hasCredential ? 'bg-success/10' : 'bg-warning/10'
                        }`}>
                          {hasCredential ? (
                            <CheckCircle className="w-6 h-6 text-success" />
                          ) : (
                            <GraduationCap className="w-6 h-6 text-warning" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">{credentialType.name}</CardTitle>
                          <CardDescription>{credentialType.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={hasCredential ? "default" : "secondary"} className={
                        hasCredential ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"
                      }>
                        {hasCredential ? "Completed" : "Required"}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  {!hasCredential && (
                    <CardContent>
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span>0 of 4 videos</span>
                        </div>
                        <Progress value={0} className="h-2" />
                      </div>
                      
                      <Button 
                        asChild
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Link href="/training">Start Training</Link>
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        {notifications.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-6">Recent Activity</h3>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {notifications.slice(0, 5).map((notification: any) => (
                    <div key={notification.id} className="flex items-center py-3 border-b border-border last:border-b-0">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mr-4">
                        <div className={`w-2 h-2 rounded-full ${
                          notification.type === 'success' ? 'bg-success' :
                          notification.type === 'warning' ? 'bg-warning' :
                          notification.type === 'error' ? 'bg-destructive' : 'bg-primary'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
