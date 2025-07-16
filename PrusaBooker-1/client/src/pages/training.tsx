import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import VideoPlayer from "@/components/video-player";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Play, GraduationCap } from "lucide-react";

export default function Training() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedCredential, setSelectedCredential] = useState<number | null>(null);

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

  const { data: userCredentials = [], isLoading: credentialsLoading } = useQuery({
    queryKey: ["/api/credentials/user"],
    retry: false,
  });

  const { data: credentialTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["/api/credentials/types"],
    retry: false,
  });

  const { data: trainingVideos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["/api/training/videos", selectedCredential],
    enabled: !!selectedCredential,
    retry: false,
  });

  const awardCredentialMutation = useMutation({
    mutationFn: async (credentialTypeId: number) => {
      await apiRequest("POST", "/api/credentials/award", { credentialTypeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials/user"] });
      toast({
        title: "Credential Earned!",
        description: "Congratulations! You've completed the training.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to award credential",
        variant: "destructive",
      });
    },
  });

  if (isLoading || credentialsLoading || typesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading training...</p>
        </div>
      </div>
    );
  }

  const handleCompleteTraining = (credentialTypeId: number) => {
    awardCredentialMutation.mutate(credentialTypeId);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Training" subtitle="Complete training modules to earn credentials" />
      
      <main className="flex-1 overflow-y-auto p-6">
        {selectedCredential ? (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={() => setSelectedCredential(null)}
                className="mb-4"
              >
                ← Back to Training Modules
              </Button>
              
              <VideoPlayer 
                videos={trainingVideos}
                onComplete={() => handleCompleteTraining(selectedCredential)}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {credentialTypes.map((credentialType: any) => {
              const hasCredential = userCredentials.some((uc: any) => uc.credentialTypeId === credentialType.id);
              
              return (
                <Card key={credentialType.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                          hasCredential ? 'bg-success/10' : 'bg-primary/10'
                        }`}>
                          {hasCredential ? (
                            <CheckCircle className="w-6 h-6 text-success" />
                          ) : (
                            <GraduationCap className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{credentialType.name}</CardTitle>
                          <CardDescription>{credentialType.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={hasCredential ? "default" : "secondary"} className={
                        hasCredential ? "bg-success text-success-foreground" : ""
                      }>
                        {hasCredential ? "Completed" : "Available"}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {hasCredential ? (
                      <div className="text-center py-6">
                        <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                        <p className="text-lg font-semibold text-success mb-2">Training Complete!</p>
                        <p className="text-sm text-muted-foreground">
                          You've successfully completed this training module.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-6">
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                            <span>Progress</span>
                            <span>0 of 4 videos</span>
                          </div>
                          <Progress value={0} className="h-2" />
                        </div>
                        
                        <Button 
                          onClick={() => setSelectedCredential(credentialType.id)}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Training
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
