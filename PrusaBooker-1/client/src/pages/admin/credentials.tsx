import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Award, Upload } from "lucide-react";

export default function AdminCredentials() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [newCredential, setNewCredential] = useState({
    name: "",
    description: "",
    isRequired: true
  });

  // Page-level auth check
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

    if (!isLoading && isAuthenticated && !user?.isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin access required for this page",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: credentialTypes = [], isLoading: credentialsLoading } = useQuery({
    queryKey: ["/api/credentials/types"],
    retry: false,
  });

  const createCredentialMutation = useMutation({
    mutationFn: async (credentialData: any) => {
      await apiRequest("/api/credentials/types", {
        method: "POST",
        body: JSON.stringify(credentialData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credential type created successfully",
      });
      setIsDialogOpen(false);
      setNewCredential({ name: "", description: "", isRequired: true });
      queryClient.invalidateQueries({ queryKey: ["/api/credentials/types"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create credential type",
        variant: "destructive",
      });
    },
  });

  const uploadUsersMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await fetch('/api/admin/import-users', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Imported ${data.imported} users successfully`,
      });
      setCsvFile(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to import users",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="text-center p-6">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateCredential = () => {
    if (!newCredential.name.trim()) {
      toast({
        title: "Error",
        description: "Credential name is required",
        variant: "destructive",
      });
      return;
    }

    createCredentialMutation.mutate(newCredential);
  };

  const handleFileUpload = () => {
    if (!csvFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    uploadUsersMutation.mutate(csvFile);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Credential Management" 
        subtitle="Manage credential types and import users"
        action={
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Credential Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Credential Type</DialogTitle>
                  <DialogDescription>
                    Add a new credential type for user certification
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newCredential.name}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., 3D Printing Basics"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newCredential.description}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this credential covers..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={newCredential.isRequired}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, isRequired: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="required">Required for printer access</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateCredential}
                    disabled={createCredentialMutation.isPending}
                  >
                    {createCredentialMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* User Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="csvFile">CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with columns: firstName, lastName, email, orientation, 3dPrintingBasics
              </p>
            </div>
            <Button 
              onClick={handleFileUpload}
              disabled={!csvFile || uploadUsersMutation.isPending}
              className="w-full"
            >
              {uploadUsersMutation.isPending ? "Importing..." : "Import Users"}
            </Button>
          </CardContent>
        </Card>

        {/* Credential Types Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Credential Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {credentialsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading credentials...</p>
              </div>
            ) : credentialTypes.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Credential Types</h3>
                <p className="text-muted-foreground mb-4">Create your first credential type to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credentialTypes.map((credential: any) => (
                    <TableRow key={credential.id}>
                      <TableCell className="font-medium">
                        <Badge variant="secondary">{credential.name}</Badge>
                      </TableCell>
                      <TableCell>{credential.description}</TableCell>
                      <TableCell>
                        <Badge variant={credential.isRequired ? "default" : "secondary"}>
                          {credential.isRequired ? "Required" : "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(credential.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}