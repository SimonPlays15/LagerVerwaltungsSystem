import React, {useEffect, useState} from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Warehouse, Eye, EyeOff, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
    apiRequest("GET", "/api/firstlaunch").then((res) => {
        if(res.status === 308) {
            setTimeout(() => {
                setLocation("/login")
            }, 500)
        }
    });


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    if(password !== confirmPassword) {
        toast({
            title: "Fehler",
            description: "Passwörter stimmen nicht überein.",
            variant: "destructive",
        });
        setPassword("")
        setConfirmPassword("")
        return;
    }

    try {
      await apiRequest("POST", "/api/register", { email, password, firstName, lastName, role: "admin", forcePasswordChange: false });

      // Invalidate auth query to refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Erfolgreich registriert",
        description: "Willkommen!",
      });

      // Redirect to home
      setLocation("/");
    } catch (error: any) {
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      toast({
        title: "Registrierung fehlgeschlagen",
        description: error.message || "Registrierung fehlgeschlagen",
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
            Lager Verwaltung
          </h1>
          <p className="text-muted-foreground">Ersten Admin Benutzer registrieren</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registrieren</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
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
                    type={"password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ihr Passwort"
                    required
                    data-testid="input-password"
                  />
                </div>
              </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmpassword">Passwort wiederholen</Label>
                    <div className="relative">
                        <Input
                            id="confirmpassword"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Ihr Passwort"
                            required
                            data-testid="input-confirmpassword"
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

                <div className="space-y-2">
                    <Label htmlFor="firstname">Vorname</Label>
                    <div className="relative">
                        <Input
                            id="firstname"
                            type={"text"}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Vorname"
                            required
                            data-testid="input-firstname"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lastname">Nachname</Label>
                    <div className="relative">
                        <Input
                            id="lastname"
                            type={"text"}
                            value={firstName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Nachname"
                            required
                            data-testid="input-lastname"
                        />
                    </div>
                </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? "Registrieren..." : "Registrieren"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
