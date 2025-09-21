import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent, DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { insertStockMovementSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import {
  Plus,
  Minus,
  Search,
  Package,
  QrCode,
  AlertTriangle,
  TrendingUp,
  History,
  MapPin,
} from "lucide-react";

const stockMovementFormSchema = insertStockMovementSchema.omit({
    articleId: true
}).extend({
    articleNumber: z.string().min(1, "Artikelnummer ist erforderlich"),
    quantity: z.number().min(1, "Menge muss mindestens 1 sein"),
    articleId: z.string().optional(), // Machen Sie articleId optional im Schema
});

type StockMovementFormData = z.infer<typeof stockMovementFormSchema>;

export default function InventoryManagement() {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkInForm = useForm<StockMovementFormData>({
    resolver: zodResolver(stockMovementFormSchema),
    defaultValues: {
      type: "checkin",
      quantity: 10,
      articleNumber: "",
        articleId: "",
      notes: "",
    },
  });

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
    isError: isArticlesError,
  } = useQuery({
    queryKey: ["/api/articles"],
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
  }, [isArticlesError, articlesError, toast]);

  const { data: costCenters } = useQuery({
    queryKey: ["/api/cost-centers/active"],
  });

  const { data: recentMovements } = useQuery({
    queryKey: ["/api/stock-movements", 20],
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ["/api/dashboard/low-stock"],
  });

  const stockMovementMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/stock-movements", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsCheckInOpen(false);
      setIsCheckOutOpen(false);
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
  });

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
      console.log(data)
      console.log(selectedArticle)
      console.log("SADOUIJGFH>SDUIO")
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
  };

  const onCheckOutSubmit = (data: StockMovementFormData) => {
    if (!selectedArticle || !data.articleId) {
      toast({
        title: "Artikel nicht gefunden",
        description: "Bitte geben Sie eine gültige Artikelnummer ein.",
        variant: "destructive",
      });
      return;
    }

    if (!data.costCenterId ) {
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


    const filteredArticles =
    articles?.filter(
      (article: any) =>
        article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.articleNumber.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bestandsverwaltung
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Lagerbestände
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsCheckInOpen(true)}
            className="bg-chart-1 hover:bg-chart-1/90"
            data-testid="button-check-in"
          >
            <Plus className="mr-2" size={16} />
            Einbuchen
          </Button>
          <Button
            onClick={() => setIsCheckOutOpen(true)}
            className="bg-chart-2 hover:bg-chart-2/90"
            data-testid="button-check-out"
          >
            <Minus className="mr-2" size={16} />
            Ausgeben
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Gesamt Artikel
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {articles?.length || 0}
                </p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Niedrige Bestände
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {lowStockItems?.length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Letzte Bewegungen
                </p>
                <p className="text-2xl font-bold text-chart-2">
                  {recentMovements?.length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-chart-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Artikel suchen</Label>
              <Input
                id="search"
                placeholder="Artikelnummer oder Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-inventory"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" data-testid="button-search-inventory">
                <Search className="mr-2" size={16} />
                Suchen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Aktueller Bestand</CardTitle>
          </CardHeader>
          <CardContent>
            {articlesLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Lade Bestand...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Keine Artikel gefunden"
                    : "Noch keine Artikel vorhanden"}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredArticles.map((article: any) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {article.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        #{article.articleNumber}
                      </p>
                      {article.location && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <MapPin className="mr-1" size={10} />
                          {article.location}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        {article.inventory?.currentStock || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Min: {article.minimumStock}
                      </div>
                      {(article.inventory?.currentStock || 0) <=
                        article.minimumStock && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Niedrig
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2" size={20} />
              Letzte Bewegungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMovements?.length ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentMovements.map((movement: any) => (
                  <div
                    key={movement.id}
                    className="flex items-start space-x-3 p-3 border border-border rounded-lg"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        movement.type === "checkin"
                          ? "bg-chart-1"
                          : movement.type === "checkout"
                            ? "bg-chart-2"
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
                        {movement.type === "checkout"
                          ? "entnahm"
                          : "buchte ein"}{" "}
                        <span className="font-medium">
                          {movement.quantity}x
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {movement.article.name}
                      </p>
                      {movement.costCenter && (
                        <p className="text-xs text-primary">
                          Kostenstelle: {movement.costCenter.code}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.createdAt).toLocaleDateString(
                          "de-DE",
                          {
                            day: "2-digit",
                            month: "2-digit",
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
              <div className="text-center py-8">
                <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Keine Bewegungen vorhanden
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Check In Dialog */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Artikel einbuchen</DialogTitle>
              <DialogDescription>
                  Buchen Sie einen Artikel ein
              </DialogDescription>
          </DialogHeader>
          <Form {...checkInForm}>
            <form
              onSubmit={(e) => {
                  console.log(e)
                  checkInForm.handleSubmit(onCheckInSubmit)(e);
              }}
              className="space-y-4"
            >
              <FormField
                control={checkInForm.control}
                name="articleNumber"
                render={({ field }) => (
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
                      <Button type="button" variant="outline" size="icon">
                        <QrCode size={16} />
                      </Button>
                    </div>
                    <FormMessage />
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
                render={({ field }) => (
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={checkInForm.control}
                name="notes"
                render={({ field }) => (
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCheckInOpen(false)}
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
      <Dialog open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
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
                render={({ field }) => (
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
                      <Button type="button" variant="outline" size="icon">
                        <QrCode size={16} />
                      </Button>
                    </div>
                    <FormMessage />
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
                render={({ field }) => (
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={checkOutForm.control}
                name="costCenterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Kostenstelle *{" "}
                      <span className="text-destructive">(Erforderlich)</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-checkout-cost-center">
                          <SelectValue placeholder="Kostenstelle auswählen..." />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={checkOutForm.control}
                name="notes"
                render={({ field }) => (
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCheckOutOpen(false)}
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
