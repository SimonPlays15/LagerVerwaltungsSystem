import {useEffect, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Switch} from "@/components/ui/switch";
import {Textarea} from "@/components/ui/textarea";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
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
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {useToast} from "@/hooks/use-toast";
import {useAuth} from "@/hooks/useAuth";
import {apiRequest} from "@/lib/queryClient";
import {isUnauthorizedError} from "@/lib/authUtils";
import {Building2, CheckCircle, Edit2, Plus, Search, Trash2, XCircle,} from "lucide-react";
import type {CostCenter} from "@shared/schema";
import {Customer, insertCostCenterSchema, insertCustomerSchema} from "@shared/schema";
import {z} from "zod";
import {Select, SelectItem, SelectTrigger, SelectValue} from "@radix-ui/react-select";
import {SelectContent} from "@/components/ui/select.tsx";

const costCenterFormSchema = insertCostCenterSchema.extend({
    isActive: z.boolean().default(true),
});

const customerFormSchema = insertCustomerSchema.extend({
    isActive: z.boolean().default(true),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

type CostCenterFormData = z.infer<typeof costCenterFormSchema>;

export default function CostCenterManagement() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCostCenter, setSelectedCostCenter] =
        useState<CostCenter | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerCreateOpen, setIsCustomerCreateOpen] = useState(false);
    const [isCustomerEditOpen, setIsCustomerEditOpen] = useState(false);
    const [isCustomerDeleteOpen, setIsCustomerDeleteOpen] = useState(false);
    const {user} = useAuth();
    const {toast} = useToast();
    const queryClient = useQueryClient();

    const createCustomerForm = useForm<CustomerFormData>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: {
            name: "",
            costCentersIds: {},
            isActive: true
        }
    });

    const editCustomerForm = useForm<CustomerFormData>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: {
            isActive: true,
            name: "",
            costCentersIds: {}
        }
    })

    const createCostCenterForm = useForm<CostCenterFormData>({
        resolver: zodResolver(costCenterFormSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            isActive: true,
        },
    });

    const editCostCenterForm = useForm<CostCenterFormData>({
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

    const createCostCenterMutation = useMutation({
        mutationFn: async (data: CostCenterFormData) => {
            return await apiRequest("POST", "/api/cost-centers", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["/api/cost-centers"]});
            queryClient.invalidateQueries({queryKey: ["/api/cost-centers/active"]});
            setIsCreateOpen(false);
            createCostCenterForm.reset();
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

    const updateCostCenterMutation = useMutation({
        mutationFn: async (data: CostCenterFormData) => {
            if (!selectedCostCenter) throw new Error("No cost center selected");
            return await apiRequest(
                "PUT",
                `/api/cost-centers/${selectedCostCenter.id}`,
                data,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["/api/cost-centers"]});
            queryClient.invalidateQueries({queryKey: ["/api/cost-centers/active"]});
            setIsEditOpen(false);
            setSelectedCostCenter(null);
            editCostCenterForm.reset();
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

    const deleteCostCenterMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("DELETE", `/api/cost-centers/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["/api/cost-centers"]});
            queryClient.invalidateQueries({queryKey: ["/api/cost-centers/active"]});
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

    const handleCostCenterCreate = (data: CostCenterFormData) => {
        createCostCenterMutation.mutate(data);
    };

    const handleCostCenterEdit = (costCenter: CostCenter) => {
        setSelectedCostCenter(costCenter);
        editCostCenterForm.setValue("code", costCenter.code);
        editCostCenterForm.setValue("name", costCenter.name);
        editCostCenterForm.setValue("description", costCenter.description || "");
        editCostCenterForm.setValue("isActive", costCenter.isActive);
        setIsEditOpen(true);
    };

    const handleCostCenterUpdate = (data: CostCenterFormData) => {
        updateCostCenterMutation.mutate(data);
    };

    const handleCostCenterDelete = (costCenter: CostCenter) => {
        setSelectedCostCenter(costCenter);
        setIsDeleteOpen(true);
    };

    const confirmCostCenterDelete = () => {
        if (selectedCostCenter) {
            deleteCostCenterMutation.mutate(selectedCostCenter.id);
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
                    <h1 className="text-3xl font-bold">Kunden & Kostenstellen</h1>
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
                        Kunden & Kostenstellen
                    </h1>
                    <p className="text-muted-foreground">
                        Verwaltung der Kunden inklusive deren Kostenstellen für Lagerbewegungen
                    </p>
                </div>
                {canManage && (
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        data-testid="button-create-cost-center"
                    >
                        <Plus className="mr-2" size={16}/>
                        Kostenstelle Anlegen
                    </Button>
                )}
                {canManage && (
                    <Button
                        onClick={() => setIsCustomerCreateOpen(true)}
                        data-testid="button-create-customer"
                    >
                        <Plus className="mr-2" size={16}/>
                        Kunden Anlegen
                    </Button>
                )}
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                        <Search className="text-muted-foreground" size={20}/>
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
                                            <CheckCircle size={12} className="mr-1"/>
                                            Aktiv
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="secondary"
                                            className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                        >
                                            <XCircle size={12} className="mr-1"/>
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
                                        onClick={() => handleCostCenterEdit(costCenter)}
                                        data-testid={`button-edit-cost-center-${costCenter.code}`}
                                    >
                                        <Edit2 size={14} className="mr-1"/>
                                        Bearbeiten
                                    </Button>
                                    {canDelete && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCostCenterDelete(costCenter)}
                                            data-testid={`button-delete-cost-center-${costCenter.code}`}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                                        >
                                            <Trash2 size={14} className="mr-1"/>
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
            {/*Create Customer Dialog*/}
            <Dialog open={isCustomerCreateOpen} onOpenChange={setIsCustomerCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Neuen Kunden anlegen</DialogTitle>
                        <DialogDescription>
                            Erstellen Sie einen neuen Kunden
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...createCustomerForm}>
                        <form onSubmit={createCustomerForm.handleSubmit()}
                              className="space-y-4">
                            <FormField
                                control={createCustomerForm.control}
                                name="name"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="z.B. Max Mustermann GmbH"
                                                data-testid="input-customer-name"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createCustomerForm.control}
                                name="costCentersIds"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Zugeteilte Kostenstellen</FormLabel>
                                        <FormControl>
                                            <Select
                                                multiple
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Wählen Sie Kostenstellen aus"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {costCenters?.map((costCenter) => (
                                                        <SelectItem
                                                            key={costCenter.id}
                                                            value={costCenter.id}
                                                            disabled={!costCenter.isActive}
                                                        >
                                                            {costCenter.code} - {costCenter.name}
                                                            {!costCenter.isActive && " (Inaktiv)"}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormDescription>
                                            Wählen Sie die Kostenstellen aus, die diesem Kunden zugeordnet werden sollen
                                        </FormDescription>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => setIsCustomerCreateOpen(false)}
                                >
                                    Abbrechen
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createCostCenterMutation.isPending}
                                    data-testid="button-submit-cost-center"
                                >
                                    {createCostCenterMutation.isPending ? "Erstelle..." : "Erstellen"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>


            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Neue Kostenstelle erstellen</DialogTitle>
                        <DialogDescription>
                            Erstellen Sie eine neue Kostenstelle für Lagerbewegungen.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...createCostCenterForm}>
                        <form
                            onSubmit={createCostCenterForm.handleSubmit(handleCostCenterCreate)}
                            className="space-y-4"
                        >
                            <FormField
                                control={createCostCenterForm.control}
                                name="code"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Code</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="z.B. PRJ-001"
                                                data-testid="input-cost-center-code"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createCostCenterForm.control}
                                name="name"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="z.B. Projekt Hauptbahnhof"
                                                data-testid="input-cost-center-name"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createCostCenterForm.control}
                                name="description"
                                render={({field}) => (
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
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createCostCenterForm.control}
                                name="isActive"
                                render={({field}) => (
                                    <FormItem
                                        className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
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
                                    disabled={createCostCenterMutation.isPending}
                                    data-testid="button-submit-cost-center"
                                >
                                    {createCostCenterMutation.isPending ? "Erstelle..." : "Erstellen"}
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
                    <Form {...editCostCenterForm}>
                        <form
                            onSubmit={editCostCenterForm.handleSubmit(handleCostCenterUpdate)}
                            className="space-y-4"
                        >
                            <FormField
                                control={editCostCenterForm.control}
                                name="code"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Code</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="z.B. PRJ-001"
                                                data-testid="input-edit-cost-center-code"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editCostCenterForm.control}
                                name="name"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="z.B. Projekt Hauptbahnhof"
                                                data-testid="input-edit-cost-center-name"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editCostCenterForm.control}
                                name="description"
                                render={({field}) => (
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
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editCostCenterForm.control}
                                name="isActive"
                                render={({field}) => (
                                    <FormItem
                                        className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
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
                                    disabled={updateCostCenterMutation.isPending}
                                    data-testid="button-update-cost-center"
                                >
                                    {updateCostCenterMutation.isPending
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
                            onClick={confirmCostCenterDelete}
                            disabled={deleteCostCenterMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                            data-testid="button-confirm-delete-cost-center"
                        >
                            {deleteCostCenterMutation.isPending ? "Lösche..." : "Endgültig löschen"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
