import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {useLocation} from "wouter";
import {
    Package,
    AlertTriangle,
    TrendingUp,
    Building,
    QrCode,
    Minus,
    Plus,
    ArrowRight,
    ShoppingCart,
    Camera,
} from "lucide-react";
import {useState, useEffect, useRef} from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
    Dialog,
    DialogContent, DialogDescription,
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
import {z} from "zod"
import {zodResolver} from "@hookform/resolvers/zod";
import {insertStockMovementSchema} from "@shared/schema.ts";
import {useForm} from "react-hook-form";
import {apiRequest} from "@/lib/queryClient.ts";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form.tsx";

const [location] = useLocation();

const stockMovementFormSchema = insertStockMovementSchema.omit({
    userId: true
}).extend({
    articleNumber: z.string().min(1, "Artikelnummer darf nicht leer sein"),
    quantity: z.number().min(1, "Menge darf nicht leer sein"),
})

type StockMovementFormData = z.infer<typeof stockMovementFormSchema>

export default function Dashboard() {
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [checkinOpen, setCheckInOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<any>(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannedResult, setScannedResult] = useState<{
        text: string;
        format: string;
    } | null>(null);
    const [lastScannedCode, setLastScannedCode] = useState<string>("");
    const [lastScannedTime, setLastScannedTime] = useState<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);
  const {
    startScanning,
    stopScanning,
    isScanning,
    error: scannerError,
  } = useScanner();
    const queryClient = useQueryClient();
    const checkInForm = useForm<StockMovementFormData>({
        resolver: zodResolver(stockMovementFormSchema),
        defaultValues: {
            type: "checkin",
            quantity: 1,
            articleNumber: "",
            articleId: "",
            notes: ""
        }
    })

    const checkOutForm = useForm<StockMovementFormData>({
        resolver: zodResolver(stockMovementFormSchema),
        defaultValues: {
            type: "checkout",
            quantity: 1,
            articleNumber: "",
            articleId: "",
            costCenterId: "",
            notes: "",
        },
    });

    const {
        data: articles,
        isLoading: articlesLoading,
        error: articlesError,
        isError: isArticlesError
    } = useQuery({
        queryKey: ["/api/articles"],
    })

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    isError: isStatsError,
  } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

    useEffect(() => {
        if (isArticlesError && articlesError) {
            if (isUnauthorizedError(articlesError)) {
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
    }, [articlesError, isArticlesError, toast])

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

    const {data: costCenters} = useQuery({
        queryKey: ["/api/cost-centers"],
    })

    const stockMovementMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest("POST", "/api/stock-movements", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["/api/articles"]});
            queryClient.invalidateQueries({queryKey: ["/api/stock-movements"]});
            queryClient.invalidateQueries({queryKey: ["/api/dashboard/stats"]});
            setCheckInOpen(false);
            setCheckoutOpen(false);
            setSelectedArticle(null);
            checkInForm.reset();
            checkOutForm.reset();
            toast({
                title: "Bewegung erfolgreich",
                description: "Die Lagerbewegung wurde erfolgreich durchgeführt.",
            });
        },
        onError: (error: Error) => {
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
                title: "Fehler",
                description: "Die Lagerbewegung konnte nicht durchgeführt werden.",
                variant: "destructive",
            });
        },
    })

    const findArticleByNumber = async (articleNumber: string) => {
        try {
            const response = await fetch(
                `/api/articles/by-number/${encodeURIComponent(articleNumber)}`,
                {
                    credentials: "include",
                },
            );
            if (response.ok) {
                const article = await response.json();
                setSelectedArticle(article);
                return article;
            }
        } catch (error) {
            console.error("Error finding article:", error);
        }
        return null;
    };

    const handleArticleNumberChange = async (value: string, form: any) => {
        form.setValue("articleNumber", value);
        if (value.trim()) {
            const article = await findArticleByNumber(value.trim());
            if (article) {
                form.setValue("articleId", article.id);
            } else {
                setSelectedArticle(null);
                form.setValue("articleId", "");
            }
        } else {
            setSelectedArticle(null);
            form.setValue("articleId", "");
        }
    };

    const onCheckInSubmit = (data: StockMovementFormData) => {
        try {
            if (!selectedArticle || !data.articleId) {
                toast({
                    title: "Artikel nicht gefunden",
                    description: "Bitte geben Sie eine gültige Artikelnummer ein.",
                    variant: "destructive",
                });
                return;
            }

            stockMovementMutation.mutate({
                articleId: data.articleId,
                type: "checkin",
                quantity: data.quantity,
                notes: data.notes,
            });
        } catch (error) {
            console.error("Error during check-in:", error);
            toast({
                title: "Fehler beim Check-In",
                description: "Es ist ein Fehler beim Check-In aufgetreten. Bitte versuchen Sie es erneut.",
                variant: "destructive",
            });
        }
    }

    const onCheckOutSubmit = (data: StockMovementFormData) => {
        if (!selectedArticle || !data.articleId) {
            toast({
                title: "Artikel nicht gefunden",
                description: "Bitte geben Sie eine gültige Artikelnummer ein.",
                variant: "destructive",
            });
            return;
        }

        if (!data.costCenterId) {
            toast({
                title: "Kostenstelle erforderlich",
                description: "Für die Ausgabe ist eine Kostenstelle erforderlich.",
                variant: "destructive",
            });
            return;
        }

        stockMovementMutation.mutate({
            articleId: data.articleId,
            type: "checkout",
            quantity: data.quantity,
            costCenterId: data.costCenterId,
            notes: data.notes,
        });
    };

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

  const handleStartCamera = async () => {
      if (videoRef.current) {
          try {
              await startScanning(videoRef.current, (result) => {
                  const now = Date.now();
                  // Debounce: only process if it's a different code or enough time has passed (2 seconds)
                  if (result.text !== lastScannedCode || now - lastScannedTime > 2000) {
                      setLastScannedCode(result.text);
                      setLastScannedTime(now);
                      setScannedResult(result);

                      if (checkinOpen)
                          checkInForm.setValue("articleNumber", result.text)
                      if (checkoutOpen)
                          checkOutForm.setValue("articleNumber", result.text)

                      // Automatically stop scanner after successful scan
                      handleStopScanning();
                      setScannerOpen(false);
                  }
              });
          } catch (err) {
              toast({
                  title: "Scanner Fehler",
                  description:
                      "Konnte Kamera nicht starten. Bitte prüfen Sie die Berechtigung.",
                  variant: "destructive",
              });
          }
      } else {
          toast({
              title: "Scanner Fehler",
              description: "Video-Element nicht gefunden.",
              variant: "destructive",
          });
      }
  };

    const handleStopScanning = () => {
        stopScanning();
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
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
        action: () => setCheckInOpen(true),
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
                onClick={() => {
                    window.location.href = "/reports?activeTab=stockmovements";
                }}
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
            {/* Camera View */}
            <div className="flex justify-center">
                <div className="relative">
                    {/* Video element - always rendered but conditionally shown */}
                    <video
                        ref={videoRef}
                        className={`w-80 h-60 object-cover rounded-lg border-2 border-primary ${
                            isScanning ? "block" : "hidden"
                        }`}
                        autoPlay
                        playsInline
                        data-testid="scanner-video"
                    />

                    {/* Scanner overlay - only shown when scanning */}
                    {isScanning && (
                        <div className="absolute inset-0 border-2 border-red-500 rounded-lg pointer-events-none">
                            <div
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-red-500 bg-red-500/10"/>
                        </div>
                    )}

                    {/* Placeholder when not scanning */}
                    {!isScanning && (
                        <div
                            className="w-80 h-60 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-dashed border-primary rounded-lg flex flex-col items-center justify-center">
                            <Camera size={48} className="text-primary mb-4"/>
                            <p className="text-sm text-muted-foreground mb-4">
                                Kamera für Scanner aktivieren
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Scanner Controls */}
            <div className="flex justify-center space-x-4">
                {isScanning ? (
                    <Button
                        variant="outline"
                        onClick={handleStopScanning}
                        data-testid="button-stop-scanner"
                        className="button-modern"
                    >
                        Scanner stoppen
                    </Button>
                ) : (
                    <Button
                        onClick={handleStartCamera}
                        data-testid="button-start-scanner-alt"
                        className="button-modern modern-gradient"
                    >
                        <QrCode className="mr-2" size={16}/>
                        Scanner starten
                    </Button>
                )}
            </div>
            {/* Error Display */}
            {scannerError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{scannerError}</p>
                </div>
            )}

            {/* Scanned Result */}
            {scannedResult && (
                <div className="p-4 bg-chart-2/10 border border-chart-2/20 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">
                        Gescanntes Ergebnis:
                    </h4>
                    <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{scannedResult.format}</Badge>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                            {scannedResult.text}
                        </code>
                    </div>
                </div>
            )}
            {/* Manual Input */}
            <div className="space-y-2">
                <Label htmlFor="manual-input">Oder per USB Scanner eingeben:</Label>
                <div className="flex space-x-2">
                    <Input
                        id="manual-input"
                        value={scannedResult?.text || ""}
                        onChange={(e) => {
                            if (checkinOpen)
                                checkInForm.setValue("articleNumber", e.target.value);
                            if (checkoutOpen) {
                                checkOutForm.setValue("articleNumber", e.target.value);
                            }
                        }}
                        placeholder="Artikelnummer, Barcode oder QR-Code eingeben"
                        data-testid="input-manual-code"
                    />
                </div>
            </div>
            <div className="flex justify-end space--2">
                <Button
                    variant="outline"
                    onClick={() => setScannerOpen(false)}
                    data-testid="button-cancel-scanner"
                >
                    Abbrechen
                </Button>
            </div>
        </DialogContent>
      </Dialog>

        {/* Check In Dialog */}
        <Dialog open={checkinOpen} onOpenChange={setCheckInOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Artikel einbuchen</DialogTitle>
                    <DialogDescription>
                        Buchen Sie einen Artikel ein
                    </DialogDescription>
                </DialogHeader>
                <Form {...checkInForm}>
                    <form
                        onSubmit={async (e) => {
                            // Prevent default just to be explicit (handleSubmit macht das normalerweise)
                            e.preventDefault();

                            // 1) Log aktuelle Formwerte
                            console.log("DEBUG - before submit - form values:", checkInForm.getValues());

                            // 2) explizit triggern, damit wir Validierungsfehler sehen
                            const valid = await checkInForm.trigger();
                            console.log("DEBUG - validation result:", valid);

                            // 3) Falls ungültig: zeige errors in der Konsole
                            if (!valid) {
                                console.warn("DEBUG - validation errors:", checkInForm.formState.errors);
                                toast({
                                    title: "Validierungsfehler",
                                    description: "Bitte prüfen Sie die Eingaben im Formular.",
                                    variant: "destructive",
                                });
                                return;
                            }

                            // 4) Normalen submit durch handleSubmit ausführen (sollte jetzt onCheckInSubmit aufrufen)
                            try {
                                await checkInForm.handleSubmit(onCheckInSubmit)();
                            } catch (error) {
                                console.error("Error during check-in:", error);
                                toast({
                                    title: "Fehler beim Check-In",
                                    description: "Es ist ein Fehler beim Check-In aufgetreten. Bitte versuchen Sie es erneut.",
                                    variant: "destructive",
                                });
                            }
                        }}
                        className="space-y-4"
                    >
                        <FormField
                            control={checkInForm.control}
                            name="articleNumber"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Artikelnummer *</FormLabel>
                                    <div className="flex space-x-2">
                                        <FormControl>
                                            <Input
                                                placeholder="Artikelnummer eingeben oder scannen"
                                                {...field}
                                                onChange={(e) =>
                                                    handleArticleNumberChange(
                                                        e.target.value,
                                                        checkInForm,
                                                    )
                                                }
                                                data-testid="input-checkin-article-number"
                                            />
                                        </FormControl>
                                        <Button type="button" variant="outline" size="icon"
                                                onClick={() => setScannerOpen(true)}>
                                            <QrCode size={16}/>
                                        </Button>
                                    </div>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        {selectedArticle && (
                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium text-foreground">
                                    {selectedArticle.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {selectedArticle.category?.name}
                                </p>
                                <p className="text-sm text-foreground mt-1">
                                    Aktueller Bestand:{" "}
                                    <span className="font-medium">
                      {selectedArticle.inventory?.currentStock || 0} Stück
                    </span>
                                </p>
                            </div>
                        )}

                        <FormField
                            control={checkInForm.control}
                            name="quantity"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Menge *</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="1"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(parseInt(e.target.value) || 1)
                                            }
                                            data-testid="input-checkin-quantity"
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={checkInForm.control}
                            name="notes"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Bemerkung (optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Zusätzliche Informationen..."
                                            rows={2}
                                            {...field}
                                            data-testid="textarea-checkin-notes"
                                            value={field.value}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCheckInOpen(false)}
                                data-testid="button-cancel-checkin"
                            >
                                Abbrechen
                            </Button>
                            <Button
                                type="submit"
                                disabled={stockMovementMutation.isPending || !selectedArticle}
                                className="bg-chart-1 hover:bg-chart-1/90"
                                data-testid="button-submit-checkin"

                            >
                                {stockMovementMutation.isPending
                                    ? "Buche ein..."
                                    : "Einbuchen"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        {/* Check Out Dialog */}
        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Artikel ausgeben</DialogTitle>
                    <DialogDescription>
                        Artikel aus Lager nehmen
                    </DialogDescription>
                </DialogHeader>
                <Form {...checkOutForm}>
                    <form
                        onSubmit={checkOutForm.handleSubmit(onCheckOutSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={checkOutForm.control}
                            name="articleNumber"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Artikelnummer *</FormLabel>
                                    <div className="flex space-x-2">
                                        <FormControl>
                                            <Input
                                                placeholder="Artikelnummer eingeben oder scannen"
                                                {...field}
                                                onChange={(e) =>
                                                    handleArticleNumberChange(
                                                        e.target.value,
                                                        checkOutForm,
                                                    )
                                                }
                                                data-testid="input-checkout-article-number"
                                            />
                                        </FormControl>
                                        <Button type="button" variant="outline" size="icon"
                                                onClick={() => setScannerOpen(true)}>
                                            <QrCode size={16}/>
                                        </Button>
                                    </div>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        {selectedArticle && (
                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium text-foreground">
                                    {selectedArticle.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {selectedArticle.category?.name}
                                </p>
                                <p className="text-sm text-foreground mt-1">
                                    Verfügbar:{" "}
                                    <span className="font-medium text-chart-2">
                      {selectedArticle.inventory?.currentStock || 0} Stück
                    </span>
                                </p>
                            </div>
                        )}

                        <FormField
                            control={checkOutForm.control}
                            name="quantity"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Menge *</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="1"
                                            max={selectedArticle?.inventory?.currentStock || 999}
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(parseInt(e.target.value) || 1)
                                            }
                                            data-testid="input-checkout-quantity"
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={checkOutForm.control}
                            name="costCenterId"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>
                                        Kostenstelle *{" "}
                                        <span className="text-destructive">(Erforderlich)</span>
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger data-testid="select-checkout-cost-center">
                                                <SelectValue placeholder="Kostenstelle auswählen..."/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {costCenters?.map((costCenter: any) => (
                                                <SelectItem key={costCenter.id} value={costCenter.id}>
                                                    {costCenter.code} - {costCenter.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Ohne Kostenstelle kann keine Ausgabe erfolgen
                                    </p>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={checkOutForm.control}
                            name="notes"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Bemerkung (optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Zusätzliche Informationen..."
                                            rows={2}
                                            {...field}
                                            data-testid="textarea-checkout-notes"
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCheckoutOpen(false)}
                                data-testid="button-cancel-checkout"
                            >
                                Abbrechen
                            </Button>
                            <Button
                                type="submit"
                                disabled={stockMovementMutation.isPending || !selectedArticle}
                                className="bg-chart-2 hover:bg-chart-2/90"
                                data-testid="button-submit-checkout"
                            >
                                {stockMovementMutation.isPending ? "Gebe aus..." : "Ausgeben"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
