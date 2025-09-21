import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calculator, CheckCircle, Clock, AlertTriangle, FileText, Eye, Trash2, Edit3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryCountSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { 
  InventoryCountWithDetails, 
  InventoryCountItemWithDetails,
  Category,
  InsertInventoryCount
} from "@shared/schema";
import { z } from "zod";

const formSchema = insertInventoryCountSchema.extend({
  categoryId: z.string().optional(),
  locationFilter: z.string().optional(),
});

export default function InventoryCountingManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<string | null>(null);
  const [selectedCountDetails, setSelectedCountDetails] = useState<InventoryCountWithDetails | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "open",
      categoryId: "all",
      locationFilter: "",
    },
  });

  // Fetch inventory counts
  const { data: inventoryCounts = [], isLoading: isLoadingCounts } = useQuery<InventoryCountWithDetails[]>({
    queryKey: ["/api/inventory-counts"],
  });

  // Fetch categories for the form
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch selected count details
  const { data: countDetails, isLoading: isLoadingDetails } = useQuery<InventoryCountWithDetails>({
    queryKey: ["/api/inventory-counts", selectedCount],
    enabled: !!selectedCount,
  });

  // Create inventory count mutation
  const createCountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("Mutation function called with data:", data);
      try {
        const response = await fetch("/api/inventory-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        console.log("Response status:", response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Response error:", errorText);
          throw new Error(`Failed to create count: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        console.log("Response data:", result);
        return result;
      } catch (error) {
        console.error("Mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Inventurzählung erstellt",
        description: "Die neue Inventurzählung wurde erfolgreich erstellt.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Die Inventurzählung konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  // Update count status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/inventory-counts/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      if (selectedCount) {
        queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts", selectedCount] });
      }
      toast({
        title: "Status aktualisiert",
        description: "Der Status der Inventurzählung wurde erfolgreich aktualisiert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Der Status konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  // Delete count mutation
  const deleteCountMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/inventory-counts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete count");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      setSelectedCount(null);
      setSelectedCountDetails(null);
      toast({
        title: "Inventurzählung gelöscht",
        description: "Die Inventurzählung wurde erfolgreich gelöscht.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Die Inventurzählung konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log("Form submission triggered with data:", data);
    
    // Convert "all" to undefined for categoryId and empty strings to undefined
    const submitData: Partial<z.infer<typeof formSchema>> = {
      ...data,
      categoryId: data.categoryId === "all" || data.categoryId === "" ? undefined : data.categoryId,
      locationFilter: data.locationFilter === "" ? undefined : data.locationFilter,
    };
    
    // Remove undefined fields from the payload while preserving type safety
    const cleanedData: any = {};
    Object.entries(submitData).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });
    
    console.log("Cleaned data for submission:", cleanedData);
    createCountMutation.mutate(cleanedData);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: "Offen", variant: "outline" as const, icon: Clock },
      in_progress: { label: "In Bearbeitung", variant: "default" as const, icon: Calculator },
      completed: { label: "Abgeschlossen", variant: "secondary" as const, icon: CheckCircle },
      approved: { label: "Genehmigt", variant: "default" as const, icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  if (selectedCount && countDetails) {
    return <InventoryCountDetails 
      count={countDetails} 
      onBack={() => {
        setSelectedCount(null);
        setSelectedCountDetails(null);
      }}
      onStatusUpdate={(status: string) => updateStatusMutation.mutate({ id: selectedCount, status })}
      onDelete={() => deleteCountMutation.mutate(selectedCount)}
    />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventurzählungen</h1>
          <p className="text-gray-600 dark:text-gray-400">Physische Bestandsaufnahmen und Abweichungsanalysen</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-count">
              <Plus className="h-4 w-4 mr-2" />
              Neue Zählung
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neue Inventurzählung erstellen</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titel</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. Quartalsabschluss 2024 Q3" {...field} data-testid="input-count-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beschreibung</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optionale Beschreibung der Zählung" {...field} value={field.value || ""} data-testid="input-count-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategorie (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-count-category">
                            <SelectValue placeholder="Alle Kategorien" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Alle Kategorien</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name} ({category.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationFilter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lagerort Filter (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. A-12 für Regal A-12-*" {...field} data-testid="input-location-filter" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-count"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCountMutation.isPending}
                    data-testid="button-submit-count"
                  >
                    {createCountMutation.isPending ? "Erstelle..." : "Erstellen"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Inventurzählungen Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCounts ? (
            <div className="text-center py-4">Lade Inventurzählungen...</div>
          ) : inventoryCounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Noch keine Inventurzählungen vorhanden.</p>
              <p className="text-sm">Erstellen Sie eine neue Zählung, um zu beginnen.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Artikel</TableHead>
                  <TableHead>Fortschritt</TableHead>
                  <TableHead>Abweichungen</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryCounts.map((count: InventoryCountWithDetails) => (
                  <TableRow key={count.id}>
                    <TableCell className="font-medium">{count.title}</TableCell>
                    <TableCell>{count.category?.name || "Alle"}</TableCell>
                    <TableCell>{getStatusBadge(count.status)}</TableCell>
                    <TableCell>{count.totalItems}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          {count.completedItems}/{count.totalItems}
                        </div>
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${count.totalItems > 0 ? (count.completedItems / count.totalItems) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {count.hasDeviations ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          {count.totalDeviations}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Keine</Badge>
                      )}
                    </TableCell>
                    <TableCell>{count.createdAt ? formatDate(count.createdAt) : "-"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedCount(count.id);
                            setSelectedCountDetails(count);
                          }}
                          data-testid={`button-view-count-${count.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {count.status === 'open' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteCountMutation.mutate(count.id)}
                            disabled={deleteCountMutation.isPending}
                            data-testid={`button-delete-count-${count.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface InventoryCountDetailsProps {
  count: InventoryCountWithDetails;
  onBack: () => void;
  onStatusUpdate: (status: string) => void;
  onDelete: () => void;
}

function InventoryCountDetails({ count, onBack, onStatusUpdate, onDelete }: InventoryCountDetailsProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [countValue, setCountValue] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch count items
  const { data: items = [], isLoading: isLoadingItems } = useQuery<InventoryCountItemWithDetails[]>({
    queryKey: ["/api/inventory-counts", count.id, "items"],
  });

  // Update count item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, countedQuantity, notes }: { id: string; countedQuantity: number; notes?: string }) => {
      const response = await fetch(`/api/inventory-count-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ countedQuantity, notes }),
      });
      if (!response.ok) throw new Error("Failed to update item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts", count.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts", count.id] });
      setEditingItem(null);
      setCountValue(0);
      setNotes("");
      toast({
        title: "Zählung aktualisiert",
        description: "Die Artikelzählung wurde erfolgreich aktualisiert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Die Zählung konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (item: InventoryCountItemWithDetails) => {
    setEditingItem(item.id);
    setCountValue(item.countedQuantity || item.expectedQuantity);
    setNotes(item.notes || "");
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      updateItemMutation.mutate({
        id: editingItem,
        countedQuantity: countValue,
        notes: notes,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setCountValue(0);
    setNotes("");
  };

  const getNextStatus = () => {
    switch (count.status) {
      case 'open': return 'in_progress';
      case 'in_progress': return 'completed';
      case 'completed': return 'approved';
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'in_progress': 'Zählung starten',
      'completed': 'Zählung abschließen',
      'approved': 'Zählung genehmigen',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const nextStatus = getNextStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} data-testid="button-back-to-counts">
            ← Zurück
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{count.title}</h1>
            <p className="text-gray-600 dark:text-gray-400">{count.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {nextStatus && (
            <Button 
              onClick={() => onStatusUpdate(nextStatus)}
              data-testid="button-update-status"
            >
              {getStatusLabel(nextStatus)}
            </Button>
          )}
          {count.status === 'open' && (
            <Button 
              variant="destructive" 
              onClick={onDelete}
              data-testid="button-delete-count"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{count.totalItems}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Gesamt Artikel</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{count.completedItems}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Gezählt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{count.totalItems - count.completedItems}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Ausstehend</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{count.totalDeviations}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Abweichungen</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Artikel Zählungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingItems ? (
            <div className="text-center py-4">Lade Artikel...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artikel-Nr.</TableHead>
                  <TableHead>Artikel-Name</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Erwartet</TableHead>
                  <TableHead>Gezählt</TableHead>
                  <TableHead>Abweichung</TableHead>
                  <TableHead>Notizen</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.article.articleNumber}</TableCell>
                    <TableCell>{item.article.name}</TableCell>
                    <TableCell>{item.article.category.name}</TableCell>
                    <TableCell>{item.expectedQuantity}</TableCell>
                    <TableCell>
                      {editingItem === item.id ? (
                        <Input
                          type="number"
                          value={countValue}
                          onChange={(e) => setCountValue(Number(e.target.value))}
                          className="w-20"
                          data-testid={`input-counted-${item.id}`}
                        />
                      ) : (
                        item.countedQuantity ?? "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {item.deviation !== null && item.deviation !== 0 ? (
                        <Badge variant={item.deviation > 0 ? "default" : "destructive"}>
                          {item.deviation > 0 ? "+" : ""}{item.deviation}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem === item.id ? (
                        <Input
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Notizen..."
                          className="w-32"
                          data-testid={`input-notes-${item.id}`}
                        />
                      ) : (
                        item.notes || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem === item.id ? (
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={handleSaveEdit}
                            disabled={updateItemMutation.isPending}
                            data-testid={`button-save-${item.id}`}
                          >
                            Speichern
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-${item.id}`}
                          >
                            Abbrechen
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStartEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}