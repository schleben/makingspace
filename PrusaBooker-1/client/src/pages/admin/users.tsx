import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Award, Search, Trash2 } from "lucide-react";

export default function AdminUsers() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCredential, setSelectedCredential] = useState<string>("");
  const [isCredentialDialogOpen, setIsCredentialDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Page access control
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

  // Data queries
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const { data: credentialTypes = [] } = useQuery({
    queryKey: ["/api/credentials/types"],
    retry: false,
  });

  // Mutations
  const addCredentialMutation = useMutation({
    mutationFn: async ({ userId, credentialTypeId }: { userId: string; credentialTypeId: number }) => {
      await apiRequest("POST", "/api/admin/users/credentials", {
        userId,
        credentialTypeId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Credential added successfully",
      });
      setIsCredentialDialogOpen(false);
      setSelectedCredential("");
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to add credential",
        variant: "destructive",
      });
    },
  });

  const removeCredentialMutation = useMutation({
    mutationFn: async ({ userId, credentialTypeId }: { userId: string; credentialTypeId: number }) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}/credentials/${credentialTypeId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Credential removed successfully",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to remove credential",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search term
  const filteredUsers = users.filter((user: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower)
    );
  });

  const handleAddCredential = () => {
    if (!selectedCredential || !selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a credential type",
        variant: "destructive",
      });
      return;
    }

    addCredentialMutation.mutate({
      userId: selectedUserId,
      credentialTypeId: parseInt(selectedCredential)
    });
  };

  if (isLoading || usersLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="User Management" 
        subtitle="Manage users and their credentials"
        action={
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        }
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <CardTitle>System Users</CardTitle>
              </div>
              <Badge variant="secondary">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <CardDescription>
              Manage user accounts and credentials across the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "No users match your search criteria" : "No users have been imported yet"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userItem: any) => (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {(userItem.firstName?.[0] || userItem.email?.[0] || '?').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {userItem.firstName && userItem.lastName 
                                ? `${userItem.firstName} ${userItem.lastName}`
                                : userItem.email?.split('@')[0] || 'Unknown User'
                              }
                            </p>
                            {userItem.isAdmin && (
                              <Badge variant="outline" className="text-xs">Admin</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{userItem.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userItem.credentials?.length > 0 ? (
                            userItem.credentials.map((cred: any) => (
                              <div key={cred.id} className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  {cred.credentialType?.name}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                                  onClick={() => removeCredentialMutation.mutate({
                                    userId: userItem.id,
                                    credentialTypeId: cred.credentialTypeId
                                  })}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No credentials</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(userItem.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Dialog 
                          open={isCredentialDialogOpen && selectedUserId === userItem.id} 
                          onOpenChange={(open) => {
                            setIsCredentialDialogOpen(open);
                            if (open) {
                              setSelectedUserId(userItem.id);
                            } else {
                              setSelectedUserId("");
                              setSelectedCredential("");
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <UserPlus className="w-4 h-4 mr-1" />
                              Add Credential
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Credential</DialogTitle>
                              <DialogDescription>
                                Grant a credential to {userItem.firstName && userItem.lastName 
                                  ? `${userItem.firstName} ${userItem.lastName}`
                                  : userItem.email
                                }
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="grid gap-2">
                                <Label htmlFor="credential">Credential Type</Label>
                                <Select 
                                  value={selectedCredential} 
                                  onValueChange={setSelectedCredential}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select credential type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {credentialTypes
                                      .filter((ct: any) => !userItem.credentials?.some((uc: any) => uc.credentialTypeId === ct.id))
                                      .map((credType: any) => (
                                        <SelectItem key={credType.id} value={credType.id.toString()}>
                                          {credType.name}
                                        </SelectItem>
                                      ))
                                    }
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex gap-3 pt-4">
                                <Button 
                                  variant="outline" 
                                  className="flex-1"
                                  onClick={() => setIsCredentialDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  className="flex-1"
                                  onClick={handleAddCredential}
                                  disabled={addCredentialMutation.isPending || !selectedCredential}
                                >
                                  {addCredentialMutation.isPending ? "Adding..." : "Add Credential"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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