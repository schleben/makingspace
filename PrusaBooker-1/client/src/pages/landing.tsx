import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Shield, GraduationCap, QrCode } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mr-4">
              <Printer className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">MakerSpace</h1>
              <p className="text-lg text-muted-foreground">3D Printer Hub</p>
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Professional 3D Printing Made Simple
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Access our fleet of Prusa Mini 3D printers with QR code authentication, 
            comprehensive training modules, and seamless booking management.
          </p>
          
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <QrCode className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>QR Code Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Instantly access any printer by scanning its QR code with your mobile device
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="w-12 h-12 text-secondary mx-auto mb-4" />
              <CardTitle>Credential System</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure access control ensuring only trained users operate equipment
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <GraduationCap className="w-12 h-12 text-success mx-auto mb-4" />
              <CardTitle>Video Training</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Complete interactive training modules to earn printer operation credentials
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Printer className="w-12 h-12 text-warning mx-auto mb-4" />
              <CardTitle>Smart Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Reserve printers up to 24 hours in advance with conflict prevention
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="bg-card rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-card-foreground mb-8">
            Trusted by Makers Worldwide
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">4</div>
              <div className="text-muted-foreground">Prusa Mini Printers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondary mb-2">24/7</div>
              <div className="text-muted-foreground">Access Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-success mb-2">100%</div>
              <div className="text-muted-foreground">Safety Trained Users</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
