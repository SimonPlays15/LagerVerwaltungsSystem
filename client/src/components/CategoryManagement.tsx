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
import { insertCategorySchema, insertSubCategorySchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import {
    Plus,
    FolderTree,
    Folder,
    FolderOpen,
    Package,
    AlertTriangle,
    Shield,
    Edit,
    Trash2, FireExtinguisher,
} from "lucide-react";

type CategoryFormData = z.infer<typeof insertCategorySchema>;
type SubCategoryFormData = z.infer<typeof insertSubCategorySchema>;

export default function CategoryManagement() {
  const [isCategoryCreateOpen, setIsCategoryCreateOpen] = useState(false);
  const [isSubCategoryCreateOpen, setIsSubCategoryCreateOpen] = useState(false);
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [isSubCategoryEditOpen, setIsSubCategoryEditOpen] = useState(false);
  const [isCategoryDeleteOpen, setIsCategoryDeleteOpen] = useState(false);
  const [isSubCategoryDeleteOpen, setIsSubCategoryDeleteOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  const subCategoryForm = useForm<SubCategoryFormData>({
    resolver: zodResolver(insertSubCategorySchema),
    defaultValues: {
      name: "",
      categoryId: "",
      description: "",
    },
  });

  const categoryEditForm = useForm<CategoryFormData>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  const subCategoryEditForm = useForm<SubCategoryFormData>({
    resolver: zodResolver(insertSubCategorySchema),
    defaultValues: {
      name: "",
      categoryId: "",
      description: "",
    },
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
    isError: isCategoriesError,
  } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  useEffect(() => {
    if (isCategoriesError && categoriesError) {
      if (isUnauthorizedError(categoriesError)) {
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
  }, [isCategoriesError, categoriesError, toast]);

  const { data: subCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/subcategories"],
  });

  const { data: articles = [] } = useQuery<any[]>({
    queryKey: ["/api/articles"],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsCategoryCreateOpen(false);
      categoryForm.reset();
      toast({
        title: "Kategorie erstellt",
        description: "Die Kategorie wurde erfolgreich erstellt.",
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
        description: "Kategorie konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const createSubCategoryMutation = useMutation({
    mutationFn: async (data: SubCategoryFormData) => {
      return await apiRequest("POST", "/api/subcategories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories"] });
      setIsSubCategoryCreateOpen(false);
      subCategoryForm.reset();
      toast({
        title: "Unterkategorie erstellt",
        description: "Die Unterkategorie wurde erfolgreich erstellt.",
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
        description: "Unterkategorie konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: CategoryFormData;
    }) => {
      return await apiRequest("PUT", `/api/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsCategoryEditOpen(false);
      setSelectedCategory(null);
      toast({
        title: "Kategorie aktualisiert",
        description: "Die Kategorie wurde erfolgreich aktualisiert.",
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
        description: "Kategorie konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories"] });
      setIsCategoryDeleteOpen(false);
      setSelectedCategory(null);
      toast({
        title: "Kategorie gelöscht",
        description: "Die Kategorie wurde erfolgreich gelöscht.",
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
            description: `Diese Kategorie kann nicht gelöscht werden: ${response.dependencyCount} ${response.dependencyType === "subcategories" ? "Unterkategorien" : "Artikel"} hängen davon ab. Bitte löschen Sie zuerst diese abhängigen Elemente.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Löschung blockiert",
            description:
              "Diese Kategorie kann nicht gelöscht werden, da andere Elemente davon abhängen.",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Fehler",
        description: "Kategorie konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const updateSubCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: SubCategoryFormData;
    }) => {
      return await apiRequest("PUT", `/api/subcategories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories"] });
      setIsSubCategoryEditOpen(false);
      setSelectedSubCategory(null);
      toast({
        title: "Unterkategorie aktualisiert",
        description: "Die Unterkategorie wurde erfolgreich aktualisiert.",
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
        description: "Unterkategorie konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const deleteSubCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/subcategories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories"] });
      setIsSubCategoryDeleteOpen(false);
      setSelectedSubCategory(null);
      toast({
        title: "Unterkategorie gelöscht",
        description: "Die Unterkategorie wurde erfolgreich gelöscht.",
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
            description: `Diese Unterkategorie kann nicht gelöscht werden: ${response.dependencyCount} Artikel hängen davon ab. Bitte löschen Sie zuerst diese abhängigen Artikel.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Löschung blockiert",
            description:
              "Diese Unterkategorie kann nicht gelöscht werden, da andere Elemente davon abhängen.",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Fehler",
        description: "Unterkategorie konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const canManageCategories =
    user?.role === "admin" || user?.role === "projektleiter";

  const getArticleCountByCategory = (categoryId: string) => {
    return (
      articles?.filter?.((article: any) => article.categoryId === categoryId)
        ?.length || 0
    );
  };

  const getArticleCountBySubCategory = (subCategoryId: string) => {
    return (
      articles?.filter?.(
        (article: any) => article.subCategoryId === subCategoryId,
      )?.length || 0
    );
  };

  const getCategoryIcon = (code: string) => {
    switch (code.toUpperCase()) {
      case "BMA":
        return FireExtinguisher;
      case "EMA":
        return Shield;
      default:
        return Package;
    }
  };

  const getCategoryColor = (code: string) => {
    switch (code.toUpperCase()) {
      case "BMA":
        return "bg-destructive";
      case "EMA":
        return "bg-chart-2";
      default:
        return "bg-primary";
    }
  };

  const onCategorySubmit = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data);
  };

  const onSubCategorySubmit = (data: SubCategoryFormData) => {
    createSubCategoryMutation.mutate(data);
  };

  const onCategoryEditSubmit = (data: CategoryFormData) => {
    if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, data });
    }
  };

  const onSubCategoryEditSubmit = (data: SubCategoryFormData) => {
    if (selectedSubCategory) {
      updateSubCategoryMutation.mutate({ id: selectedSubCategory.id, data });
    }
  };

  const openSubCategoryCreate = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    subCategoryForm.setValue("categoryId", categoryId);
    setIsSubCategoryCreateOpen(true);
  };

  const openCategoryEdit = (category: any) => {
    setSelectedCategory(category);
    categoryEditForm.reset({
      name: category.name,
      code: category.code,
      description: category.description || "",
    });
    setIsCategoryEditOpen(true);
  };

  const openSubCategoryEdit = (subCategory: any) => {
    setSelectedSubCategory(subCategory);
    subCategoryEditForm.reset({
      name: subCategory.name,
      categoryId: subCategory.categoryId,
      description: subCategory.description || "",
    });
    setIsSubCategoryEditOpen(true);
  };

  const openCategoryDelete = (category: any) => {
    setSelectedCategory(category);
    setIsCategoryDeleteOpen(true);
  };

  const openSubCategoryDelete = (subCategory: any) => {
    setSelectedSubCategory(subCategory);
    setIsSubCategoryDeleteOpen(true);
  };

  const confirmCategoryDelete = () => {
    if (selectedCategory) {
      deleteCategoryMutation.mutate(selectedCategory.id);
    }
  };

  const confirmSubCategoryDelete = () => {
    if (selectedSubCategory) {
      deleteSubCategoryMutation.mutate(selectedSubCategory.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Kategorie-Verwaltung
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Artikel-Kategorien und Unterkategorien
          </p>
        </div>
        {canManageCategories && (
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsCategoryCreateOpen(true)}
              data-testid="button-create-category"
            >
              <Plus className="mr-2" size={16} />
              Neue Kategorie
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsSubCategoryCreateOpen(true)}
              data-testid="button-create-subcategory"
            >
              <Plus className="mr-2" size={16} />
              Neue Unterkategorie
            </Button>
          </div>
        )}
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categoriesLoading ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-muted-foreground">Lade Kategorien...</p>
          </div>
        ) : !categories || categories?.length === 0 ? (
          <div className="col-span-2 text-center py-8">
            <FolderTree className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Noch keine Kategorien vorhanden
            </p>
          </div>
        ) : (
          categories?.map?.((category: any) => {
            const CategoryIcon = getCategoryIcon(category.code);
            const categoryColor = getCategoryColor(category.code);
            const categorySubCategories =
              subCategories?.filter?.(
                (sub: any) => sub.categoryId === category.id,
              ) || [];
            const articleCount = getArticleCountByCategory(category.id);

            return (
              <Card key={category.id} className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-12 h-12 ${categoryColor} rounded-lg flex items-center justify-center`}
                      >
                        <CategoryIcon className="text-white" size={20} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {category.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {category.code}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right mr-2">
                        <p className="text-2xl font-bold text-foreground">
                          {articleCount}
                        </p>
                        <p className="text-xs text-muted-foreground">Artikel</p>
                      </div>
                      {canManageCategories && (
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCategoryEdit(category)}
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Edit size={14} />
                          </Button>
                          {user?.role === "admin" ||
                            (user?.role === "projektleiter" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCategoryDelete(category)}
                                data-testid={`button-delete-category-${category.id}`}
                              >
                                <Trash2 size={14} />
                              </Button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground flex items-center">
                        <FolderOpen className="mr-2" size={16} />
                        Unterkategorien ({categorySubCategories.length})
                      </h4>
                      {canManageCategories && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSubCategoryCreate(category.id)}
                          data-testid={`button-add-subcategory-${category.id}`}
                        >
                          <Plus size={14} />
                        </Button>
                      )}
                    </div>

                    {categorySubCategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        Keine Unterkategorien
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {categorySubCategories.map((subCategory: any) => {
                          const subArticleCount = getArticleCountBySubCategory(
                            subCategory.id,
                          );
                          return (
                            <div
                              key={subCategory.id}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div className="flex items-center space-x-2">
                                <Folder
                                  className="text-muted-foreground"
                                  size={14}
                                />
                                <span className="text-sm font-medium text-foreground">
                                  {subCategory.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {subArticleCount} Artikel
                                </Badge>
                                {canManageCategories && (
                                  <div className="flex space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        openSubCategoryEdit(subCategory)
                                      }
                                      data-testid={`button-edit-subcategory-${subCategory.id}`}
                                    >
                                      <Edit size={12} />
                                    </Button>
                                    {user?.role === "admin" ||
                                      (user?.role === "projektleiter" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            openSubCategoryDelete(subCategory)
                                          }
                                          data-testid={`button-delete-subcategory-${subCategory.id}`}
                                        >
                                          <Trash2 size={12} />
                                        </Button>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Predefined Categories Info */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Kategorien</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="text-destructive" size={24} />
              <div>
                <h4 className="font-medium text-foreground">
                  Brandmeldetechnik (BMA)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Zentrale, Komponente, Zubehör
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-chart-2/10 border border-chart-2/20 rounded-lg">
              <Shield className="text-chart-2" size={24} />
              <div>
                <h4 className="font-medium text-foreground">
                  Einbruchmeldetechnik (EMA)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Zentrale, Sensoren, Kameras
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <Dialog
        open={isCategoryCreateOpen}
        onOpenChange={setIsCategoryCreateOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Kategorie erstellen</DialogTitle>
            <DialogDescription>
              Erfassen Sie alle relevanten Informationen für die neue Kategorie.
            </DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form
              onSubmit={categoryForm.handleSubmit(onCategorySubmit)}
              className="space-y-4"
            >
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Brandmeldetechnik"
                        {...field}
                        data-testid="input-category-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={categoryForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. BMA"
                        {...field}
                        data-testid="input-category-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Beschreibung der Kategorie..."
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                        data-testid="textarea-category-description"
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
                  onClick={() => setIsCategoryCreateOpen(false)}
                  data-testid="button-cancel-category"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  data-testid="button-submit-category"
                >
                  {createCategoryMutation.isPending
                    ? "Erstelle..."
                    : "Kategorie erstellen"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create SubCategory Dialog */}
      <Dialog
        open={isSubCategoryCreateOpen}
        onOpenChange={setIsSubCategoryCreateOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Unterkategorie erstellen</DialogTitle>
            <DialogDescription>
              Erfassen Sie alle relevanten Informationen für die neue
              Unterkategorie.
            </DialogDescription>
          </DialogHeader>
          <Form {...subCategoryForm}>
            <form
              onSubmit={subCategoryForm.handleSubmit(onSubCategorySubmit)}
              className="space-y-4"
            >
              <FormField
                control={subCategoryForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hauptkategorie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-parent-category">
                          <SelectValue placeholder="Hauptkategorie auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories ?? []).map((category: any) => (
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
                control={subCategoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Zentrale"
                        {...field}
                        data-testid="input-subcategory-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={subCategoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Beschreibung der Unterkategorie..."
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                        data-testid="textarea-subcategory-description"
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
                  onClick={() => setIsSubCategoryCreateOpen(false)}
                  data-testid="button-cancel-subcategory"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={createSubCategoryMutation.isPending}
                  data-testid="button-submit-subcategory"
                >
                  {createSubCategoryMutation.isPending
                    ? "Erstelle..."
                    : "Unterkategorie erstellen"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isCategoryEditOpen} onOpenChange={setIsCategoryEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kategorie bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Kategorieinformationen und speichern Sie die
              Änderungen.
            </DialogDescription>
          </DialogHeader>
          <Form {...categoryEditForm}>
            <form
              onSubmit={categoryEditForm.handleSubmit(onCategoryEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={categoryEditForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Brandmeldetechnik"
                        {...field}
                        data-testid="input-edit-category-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={categoryEditForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. BMA"
                        {...field}
                        data-testid="input-edit-category-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={categoryEditForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Beschreibung der Kategorie..."
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                        data-testid="textarea-edit-category-description"
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
                  onClick={() => setIsCategoryEditOpen(false)}
                  data-testid="button-cancel-edit-category"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={updateCategoryMutation.isPending}
                  data-testid="button-submit-edit-category"
                >
                  {updateCategoryMutation.isPending
                    ? "Speichere..."
                    : "Änderungen speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit SubCategory Dialog */}
      <Dialog
        open={isSubCategoryEditOpen}
        onOpenChange={setIsSubCategoryEditOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Unterkategorie bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Unterkategorieinformationen und speichern Sie
              die Änderungen.
            </DialogDescription>
          </DialogHeader>
          <Form {...subCategoryEditForm}>
            <form
              onSubmit={subCategoryEditForm.handleSubmit(
                onSubCategoryEditSubmit,
              )}
              className="space-y-4"
            >
              <FormField
                control={subCategoryEditForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hauptkategorie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-parent-category">
                          <SelectValue placeholder="Hauptkategorie auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories ?? []).map((category: any) => (
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
                control={subCategoryEditForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Zentrale"
                        {...field}
                        data-testid="input-edit-subcategory-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={subCategoryEditForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Beschreibung der Unterkategorie..."
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                        data-testid="textarea-edit-subcategory-description"
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
                  onClick={() => setIsSubCategoryEditOpen(false)}
                  data-testid="button-cancel-edit-subcategory"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={updateSubCategoryMutation.isPending}
                  data-testid="button-submit-edit-subcategory"
                >
                  {updateSubCategoryMutation.isPending
                    ? "Speichere..."
                    : "Änderungen speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog
        open={isCategoryDeleteOpen}
        onOpenChange={setIsCategoryDeleteOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategorie löschen</DialogTitle>
            <DialogDescription>
              Bestätigen Sie die Löschung der Kategorie. Diese Aktion ist
              unwiderruflich.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Sind Sie sicher, dass Sie die Kategorie{" "}
              <strong>{selectedCategory?.name}</strong> (
              {selectedCategory?.code}) löschen möchten?
            </p>
            <p className="text-sm text-destructive mt-2">
              Warnung: Alle zugehörigen Unterkategorien und Artikel werden
              ebenfalls betroffen sein.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsCategoryDeleteOpen(false)}
              data-testid="button-cancel-delete-category"
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCategoryDelete}
              disabled={deleteCategoryMutation.isPending}
              data-testid="button-confirm-delete-category"
            >
              {deleteCategoryMutation.isPending ? "Lösche..." : "Löschen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete SubCategory Dialog */}
      <Dialog
        open={isSubCategoryDeleteOpen}
        onOpenChange={setIsSubCategoryDeleteOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unterkategorie löschen</DialogTitle>
            <DialogDescription>
              Bestätigen Sie die Löschung der Unterkategorie. Diese Aktion ist
              unwiderruflich.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Sind Sie sicher, dass Sie die Unterkategorie{" "}
              <strong>{selectedSubCategory?.name}</strong> löschen möchten?
            </p>
            <p className="text-sm text-destructive mt-2">
              Warnung: Alle zugehörigen Artikel werden ebenfalls betroffen sein.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsSubCategoryDeleteOpen(false)}
              data-testid="button-cancel-delete-subcategory"
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSubCategoryDelete}
              disabled={deleteSubCategoryMutation.isPending}
              data-testid="button-confirm-delete-subcategory"
            >
              {deleteSubCategoryMutation.isPending ? "Lösche..." : "Löschen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
