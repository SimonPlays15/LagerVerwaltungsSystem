import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Warehouse, 
  Shield, 
  QrCode, 
  Users, 
  BarChart3, 
  Package,
  AlertTriangle,
  Building,
  ChevronRight,
  Check
} from 'lucide-react';
import {useAuth} from "@/hooks/useAuth.ts";
import {useEffect} from "react";
import {useToast} from "@/hooks/use-toast.ts";

export default function Landing() {
    const { toast } = useToast();
    const { isAuthenticated, isLoading } = useAuth();
    // Redirect to home if authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            setTimeout(() => {
                window.location.href = "/";
            }, 500);
            return;
        }
    }, [isAuthenticated, isLoading, toast]);
  const features = [
    {
      icon: Package,
      title: 'Artikel-Management',
      description: 'Verwalten Sie Ihre Lagerartikel mit Kategorisierung und detaillierter Beschreibung'
    },
    {
      icon: QrCode,
      title: 'Barcode Scanner',
      description: 'Integrierte Unterstützung für Barcode- und QR-Code-Scanner über USB und Bluetooth'
    },
    {
      icon: Building,
      title: 'Kostenstellen',
      description: 'Zwingend erforderliche Kostenstellen-Zuordnung bei jeder Artikelentnahme'
    },
    {
      icon: Users,
      title: 'Rollen-System',
      description: 'Drei Benutzerrollen: Admin, Projektleiter und Techniker mit spezifischen Berechtigungen'
    },
    {
      icon: BarChart3,
      title: 'Dashboard & Reports',
      description: 'Übersichtliches Dashboard mit Statistiken und Lagerbestand-Analysen'
    },
    {
      icon: Shield,
      title: 'CITRIX Ready',
      description: 'Optimiert für den Einsatz in CITRIX-Umgebungen mit zentraler Datenbank'
    }
  ];

  const categories = [
    {
      code: 'BMA',
      name: 'Brandmeldetechnik',
      description: 'Zentrale, Komponente, Zubehör',
      icon: AlertTriangle,
      color: 'bg-destructive'
    },
    {
      code: 'EMA', 
      name: 'Einbruchmeldetechnik',
      description: 'Zentrale, Sensoren, Kameras',
      icon: Shield,
      color: 'bg-chart-2'
    }
  ];

  const roles = [
    {
      name: 'Administrator',
      permissions: [
        'Vollzugriff auf alle Funktionen',
        'Benutzer verwalten',
        'System konfigurieren'
      ],
      color: 'text-destructive'
    },
    {
      name: 'Projektleiter',
      permissions: [
        'Artikel verwalten',
        'Kostenstellen verwalten',
        'Erweiterte Reports'
      ],
      color: 'text-chart-4'
    },
    {
      name: 'Techniker',
      permissions: [
        'Artikel ein- und ausbuchen',
        'Scanner verwenden',
        'Bestand einsehen'
      ],
      color: 'text-chart-2'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Warehouse className="text-primary-foreground" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">LagerVerwaltung Pro</h1>
                <p className="text-sm text-muted-foreground">Professional Warehouse Management</p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-login"
            >
              Anmelden
              <ChevronRight className="ml-2" size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-chart-2/5">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-foreground mb-6">
              Professionelle Lagerverwaltung für Ihre Sicherheitstechnik
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Verwalten Sie Ihre BMA- und EMA-Komponenten effizient mit unserem 
              umfassenden Warehouse Management System. Optimiert für CITRIX-Umgebungen.
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/login'}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-get-started"
              >
                Jetzt starten
                <ChevronRight className="ml-2" size={16} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Alles was Sie für Ihre Lagerverwaltung benötigen
            </h3>
            <p className="text-lg text-muted-foreground">
              Moderne Funktionen für eine effiziente Bestandsverwaltung
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="text-primary-foreground" size={24} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Spezialisiert auf Sicherheitstechnik
            </h3>
            <p className="text-lg text-muted-foreground">
              Vorkonfigurierte Kategorien für Ihre spezifischen Anforderungen
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {categories.map((category, index) => (
              <Card key={index} className="shadow-sm">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-16 h-16 ${category.color} rounded-lg flex items-center justify-center`}>
                      <category.icon className="text-white" size={28} />
                    </div>
                    <div>
                      <Badge variant="secondary" className="mb-2">{category.code}</Badge>
                      <h4 className="text-xl font-bold text-foreground">{category.name}</h4>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{category.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Rollen-basierte Berechtigungen
            </h3>
            <p className="text-lg text-muted-foreground">
              Drei Benutzerrollen für unterschiedliche Anforderungen
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {roles.map((role, index) => (
              <Card key={index} className="shadow-sm">
                <CardHeader>
                  <CardTitle className={`text-lg ${role.color}`}>{role.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {role.permissions.map((permission, permIndex) => (
                      <li key={permIndex} className="flex items-start space-x-2">
                        <Check className="text-chart-2 mt-0.5 flex-shrink-0" size={16} />
                        <span className="text-sm text-muted-foreground">{permission}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-3xl font-bold text-primary-foreground mb-4">
              Bereit für die moderne Lagerverwaltung?
            </h3>
            <p className="text-lg text-primary-foreground/90 mb-8">
              Starten Sie jetzt mit LagerVerwaltung Pro und optimieren Sie Ihre Arbeitsabläufe.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => window.location.href = '/login'}
              data-testid="button-start-now"
            >
              Jetzt anmelden
              <ChevronRight className="ml-2" size={16} />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Warehouse className="text-primary-foreground" size={16} />
              </div>
              <span className="font-medium text-foreground">LagerVerwaltung Pro</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Professional Warehouse Management System
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
