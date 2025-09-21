import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Warehouse, Eye, EyeOff, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/login", { email, password });

      // Invalidate auth query to refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Erfolgreich angemeldet",
        description: "Willkommen zurück!",
      });

      // Redirect to home
      setLocation("/");
    } catch (error: any) {
      // Clear password field after failed login for security
      setPassword("");
      
      // Handle different error types for better user feedback
      const errorMessage = error.message || "Ungültige E-Mail oder Passwort.";
      const isAccountLocked = errorMessage.toLowerCase().includes("locked");
      
      toast({
        title: isAccountLocked ? "Account temporär gesperrt" : "Anmeldung fehlgeschlagen",
        description: isAccountLocked 
          ? "Ihr Account wurde nach mehreren fehlgeschlagenen Anmeldeversuchen vorübergehend gesperrt. Bitte versuchen Sie es in 30 Minuten erneut."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Warehouse className="text-primary-foreground" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            LagerVerwaltung Pro
          </h1>
          <p className="text-muted-foreground">Anmelden um fortzufahren</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Anmelden</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre.email@firma.de"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ihr Passwort"
                    required
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Anmelden..." : "Anmelden"}
              </Button>
            </form>

            {/* Development hint */
            process.env.NODE_ENV === "development" && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <UserPlus size={16} />
                            <span>Entwicklung: admin@example.com</span>
                            <span className="mx-2">|</span>
                            <span>Passwort: admin123</span>
                        </div>
                    </div>
                )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
