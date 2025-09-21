import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Warehouse, Eye, EyeOff, Shield } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Fehler",
        description: "Die neuen Passwörter stimmen nicht überein.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword.length < 8) {
      toast({
        title: "Fehler",
        description: "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
        variant: "destructive",
      });
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast({
        title: "Fehler",
        description: "Das neue Passwort muss sich vom aktuellen unterscheiden.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });
      
      // Invalidate auth query to refetch user data (reset forcePasswordChange flag)
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Passwort erfolgreich geändert",
        description: "Ihr neues Passwort ist jetzt aktiv.",
      });
      
      // Redirect to home
      setLocation('/');
    } catch (error: any) {
      toast({
        title: "Passwort-Änderung fehlgeschlagen",
        description: error.message || "Ein Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Warehouse className="text-primary-foreground" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">LagerVerwaltung Pro</h1>
          <p className="text-muted-foreground">Passwort ändern</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="text-primary" size={20} />
              <CardTitle>Passwort ändern</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Sie müssen Ihr Passwort bei der ersten Anmeldung ändern.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) => updateField('currentPassword', e.target.value)}
                    placeholder="Ihr aktuelles Passwort"
                    required
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('current')}
                    data-testid="button-toggle-current-password"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => updateField('newPassword', e.target.value)}
                    placeholder="Mindestens 8 Zeichen"
                    required
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('new')}
                    data-testid="button-toggle-new-password"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    placeholder="Neues Passwort wiederholen"
                    required
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('confirm')}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-1">Passwort-Anforderungen:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Mindestens 8 Zeichen lang</li>
                  <li>• Muss sich vom aktuellen Passwort unterscheiden</li>
                  <li>• Beide Passwort-Felder müssen übereinstimmen</li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-change-password"
              >
                {isLoading ? "Passwort wird geändert..." : "Passwort ändern"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}