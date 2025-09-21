import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Plus,
  Edit2,
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { insertCostCenterSchema } from "@shared/schema";
import { z } from "zod";
import type { CostCenter } from "@shared/schema";

const costCenterFormSchema = insertCostCenterSchema.extend({
  isActive: z.boolean().default(true),
});

type CostCenterFormData = z.infer<typeof costCenterFormSchema>;

export default function CostCenterManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCostCenter, setSelectedCostCenter] =
    useState<CostCenter | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createForm = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const editForm = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const {
    data: costCenters,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["/api/cost-centers"],
  });

  useEffect(() => {
    if (isError && error) {
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
    }
  }, [isError, error, toast]);

  const createMutation = useMutation({
    mutationFn: async (data: CostCenterFormData) => {
      return await apiRequest("POST", "/api/cost-centers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-centers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-centers/active"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Kostenstelle erstellt",
        description: "Die Kostenstelle wurde erfolgreich erstellt.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen der Kostenstelle.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CostCenterFormData) => {
      if (!selectedCostCenter) throw new Error("No cost center selected");
      return await apiRequest(
        "PUT",
        `/api/cost-centers/${selectedCostCenter.id}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-centers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-centers/active"] });
      setIsEditOpen(false);
      setSelectedCostCenter(null);
      editForm.reset();
      toast({
        title: "Kostenstelle aktualisiert",
        description: "Die Kostenstelle wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description:
          error.message || "Fehler beim Aktualisieren der Kostenstelle.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/cost-centers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-centers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-centers/active"] });
      setIsDeleteOpen(false);
      setSelectedCostCenter(null);
      toast({
        title: "Kostenstelle gelöscht",
        description: "Die Kostenstelle wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: any) => {
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

      // Handle 409 dependency conflicts with specific feedback
      if (
        error.message?.includes("DEPENDENCY_CONFLICT") ||
        error.status === 409
      ) {
        const response = error.response?.data;
        if (response?.dependencyType && response?.dependencyCount) {
          toast({
            title: "Löschung blockiert",
            description: `Diese Kostenstelle kann nicht gelöscht werden: ${response.dependencyCount} Lagerbewegungen hängen davon ab. Bitte prüfen Sie die Bewegungshistorie.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Löschung blockiert",
            description:
              "Diese Kostenstelle kann nicht gelöscht werden, da Lagerbewegungen davon abhängen.",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen der Kostenstelle.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = (data: CostCenterFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (costCenter: CostCenter) => {
    setSelectedCostCenter(costCenter);
    editForm.setValue("code", costCenter.code);
    editForm.setValue("name", costCenter.name);
    editForm.setValue("description", costCenter.description || "");
    editForm.setValue("isActive", costCenter.isActive);
    setIsEditOpen(true);
  };

  const handleUpdate = (data: CostCenterFormData) => {
    updateMutation.mutate(data);
  };

  const handleDelete = (costCenter: CostCenter) => {
    setSelectedCostCenter(costCenter);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCostCenter) {
      deleteMutation.mutate(selectedCostCenter.id);
    }
  };

  const filteredCostCenters = ((costCenters as CostCenter[]) || []).filter(
    (costCenter: CostCenter) =>
      costCenter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const canManage = user?.role === "admin" || user?.role === "projektleiter";
  const canDelete = user?.role === "admin" || user?.role === "projektleiter";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Kostenstellen</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-cost-centers">
            Kostenstellen
          </h1>
          <p className="text-muted-foreground">
            Verwaltung der Kostenstellen für Lagerbewegungen
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-create-cost-center"
          >
            <Plus className="mr-2" size={16} />
            Neue Kostenstelle
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="text-muted-foreground" size={20} />
            <Input
              placeholder="Kostenstellen durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-cost-centers"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cost Centers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCostCenters.map((costCenter: CostCenter) => (
          <Card
            key={costCenter.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle
                    className="text-lg"
                    data-testid={`title-cost-center-${costCenter.code}`}
                  >
                    {costCenter.code}
                  </CardTitle>
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid={`name-cost-center-${costCenter.code}`}
                  >
                    {costCenter.name}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {costCenter.isActive ? (
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    >
                      <CheckCircle size={12} className="mr-1" />
                      Aktiv
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <XCircle size={12} className="mr-1" />
                      Inaktiv
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {costCenter.description && (
                <p
                  className="text-sm text-muted-foreground mb-4"
                  data-testid={`description-cost-center-${costCenter.code}`}
                >
                  {costCenter.description}
                </p>
              )}
              {canManage && (
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(costCenter)}
                    data-testid={`button-edit-cost-center-${costCenter.code}`}
                  >
                    <Edit2 size={14} className="mr-1" />
                    Bearbeiten
                  </Button>
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(costCenter)}
                      data-testid={`button-delete-cost-center-${costCenter.code}`}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Löschen
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCostCenters.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Building2
              size={48}
              className="mx-auto text-muted-foreground mb-4"
            />
            <h3 className="text-lg font-semibold mb-2">
              Keine Kostenstellen gefunden
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Keine Kostenstellen entsprechen der Suche."
                : "Noch keine Kostenstellen erstellt."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Kostenstelle erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Kostenstelle für Lagerbewegungen.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(handleCreate)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. PRJ-001"
                        data-testid="input-cost-center-code"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Projekt Hauptbahnhof"
                        data-testid="input-cost-center-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Beschreibung der Kostenstelle..."
                        data-testid="input-cost-center-description"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Aktiv</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Kostenstelle ist für Lagerbewegungen verfügbar
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-cost-center-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-cost-center"
                >
                  {createMutation.isPending ? "Erstelle..." : "Erstellen"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kostenstelle bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Details der ausgewählten Kostenstelle.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleUpdate)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. PRJ-001"
                        data-testid="input-edit-cost-center-code"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Projekt Hauptbahnhof"
                        data-testid="input-edit-cost-center-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Beschreibung der Kostenstelle..."
                        data-testid="input-edit-cost-center-description"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Aktiv</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Kostenstelle ist für Lagerbewegungen verfügbar
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-cost-center-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-cost-center"
                >
                  {updateMutation.isPending
                    ? "Aktualisiere..."
                    : "Aktualisieren"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kostenstelle löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie die Kostenstelle "
              {selectedCostCenter?.code} - {selectedCostCenter?.name}" dauerhaft
              löschen möchten? Diese Aktion kann nicht rückgängig gemacht
              werden.
              {selectedCostCenter && (
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded border">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    ⚠️ Achtung: Falls Lagerbewegungen mit dieser Kostenstelle
                    verknüpft sind, wird die Löschung blockiert.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-cost-center">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              data-testid="button-confirm-delete-cost-center"
            >
              {deleteMutation.isPending ? "Lösche..." : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
