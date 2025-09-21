import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  Search,
  Shield,
  User,
  Crown,
  Settings,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import type { User as UserType } from "@shared/schema";

const userFormSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "projektleiter", "techniker"]).default("techniker"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
  forcePasswordChange: z.boolean().optional().default(true),
    disabled: z.boolean().optional().default(false),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "techniker",
      password: "",
      forcePasswordChange: true,
        disabled: false
    },
  });

  type EditUserFormData = Omit<UserFormData, "password">;

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(userFormSchema.omit({ password: true })),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "techniker",
      disabled: false
    },
  });

  const {
    data: users = [],
    isLoading,
    error,
    isError,
  } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
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
          window.location.href = "/login";
        }, 500);
        return;
      }
    }
  }, [isError, error, toast]);

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Benutzer erstellt",
        description: "Der Benutzer wurde erfolgreich erstellt.",
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
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen des Benutzers.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditUserFormData) => {
      if (!selectedUser) throw new Error("No user selected");
      return await apiRequest("PUT", `/api/users/${selectedUser.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditOpen(false);
      setSelectedUser(null);
      editForm.reset();
      toast({
        title: "Benutzer aktualisiert",
        description: "Der Benutzer wurde erfolgreich aktualisiert.",
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
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Fehler",
        description:
          error.message || "Fehler beim Aktualisieren des Benutzers.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDeleteOpen(false);
      setSelectedUser(null);
      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
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
          window.location.href = "/login";
        }, 500);
        return;
      }

      // Handle 409 dependency conflicts
      if (
        error.message?.includes("DEPENDENCY_CONFLICT") ||
        error.status === 409
      ) {
        const response = error.response?.data;
        if (response?.dependencyType && response?.dependencyCount) {
          toast({
            title: "Löschung blockiert",
            description: `Dieser Benutzer kann nicht gelöscht werden: ${response.dependencyCount} ${response.dependencyType === "articles" ? "Artikel" : "Lagerbewegungen"} hängen davon ab.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Löschung blockiert",
            description:
              "Dieser Benutzer kann nicht gelöscht werden, da andere Daten davon abhängen.",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen des Benutzers.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = (data: UserFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (user: UserType) => {
    setSelectedUser(user);
    editForm.setValue("email", user.email || "");
    editForm.setValue("firstName", user.firstName || "");
    editForm.setValue("lastName", user.lastName || "");
    editForm.setValue("role", user.role);
    editForm.setValue("disabled", user.disabled);
    setIsEditOpen(true);
  };

  const handleUpdate = (data: EditUserFormData) => {
    updateMutation.mutate(data);
  };

  const handleDelete = (user: UserType) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return Crown;
      case "projektleiter":
        return Shield;
      case "techniker":
        return User;
      default:
        return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-destructive";
      case "projektleiter":
        return "bg-chart-4";
      case "techniker":
        return "bg-chart-2";
      default:
        return "bg-muted";
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "projektleiter":
        return "Projektleiter";
      case "techniker":
        return "Techniker";
      default:
        return "Unbekannt";
    }
  };

  const getRolePermissions = (role: string) => {
    switch (role) {
      case "admin":
        return "Vollzugriff auf alle Funktionen";
      case "projektleiter":
        return "Artikel verwalten, Bestände verwalten";
      case "techniker":
        return "Nur Ein- und Ausbuchen";
      default:
        return "Keine Berechtigungen";
    }
  };

  const filteredUsers = users.filter((user: UserType) => {
    const matchesSearch =
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Check if current user is admin
  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Zugriff verweigert
            </h3>
            <p className="text-sm text-muted-foreground">
              Nur Administratoren können die Benutzerverwaltung aufrufen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
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
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            data-testid="title-user-management"
          >
            Benutzerverwaltung
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Benutzer und deren Berechtigungen
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          data-testid="button-create-user"
        >
          <Plus className="mr-2" size={16} />
          Neuen Benutzer hinzufügen
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Benutzer suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48" data-testid="select-role-filter">
                <SelectValue placeholder="Rolle filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Rollen</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="projektleiter">Projektleiter</SelectItem>
                <SelectItem value="techniker">Techniker</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" data-testid="button-search-users">
              <Search className="mr-2" size={16} />
              Suchen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Administratoren
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter((u: UserType) => u.role === "admin").length}
                </p>
              </div>
              <Crown className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Vollzugriff</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Projektleiter
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {
                    users.filter((u: UserType) => u.role === "projektleiter")
                      .length
                  }
                </p>
              </div>
              <Shield className="h-8 w-8 text-chart-4" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Erweiterte Rechte
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Techniker
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter((u: UserType) => u.role === "techniker").length}
                </p>
              </div>
              <User className="h-8 w-8 text-chart-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Basis Rechte</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Benutzer ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== "all"
                  ? "Keine Benutzer gefunden"
                  : "Noch keine Benutzer vorhanden"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                const roleColor = getRoleColor(user.role);

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 ${roleColor} rounded-lg flex items-center justify-center`}
                      >
                        <RoleIcon className="text-white" size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email
                              ? user.email.split("@")[0]
                              : "Unbekannter Benutzer"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {user.email || "Keine E-Mail"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Erstellt:{" "}
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(
                                "de-DE",
                              )
                            : "Unbekannt"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge variant="secondary" className="mb-2">
                        {getRoleName(user.role)}
                      </Badge>
                      <p className="text-xs text-muted-foreground max-w-48">
                        {getRolePermissions(user.role)}
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Edit2 size={14} />
                      </Button>
                      {currentUser?.id !== user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          data-testid={`button-delete-user-${user.id}`}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Rollen und Berechtigungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Crown className="text-destructive mt-1" size={20} />
              <div>
                <h4 className="font-medium text-foreground">Administrator</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  <li>• Vollzugriff auf alle Funktionen</li>
                  <li>• Benutzer verwalten</li>
                  <li>• Artikel erstellen, bearbeiten und löschen</li>
                  <li>• Kategorien und Kostenstellen verwalten</li>
                  <li>• Alle Lagerbewegungen durchführen</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-chart-4/10 border border-chart-4/20 rounded-lg">
              <Shield className="text-chart-4 mt-1" size={20} />
              <div>
                <h4 className="font-medium text-foreground">Projektleiter</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  <li>• Artikel erstellen, bearbeiten und löschen</li>
                  <li>• Kategorien und Kostenstellen verwalten</li>
                  <li>• Alle Lagerbewegungen durchführen</li>
                  <li>• Reports und Statistiken einsehen</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-chart-2/10 border border-chart-2/20 rounded-lg">
              <User className="text-chart-2 mt-1" size={20} />
              <div>
                <h4 className="font-medium text-foreground">Techniker</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  <li>• Artikel aus dem Lager entnehmen</li>
                  <li>• Artikel ins Lager einbuchen</li>
                  <li>• Barcode/QR-Code scannen</li>
                  <li>• Eigene Bewegungen einsehen</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Benutzer mit Rolle und Berechtigungen.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(handleCreate)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail-Adresse</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="z.B. john.doe@example.com"
                        data-testid="input-user-email"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vorname</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. John"
                          data-testid="input-user-firstname"
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
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nachname</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. Doe"
                          data-testid="input-user-lastname"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rolle</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Rolle auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="techniker">Techniker</SelectItem>
                        <SelectItem value="projektleiter">
                          Projektleiter
                        </SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passwort</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Mindestens 6 Zeichen"
                        data-testid="input-user-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="forcePasswordChange"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-force-password-change"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Passwort bei nächster Anmeldung ändern
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Der Benutzer muss sein Passwort bei der ersten Anmeldung
                        ändern.
                      </p>
                    </div>
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
                  data-testid="button-submit-user"
                >
                  {createMutation.isPending ? "Erstelle..." : "Erstellen"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Details und Rolle des ausgewählten Benutzers.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleUpdate)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail-Adresse</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="z.B. john.doe@example.com"
                        data-testid="input-edit-user-email"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vorname</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. John"
                          data-testid="input-edit-user-firstname"
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
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nachname</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z.B. Doe"
                          data-testid="input-edit-user-lastname"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rolle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-user-role">
                          <SelectValue placeholder="Rolle auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="techniker">Techniker</SelectItem>
                        <SelectItem value="projektleiter">
                          Projektleiter
                        </SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <div className="flex justify-start space-x-2">
                    <FormField
                        control={editForm.control}
                        name="disabled"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel style={{"paddingRight": "10px"}}>Account deaktiviert</FormLabel>
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="checkbox-edit-user-disabled"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
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
                  data-testid="button-update-user"
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

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie den Benutzer "
              {selectedUser?.firstName && selectedUser?.lastName
                ? `${selectedUser.firstName} ${selectedUser.lastName}`
                : selectedUser?.email}
              " dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig
              gemacht werden.
              {selectedUser && (
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded border">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    ⚠️ Achtung: Falls Artikel oder Lagerbewegungen mit diesem
                    Benutzer verknüpft sind, wird die Löschung blockiert.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-user">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              data-testid="button-confirm-delete-user"
            >
              {deleteMutation.isPending ? "Lösche..." : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
