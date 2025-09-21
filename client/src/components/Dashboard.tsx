import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Building,
  QrCode,
  Minus,
  Plus,
  PlusCircle,
  ArrowRight,
  ShoppingCart,
  Camera,
  Video,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useScanner } from "@/hooks/useScanner";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const {
    startScanning,
    stopScanning,
    isScanning,
    error: scannerError,
  } = useScanner();

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    isError: isStatsError,
  } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  useEffect(() => {
    if (isStatsError && statsError) {
      if (isUnauthorizedError(statsError)) {
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
    }
  }, [isStatsError, statsError, toast]);

  const {
    data: recentMovements,
    isLoading: movementsLoading,
    error: movementsError,
    isError: isMovementsError,
  } = useQuery({
    queryKey: ["/api/dashboard/recent-movements"],
  });

  useEffect(() => {
    if (isMovementsError && movementsError) {
      if (isUnauthorizedError(movementsError)) {
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
    }
  }, [isMovementsError, movementsError, toast]);

  const {
    data: lowStockItems,
    isLoading: lowStockLoading,
    error: lowStockError,
    isError: isLowStockError,
  } = useQuery({
    queryKey: ["/api/dashboard/low-stock"],
  });

  useEffect(() => {
    if (isLowStockError && lowStockError) {
      if (isUnauthorizedError(lowStockError)) {
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
    }
  }, [isLowStockError, lowStockError, toast]);

  const { data: activeCostCenters } = useQuery({
    queryKey: ["/api/cost-centers/active"],
  });

  const handleStartCamera = async () => {
    const videoElement = document.getElementById(
      "scanner-video",
    ) as HTMLVideoElement;
    if (videoElement) {
      await startScanning(videoElement, (result) => {
        console.log("Scanned:", result);
        setScannerOpen(false);
        toast({
          title: "Code gescannt",
          description: `Erkannt: ${result.text}`,
        });
      });
    }
  };

  const statsCards = [
    {
      title: "Gesamtartikel",
      value: stats?.totalArticles || 0,
      icon: Package,
      color: "bg-primary",
      change: "",
      changeLabel: "",
    },
    {
      title: "Niedrige Bestände",
      value: stats?.lowStockCount || 0,
      icon: AlertTriangle,
      color: "bg-destructive",
      change: (stats?.lowStockCount || 0 ) > 0 ? "Aktion erforderlich!" : "",
      changeLabel: "",
    },
    {
      title: "Heutige Bewegungen",
      value: stats?.todayMovements || 0,
      icon: TrendingUp,
      color: "bg-chart-2",
      change: "Ein • Aus",
      changeLabel: "",
    },
    {
      title: "Aktive Kostenstellen",
      value: stats?.activeCostCenters || 0,
      icon: Building,
      color: "bg-chart-4",
      change: "",
      changeLabel: "",
    },
  ];

  const quickActions = [
    {
      title: "Artikel scannen",
      subtitle: "Barcode/QR-Code",
      icon: QrCode,
      color: "bg-primary",
      action: () => setScannerOpen(true),
    },
    {
      title: "Schnellausgabe",
      subtitle: "Artikel entnehmen",
      icon: Minus,
      color: "bg-chart-2",
      action: () => setCheckoutOpen(true),
    },
    {
      title: "Artikel einbuchen",
      subtitle: "Bestand erhöhen",
      icon: Plus,
      color: "bg-chart-1",
      action: () => {},
    },
    {
      title: "Neuer Artikel",
      subtitle: "Artikel erstellen",
      icon: PlusCircle,
      color: "bg-chart-4",
      action: () => {},
    },
  ];

  if (statsLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-4" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p
                    className="text-3xl font-bold text-foreground"
                    data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
                >
                  <stat.icon className="text-white" size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span
                  className={`text-sm font-medium ${stat.title === "Niedrige Bestände" ? "text-destructive" : "text-chart-2"}`}
                >
                  {stat.change}
                </span>
                {stat.changeLabel && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {stat.changeLabel}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activities and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Letzte Aktivitäten</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-view-all-activities"
              >
                Alle anzeigen <ArrowRight className="ml-1" size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {movementsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <Skeleton className="w-2 h-2 rounded-full mt-2" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentMovements?.length ? (
              <div className="space-y-4">
                {recentMovements.map((movement: any) => (
                  <div key={movement.id} className="flex items-start space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        movement.type === "checkin"
                          ? "bg-chart-2"
                          : movement.type === "checkout"
                            ? "bg-primary"
                            : "bg-chart-4"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">
                          {movement.user.firstName || movement.user.lastName
                            ? `${movement.user.firstName || ""} ${movement.user.lastName || ""}`.trim()
                            : movement.user.email?.split("@")[0] || "User"}
                        </span>{" "}
                        hat{" "}
                        <span className="font-medium">
                          {movement.quantity}x {movement.article.name}
                        </span>{" "}
                        {movement.type === "checkout"
                          ? "ausgegeben"
                          : "eingebucht"}
                        {movement.costCenter && (
                          <>
                            {" "}
                            an Kostenstelle{" "}
                            <span className="font-medium text-primary">
                              {movement.costCenter.code}
                            </span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.createdAt).toLocaleDateString(
                          "de-DE",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine Aktivitäten vorhanden
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Schnellaktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  className="w-full justify-start h-auto p-3"
                  onClick={action.action}
                  data-testid={`button-${action.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div
                    className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mr-3`}
                  >
                    <action.icon className="text-white" size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      {action.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {action.subtitle}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {!lowStockLoading && lowStockItems?.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-destructive" size={20} />
                <CardTitle>Niedrige Bestände - Aktion erforderlich</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-view-low-stock-report"
              >
                Vollständigen Bericht anzeigen{" "}
                <ArrowRight className="ml-1" size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Artikel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Kategorie
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Aktueller Bestand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Mindestbestand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Aktion
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {lowStockItems.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {item.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            #{item.articleNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {item.category.name}
                        {item.subCategory ? ` > ${item.subCategory.name}` : ""}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge variant="destructive">
                          {item.inventory?.currentStock || 0} Stück
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {item.minimumStock} Stück
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-order-more-${item.id}`}
                        >
                          <ShoppingCart className="mr-1" size={14} />
                          Nachbestellen
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Scanner Modal */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Artikel Scanner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="scanner-camera rounded-lg p-8 text-center border-2 border-dashed border-primary bg-gradient-to-br from-primary/10 to-primary/5">
              {isScanning ? (
                <video
                  id="scanner-video"
                  className="w-full h-32 object-cover rounded-lg"
                  autoPlay
                  playsInline
                />
              ) : (
                <>
                  <Camera
                    className="mx-auto text-4xl text-primary mb-4"
                    size={48}
                  />
                  <p className="text-sm text-muted-foreground mb-3">
                    Kamera aktivieren für Scanner
                  </p>
                  <Button
                    onClick={handleStartCamera}
                    data-testid="button-start-camera"
                  >
                    <Video className="mr-2" size={16} />
                    Kamera starten
                  </Button>
                </>
              )}
            </div>

            {scannerError && (
              <p className="text-sm text-destructive">{scannerError}</p>
            )}

            <div className="flex space-x-2 text-xs text-muted-foreground">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-chart-2 rounded-full mr-1"></div>
                USB Scanner unterstützt
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-1"></div>
                Bluetooth verfügbar
              </span>
            </div>

            <div>
              <Label htmlFor="manual-input">Oder Artikelnummer eingeben:</Label>
              <Input
                id="manual-input"
                placeholder="z.B. RM-2024-001"
                data-testid="input-manual-article-number"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setScannerOpen(false)}
                data-testid="button-cancel-scanner"
              >
                Abbrechen
              </Button>
              <Button data-testid="button-search-article">
                <QrCode className="mr-1" size={16} />
                Artikel suchen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Artikel Ausgabe</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="checkout-article">Artikel</Label>
              <div className="flex space-x-2">
                <Input
                  id="checkout-article"
                  placeholder="Artikelnummer oder Name"
                  data-testid="input-checkout-article"
                />
                <Button
                  variant="secondary"
                  onClick={() => setScannerOpen(true)}
                  data-testid="button-scan-for-checkout"
                >
                  <QrCode size={16} />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="checkout-quantity">Menge</Label>
              <Input
                id="checkout-quantity"
                type="number"
                min="1"
                placeholder="1"
                data-testid="input-checkout-quantity"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="checkout-cost-center">
                Kostenstelle <span className="text-destructive">*</span>
              </Label>
              <Select>
                <SelectTrigger data-testid="select-cost-center">
                  <SelectValue placeholder="Kostenstelle auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {activeCostCenters?.map((costCenter: any) => (
                    <SelectItem key={costCenter.id} value={costCenter.id}>
                      {costCenter.code} - {costCenter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Ohne Kostenstelle kann keine Ausgabe erfolgen
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="checkout-notes">Bemerkung (optional)</Label>
              <Textarea
                id="checkout-notes"
                rows={2}
                placeholder="Zusätzliche Informationen..."
                data-testid="textarea-checkout-notes"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCheckoutOpen(false)}
              data-testid="button-cancel-checkout"
            >
              Abbrechen
            </Button>
            <Button data-testid="button-process-checkout">
              <Minus className="mr-1" size={16} />
              Artikel ausgeben
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
