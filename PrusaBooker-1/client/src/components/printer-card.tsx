import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, MapPin, Clock, User, Printer, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const bookingSchema = z.object({
  duration: z.number().min(15, "Minimum duration is 15 minutes").max(480, "Maximum duration is 8 hours"),
  plaConfirmed: z.boolean().refine((val) => val === true, "You must confirm use of PLA plastic"),
});

interface PrinterCardProps {
  printer: {
    id: number;
    name: string;
    model: string;
    location: string;
    status: string;
    lastUsed?: string;
  };
  canBook: boolean;
  currentBooking?: {
    id: number;
    userId: string;
    startTime: string;
    endTime: string;
    status: string;
    printProgress?: number;
    user?: {
      firstName?: string;
      lastName?: string;
      email: string;
    };
  };
}

export default function PrinterCard({ printer, canBook, currentBooking }: PrinterCardProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      duration: 60, // Default 1 hour
      plaConfirmed: false,
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingSchema>) => {
      const now = new Date();
      const endTime = new Date(now.getTime() + data.duration * 60 * 1000);
      
      const payload = {
        printerId: printer.id,
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        duration: data.duration,
        plaConfirmed: data.plaConfirmed,
      };

      console.log("Booking payload:", payload);
      
      return await apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Created",
        description: `Successfully booked ${printer.name}`,
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      const errorMessage = error.message.includes("conflicts") 
        ? "This time slot conflicts with an existing booking"
        : error.message.includes("credential")
        ? "You need to complete required training first"
        : "Failed to create booking";
      
      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof bookingSchema>) => {
    if (!data.plaConfirmed) {
      toast({
        title: "Confirmation Required",
        description: "You must confirm that you are using PLA plastic",
        variant: "destructive",
      });
      return;
    }

    createBookingMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'in_use':
        return 'status-in-use';
      case 'maintenance':
        return 'status-maintenance';
      case 'offline':
        return 'status-offline';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'in_use':
        return 'In Use';
      case 'maintenance':
        return 'Maintenance';
      case 'offline':
        return 'Offline';
      default:
        return status;
    }
  };

  const isBookable = printer.status === 'available' && canBook;



  return (
    <Card className="hover:shadow-md transition-shadow">
      {/* Printer Image Placeholder */}
      <div className="h-32 bg-gradient-to-br from-muted to-muted/50 rounded-t-lg flex items-center justify-center">
        <Printer className="w-12 h-12 text-muted-foreground" />
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{printer.name}</CardTitle>
            <CardDescription>{printer.model}</CardDescription>
          </div>
          <Badge className={getStatusColor(printer.status)}>
            {getStatusText(printer.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Printer Info */}
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{printer.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              {printer.lastUsed 
                ? `Last used: ${new Date(printer.lastUsed).toLocaleString()}`
                : "Never used"
              }
            </span>
          </div>
        </div>

        {/* Current Booking Info */}
        {currentBooking && printer.status === 'in_use' && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <User className="w-4 h-4" />
              <span>
                {currentBooking.user?.firstName && currentBooking.user?.lastName
                  ? `${currentBooking.user.firstName} ${currentBooking.user.lastName}`
                  : currentBooking.user?.email || "Unknown User"
                }
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span>
                Until {new Date(currentBooking.endTime).toLocaleTimeString()}
              </span>
            </div>

            {currentBooking.printProgress !== undefined && currentBooking.printProgress > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Print Progress</span>
                  <span>{currentBooking.printProgress}%</span>
                </div>
                <Progress value={currentBooking.printProgress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {isBookable ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Book Now
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Book {printer.name}</DialogTitle>
                <DialogDescription>
                  Reserve this printer for your 3D printing session
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Start Time:</strong> Now ({new Date().toLocaleTimeString()})</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Print Duration</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                              <SelectItem value="180">3 hours</SelectItem>
                              <SelectItem value="240">4 hours</SelectItem>
                              <SelectItem value="300">5 hours</SelectItem>
                              <SelectItem value="360">6 hours</SelectItem>
                              <SelectItem value="420">7 hours</SelectItem>
                              <SelectItem value="480">8 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="plaConfirmed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I confirm that I am using PLA plastic
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Only PLA plastic is allowed for safety reasons
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={createBookingMutation.isPending}
                    >
                      {createBookingMutation.isPending ? "Booking..." : "Book Printer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button 
            className="w-full" 
            disabled
            variant="secondary"
          >
            {!canBook ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Training Required
              </span>
            ) : (
              getStatusText(printer.status)
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
