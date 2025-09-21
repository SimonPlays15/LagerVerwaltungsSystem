import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useScanner } from "@/hooks/useScanner";
import { useToast } from "@/hooks/use-toast";
import { Camera, Video, QrCode, Search, Package } from "lucide-react";

export default function Scanner() {
  const [manualInput, setManualInput] = useState("");
  const [scannedResult, setScannedResult] = useState<{
    text: string;
    format: string;
  } | null>(null);
  const [foundArticle, setFoundArticle] = useState<any>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [lastScannedTime, setLastScannedTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { startScanning, stopScanning, isScanning, error } = useScanner();
  const { toast } = useToast();

  const lookupArticle = useCallback(
    async (code: string) => {
      try {
        let article = null;
        let authError = false;

        // First try searching by barcode
        try {
          const barcodeResponse = await fetch(
            `/api/articles/by-barcode/${encodeURIComponent(code)}`,
          );
          if (barcodeResponse.status === 401) {
            authError = true;
          } else if (barcodeResponse.ok) {
            article = await barcodeResponse.json();
          }
        } catch (err) {
          // Continue to next search method
        }

        // If not found by barcode, try by article number (unless auth error)
        if (!article && !authError) {
          try {
            const numberResponse = await fetch(
              `/api/articles/by-number/${encodeURIComponent(code)}`,
            );
            if (numberResponse.status === 401) {
              authError = true;
            } else if (numberResponse.ok) {
              article = await numberResponse.json();
            }
          } catch (err) {
            // Continue to error handling
          }
        }

        if (authError) {
          setFoundArticle(null);
          toast({
            title: "Anmeldung erforderlich",
            description: "Bitte melden Sie sich an, um Artikel zu suchen.",
            variant: "destructive",
          });
          // Redirect to login after delay
          setTimeout(() => {
            window.location.href = "/api/login";
          }, 2000);
        } else if (article) {
          setFoundArticle(article);
          toast({
            title: "Artikel gefunden",
            description: `${article.name} (${article.articleNumber}) - Bestand: ${article.stock}`,
          });
        } else {
          setFoundArticle(null);
          toast({
            title: "Artikel nicht gefunden",
            description: `Kein Artikel mit Code: ${code}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        setFoundArticle(null);
        toast({
          title: "Suchfehler",
          description: "Fehler beim Suchen des Artikels",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handleStartScanning = async () => {
    if (videoRef.current) {
      try {
        await startScanning(videoRef.current, (result) => {
          const now = Date.now();
          // Debounce: only process if it's a different code or enough time has passed (2 seconds)
          if (result.text !== lastScannedCode || now - lastScannedTime > 2000) {
            setLastScannedCode(result.text);
            setLastScannedTime(now);
            setScannedResult(result);
            setManualInput(result.text);

            // Automatically lookup the article
            lookupArticle(result.text);

            // Automatically stop scanner after successful scan
            handleStopScanning();
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

  const handleSearch = async () => {
    if (manualInput.trim()) {
      await lookupArticle(manualInput.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <QrCode size={24} />
            <span>Barcode/QR-Code Scanner</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-red-500 bg-red-500/10" />
                </div>
              )}

              {/* Placeholder when not scanning */}
              {!isScanning && (
                <div className="w-80 h-60 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-dashed border-primary rounded-lg flex flex-col items-center justify-center">
                  <Camera size={48} className="text-primary mb-4" />
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
                onClick={handleStartScanning}
                data-testid="button-start-scanner-alt"
                className="button-modern modern-gradient"
              >
                <QrCode className="mr-2" size={16} />
                Scanner starten
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
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

          {/* Found Article Display */}
          {foundArticle && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <h4 className="font-medium text-foreground mb-3 flex items-center">
                <Package className="mr-2" size={18} />
                Artikel Details
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium">
                    {foundArticle.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Artikelnummer:
                  </span>
                  <span className="text-sm font-medium">
                    {foundArticle.articleNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Bestand:
                  </span>
                  <Badge
                    variant={
                      foundArticle.stock <= foundArticle.minStock
                        ? "destructive"
                        : "default"
                    }
                  >
                    {foundArticle.stock} Stück
                  </Badge>
                </div>
                {foundArticle.barcode && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Barcode:
                    </span>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {foundArticle.barcode}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Input */}
          <div className="space-y-2">
            <Label htmlFor="manual-input">Oder manuell eingeben:</Label>
            <div className="flex space-x-2">
              <Input
                id="manual-input"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Artikelnummer, Barcode oder QR-Code eingeben"
                data-testid="input-manual-code"
              />
              <Button onClick={handleSearch} data-testid="button-search-manual">
                <Search className="mr-1" size={16} />
                Suchen
              </Button>
            </div>
          </div>

          {/* Scanner Capabilities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="w-12 h-12 bg-chart-2 rounded-lg flex items-center justify-center mx-auto mb-2">
                <QrCode className="text-white" size={20} />
              </div>
              <h4 className="text-sm font-medium text-foreground">QR-Codes</h4>
              <p className="text-xs text-muted-foreground">
                Unterstützt alle QR-Code Formate
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-2">
                <Package className="text-white" size={20} />
              </div>
              <h4 className="text-sm font-medium text-foreground">Barcodes</h4>
              <p className="text-xs text-muted-foreground">
                EAN, UPC, Code128, Code39
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-chart-4 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Camera className="text-white" size={20} />
              </div>
              <h4 className="text-sm font-medium text-foreground">
                Kamera & USB
              </h4>
              <p className="text-xs text-muted-foreground">
                Kamera, USB & Bluetooth Scanner
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Scanner Tipps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>
                Halten Sie das Gerät ruhig und sorgen Sie für ausreichende
                Beleuchtung
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>
                USB-Scanner funktionieren automatisch - einfach Code scannen
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>
                Bluetooth-Scanner müssen zuerst in den Systemeinstellungen
                gekoppelt werden
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>
                Bei Problemen mit der Kamera prüfen Sie die
                Browser-Berechtigungen
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
