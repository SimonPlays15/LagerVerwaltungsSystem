import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
import { insertArticleSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  QrCode,
  Barcode,
  MapPin,
} from "lucide-react";

const articleFormSchema = insertArticleSchema
  .omit({
    createdBy: true,
  })
  .extend({
    unitPrice: z.string().optional(),
    categoryId: z.string().min(1, "Kategorie ist erforderlich"),
    subCategoryId: z.string().min(1, "Unterkategorie ist erforderlich"),
  });

type ArticleFormData = z.infer<typeof articleFormSchema>;

export default function ArticleManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      articleNumber: "",
      name: "",
      description: "",
      categoryId: "",
      subCategoryId: "",
      barcode: "",
      qrCode: "",
      minimumStock: 0,
      location: "",
      unitPrice: "",
    },
  });

  const editForm = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      articleNumber: "",
      name: "",
      description: "",
      categoryId: "",
      subCategoryId: "",
      barcode: "",
      qrCode: "",
      minimumStock: 0,
      location: "",
      unitPrice: "",
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

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: subCategories } = useQuery({
    queryKey: ["/api/subcategories"],
    enabled: !!(form.watch("categoryId") || editForm.watch("categoryId")),
  });

  const createArticleMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const payload = {
        ...data,
        unitPrice: data.unitPrice ? parseFloat(data.unitPrice) : undefined,
      };
      return await apiRequest("POST", "/api/articles", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Artikel erstellt",
        description: "Der Artikel wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      console.log(error);
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
        description: "Artikel konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ArticleFormData }) => {
      const payload = {
        ...data,
        unitPrice: data.unitPrice ? parseFloat(data.unitPrice) : undefined,
      };
      return await apiRequest("PUT", `/api/articles/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      setIsEditOpen(false);
      setSelectedArticle(null);
      editForm.reset();
      toast({
        title: "Artikel aktualisiert",
        description: "Der Artikel wurde erfolgreich aktualisiert.",
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
        description: "Artikel konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/articles"]});
      setIsDeleteOpen(false);
      setSelectedArticle(null);
      toast({
        title: "Artikel gelöscht",
        description: "Der Artikel wurde erfolgreich gelöscht.",
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
        description: "Artikel konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const canCreateArticles =
    user?.role === "admin" || user?.role === "projektleiter";

    const filteredArticles =
    articles?.filter(
      (article: any) =>
        article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.articleNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        article.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  const onSubmit = (data: ArticleFormData) => {
    createArticleMutation.mutate(data);
  };

  const onEditSubmit = (data: ArticleFormData) => {
    if (selectedArticle) {
      updateArticleMutation.mutate({ id: selectedArticle.id, data });
    }
  };

  const handleEdit = (article: any) => {
    setSelectedArticle(article);
    editForm.reset({
      articleNumber: article.articleNumber || "",
      name: article.name || "",
      description: article.description || "",
      categoryId: article.categoryId || "",
      subCategoryId: article.subCategoryId || "",
      barcode: article.barcode || "",
      qrCode: article.qrCode || "",
      minimumStock: article.minimumStock || 0,
      location: article.location || "",
      unitPrice: article.unitPrice ? article.unitPrice.toString() : "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = (article: any) => {
    setSelectedArticle(article);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedArticle) {
      deleteArticleMutation.mutate(selectedArticle.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Artikel-Management
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Lagerartikel
          </p>
        </div>
        {canCreateArticles && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-create-article"
          >
            <Plus className="mr-2" size={16} />
            Neuer Artikel
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Artikel suchen</Label>
              <Input
                id="search"
                placeholder="Artikelnummer, Name oder Beschreibung..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-articles"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" data-testid="button-search-articles">
                <Search className="mr-2" size={16} />
                Suchen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles List */}
      <Card>
        <CardHeader>
          <CardTitle>Artikel ({filteredArticles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {articlesLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Lade Artikel...</p>
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
                      Bestand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Standort
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredArticles.map((article: any) => (
                    <tr
                      key={article.id}
                      data-testid={`article-row-${article.id}`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {article.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            #{article.articleNumber}
                          </div>
                          {article.description && (
                            <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                              {article.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {article.category?.name}
                        {article.subCategory &&
                          ` > ${article.subCategory.name}`}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-foreground">
                            {article.inventory?.currentStock || 0} Stück
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Min: {article.minimumStock}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {article.location ? (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-1" size={12} />
                            {article.location}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Nicht angegeben
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {canCreateArticles && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(article)}
                                data-testid={`button-edit-${article.id}`}
                              >
                                <Edit size={14} />
                              </Button>
                              {user?.role === "admin" ||
                                (user?.role === "projektleiter" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(article)}
                                    data-testid={`button-delete-${article.id}`}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                ))}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Article Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neuen Artikel erstellen</DialogTitle>
            <DialogDescription>
              Erfassen Sie alle relevanten Informationen für den neuen Artikel.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="articleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artikelnummer *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. RM-2024-001"
                          {...field}
                          data-testid="input-article-number"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. Rauchmelder RWM-200"
                          {...field}
                          data-testid="input-article-name"
                          required
                        />
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
                      <FormLabel>Kategorie *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("subCategoryId", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Kategorie auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category: any) => (
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
                  name="subCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unterkategorie *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-subcategory">
                            <SelectValue placeholder="Unterkategorie auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subCategories
                            ?.filter(
                              (sub: any) =>
                                sub.categoryId === form.watch("categoryId"),
                            )
                            .map((subCategory: any) => (
                              <SelectItem
                                key={subCategory.id}
                                value={subCategory.id}
                              >
                                {subCategory.name}
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
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mindestbestand</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          data-testid="input-minimum-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lagerort</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. A-12-3"
                          {...field}
                          data-testid="input-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stückpreis (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-unit-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detaillierte Beschreibung des Artikels..."
                        rows={3}
                        {...field}
                        data-testid="textarea-description"
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
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={createArticleMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createArticleMutation.isPending
                    ? "Erstelle..."
                    : "Artikel erstellen"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Article Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Artikel bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Artikelinformationen und speichern Sie die
              Änderungen.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="articleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artikelnummer *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. RM-2024-001"
                          {...field}
                          data-testid="input-edit-article-number"
                          required
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
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. Rauchmelder RWM-200"
                          {...field}
                          data-testid="input-edit-article-name"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategorie *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          editForm.setValue("subCategoryId", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-category">
                            <SelectValue placeholder="Kategorie auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category: any) => (
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
                  control={editForm.control}
                  name="subCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unterkategorie</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-subcategory">
                            <SelectValue placeholder="Unterkategorie auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subCategories
                            ?.filter(
                              (sub: any) =>
                                sub.categoryId === editForm.watch("categoryId"),
                            )
                            .map((subCategory: any) => (
                              <SelectItem
                                key={subCategory.id}
                                value={subCategory.id}
                              >
                                {subCategory.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mindestbestand</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          data-testid="input-edit-minimum-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standort</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. Regal A-1-3"
                          {...field}
                          data-testid="input-edit-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Einzelpreis (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-edit-unit-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Artikelbeschreibung..."
                        rows={3}
                        {...field}
                        data-testid="textarea-edit-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={updateArticleMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateArticleMutation.isPending
                    ? "Speichere..."
                    : "Speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel löschen</DialogTitle>
            <DialogDescription>
              Bestätigen Sie die Löschung des Artikels. Diese Aktion ist
              unwiderruflich.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Sind Sie sicher, dass Sie den Artikel{" "}
              <strong>{selectedArticle?.name}</strong> (#
              {selectedArticle?.articleNumber}) löschen möchten?
            </p>
            <p className="text-sm text-destructive mt-2">
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="button-cancel-delete"
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteArticleMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteArticleMutation.isPending ? "Lösche..." : "Löschen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
