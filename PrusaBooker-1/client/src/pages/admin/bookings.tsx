import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Printer, User, Filter } from "lucide-react";

export default function AdminBookings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("all");

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

  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings/all"],
    retry: false,
  });

  const { data: printers = [], isLoading: printersLoading } = useQuery({
    queryKey: ["/api/printers"],
    retry: false,
  });

  if (isLoading || !isAuthenticated || !user?.isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Filter bookings for the selected date and printer
  const filteredBookings = allBookings.filter((booking: any) => {
    const bookingDate = new Date(booking.startTime).toISOString().split('T')[0];
    const matchesDate = bookingDate === selectedDate;
    const matchesPrinter = selectedPrinter === "all" || booking.printerId.toString() === selectedPrinter;
    return matchesDate && matchesPrinter;
  });

  // Get unique time slots for the grid
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);
  
  // Group bookings by printer
  const bookingsByPrinter = filteredBookings.reduce((acc: any, booking: any) => {
    if (!acc[booking.printerId]) {
      acc[booking.printerId] = [];
    }
    acc[booking.printerId].push(booking);
    return acc;
  }, {});

  // Filter printers to show
  const displayPrinters = selectedPrinter === "all" 
    ? printers 
    : printers.filter((p: any) => p.id.toString() === selectedPrinter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBookingPosition = (booking: any) => {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    return {
      left: `${(startHour / 24) * 100}%`,
      width: `${(duration / 24) * 100}%`,
    };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Booking Management" 
        subtitle="Gantt chart view of all printer bookings"
        action={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-border rounded-md text-sm"
              />
            </div>
            <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by printer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Printers</SelectItem>
                {printers.map((printer: any) => (
                  <SelectItem key={printer.id} value={printer.id.toString()}>
                    {printer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {bookingsLoading || printersLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading bookings...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Time Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Bookings for {new Date(selectedDate).toLocaleDateString()}
                </CardTitle>
                <CardDescription>
                  {filteredBookings.length} booking(s) found
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Gantt Chart */}
            <Card>
              <CardContent className="p-6">
                {/* Time Scale */}
                <div className="relative mb-6">
                  <div className="flex justify-between text-xs text-muted-foreground border-b border-border pb-2">
                    {timeSlots.map(hour => (
                      <div key={hour} className="flex-1 text-center">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                </div>

                {/* Printer Rows */}
                <div className="space-y-4">
                  {displayPrinters.length === 0 ? (
                    <div className="text-center py-8">
                      <Printer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No printers available</p>
                    </div>
                  ) : (
                    displayPrinters.map((printer: any) => (
                      <div key={printer.id} className="relative">
                        {/* Printer Label */}
                        <div className="flex items-center mb-2">
                          <div className="w-32 flex-shrink-0">
                            <div className="font-medium text-sm">{printer.name}</div>
                            <div className="text-xs text-muted-foreground">{printer.model}</div>
                          </div>
                        </div>

                        {/* Timeline Row */}
                        <div className="relative h-16 bg-muted/20 rounded-lg border border-border ml-32">
                          {/* Hour Grid Lines */}
                          {timeSlots.map(hour => (
                            <div
                              key={hour}
                              className="absolute top-0 bottom-0 border-l border-border/30"
                              style={{ left: `${(hour / 24) * 100}%` }}
                            />
                          ))}

                          {/* Bookings */}
                          {(bookingsByPrinter[printer.id] || []).map((booking: any) => {
                            const position = getBookingPosition(booking);
                            return (
                              <div
                                key={booking.id}
                                className={`absolute top-1 bottom-1 rounded px-2 py-1 text-xs font-medium border ${getStatusColor(booking.status)}`}
                                style={position}
                                title={`${booking.user?.firstName || 'User'} ${booking.user?.lastName || ''} - ${new Date(booking.startTime).toLocaleTimeString()} to ${new Date(booking.endTime).toLocaleTimeString()}`}
                              >
                                <div className="truncate">
                                  <User className="w-3 h-3 inline mr-1" />
                                  {booking.user?.firstName || 'User'}
                                </div>
                                <div className="text-xs opacity-75">
                                  {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-6 text-sm">
                    <span className="font-medium">Status:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
                      <span>Scheduled</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
                      <span>Active</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div>
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                      <span>Cancelled</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Details */}
            {filteredBookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Booking Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredBookings.map((booking: any) => (
                      <div key={booking.id} className="p-4 border border-border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {booking.user?.firstName || 'Unknown'} {booking.user?.lastName || 'User'} 
                              <span className="text-muted-foreground ml-2">#{booking.id}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Printer: {printers.find((p: any) => p.id === booking.printerId)?.name || `Printer ${booking.printerId}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(booking.startTime).toLocaleTimeString()} - {new Date(booking.endTime).toLocaleTimeString()} 
                              ({booking.duration} minutes)
                            </div>
                          </div>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}