import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Download, FileText, FileSpreadsheet, Filter, Package, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { 
  InventoryReport, 
  StockMovementReport, 
  CategoryReport, 
  ReportFilter,
  Category, 
  CostCenter,
  User 
} from "@shared/schema";

export default function ReportingManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("inventory");
  const [filters, setFilters] = useState<ReportFilter>({});
  const [isExporting, setIsExporting] = useState(false);

  // Fetch filter options
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: costCenters } = useQuery<CostCenter[]>({
    queryKey: ["/api/cost-centers"],
  });

  // Fetch reports based on active tab and filters
  const { data: inventoryReport, isLoading: inventoryLoading } = useQuery<InventoryReport[]>({
    queryKey: ["/api/reports/inventory", filters],
    enabled: activeTab === "inventory",
  });

  const { data: movementReport, isLoading: movementLoading } = useQuery<StockMovementReport[]>({
    queryKey: ["/api/reports/stock-movements", filters],
    enabled: activeTab === "movements",
  });

  const { data: categoryReport, isLoading: categoryLoading } = useQuery<CategoryReport[]>({
    queryKey: ["/api/reports/categories"],
    enabled: activeTab === "categories",
  });

  const handleFilterChange = (key: keyof ReportFilter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" || !value ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const exportReport = async (format: 'excel' | 'pdf', reportType: string) => {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const url = `/api/reports/${reportType}/export/${format}?${queryParams}`;

      if (format === 'pdf') {
        // Open HTML report in new tab for printing
        window.open(url, '_blank');
        toast({
          title: "Druckansicht geöffnet",
          description: `Die Druckansicht wurde in einem neuen Tab geöffnet. Verwenden Sie Strg+P zum Drucken.`,
        });
      } else {
        // Download Excel file
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        
        const date = new Date().toISOString().split('T')[0];
        a.download = `${reportType}_${date}.xlsx`;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);

        toast({
          title: "Export erfolgreich",
          description: `Der ${reportType}-Bericht wurde als Excel heruntergeladen.`,
        });
      }
    } catch (error) {
      toast({
        title: "Export fehlgeschlagen",
        description: "Der Bericht konnte nicht exportiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const FilterSection = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filter
        </CardTitle>
        <CardDescription>
          Berichte nach verschiedenen Kriterien filtern
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Von Datum</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              data-testid="filter-date-from"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">Bis Datum</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              data-testid="filter-date-to"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategorie</Label>
            <Select 
              value={filters.categoryId || "all"} 
              onValueChange={(value) => handleFilterChange("categoryId", value)}
            >
              <SelectTrigger data-testid="filter-category">
                <SelectValue placeholder="Alle Kategorien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} ({category.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(activeTab === "movements") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="costCenter">Kostenstelle</Label>
                <Select 
                  value={filters.costCenterId || "all"} 
                  onValueChange={(value) => handleFilterChange("costCenterId", value)}
                >
                  <SelectTrigger data-testid="filter-cost-center">
                    <SelectValue placeholder="Alle Kostenstellen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kostenstellen</SelectItem>
                    {costCenters?.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name} ({center.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="movementType">Bewegungstyp</Label>
                <Select 
                  value={filters.movementType || "all"} 
                  onValueChange={(value) => handleFilterChange("movementType", value)}
                >
                  <SelectTrigger data-testid="filter-movement-type">
                    <SelectValue placeholder="Alle Bewegungen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Bewegungen</SelectItem>
                    <SelectItem value="checkin">Einlagerung</SelectItem>
                    <SelectItem value="checkout">Entnahme</SelectItem>
                    <SelectItem value="adjustment">Korrektur</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={clearFilters}
            data-testid="button-clear-filters"
          >
            Filter zurücksetzen
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const ExportButtons = ({ reportType }: { reportType: string }) => (
    <div className="flex gap-2 mb-4">
      <Button 
        onClick={() => exportReport('excel', reportType)} 
        disabled={isExporting}
        data-testid={`button-export-excel-${reportType}`}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Excel Export
      </Button>
      <Button 
        onClick={() => exportReport('pdf', reportType)} 
        disabled={isExporting} 
        variant="outline"
        data-testid={`button-export-pdf-${reportType}`}
      >
        <FileText className="h-4 w-4 mr-2" />
        Druckansicht
      </Button>
    </div>
  );

  const InventoryReportTable = () => (
    <div className="space-y-4">
      <ExportButtons reportType="inventory" />
      {inventoryLoading ? (
        <div className="text-center py-8">Laden...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artikel-Nr.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Aktueller Bestand</TableHead>
              <TableHead>Mindestbestand</TableHead>
              <TableHead>Preis/Einheit</TableHead>
              <TableHead>Gesamtwert</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryReport?.map((item) => (
              <TableRow 
                key={item.articleId} 
                className={item.isLowStock ? "bg-red-50" : ""}
                data-testid={`row-inventory-${item.articleId}`}
              >
                <TableCell className="font-mono" data-testid={`text-article-number-${item.articleId}`}>
                  {item.articleNumber}
                </TableCell>
                <TableCell data-testid={`text-article-name-${item.articleId}`}>
                  {item.articleName}
                </TableCell>
                <TableCell data-testid={`text-category-${item.articleId}`}>
                  {item.categoryName}
                </TableCell>
                <TableCell data-testid={`text-current-stock-${item.articleId}`}>
                  {item.currentStock}
                </TableCell>
                <TableCell data-testid={`text-minimum-stock-${item.articleId}`}>
                  {item.minimumStock}
                </TableCell>
                <TableCell data-testid={`text-unit-price-${item.articleId}`}>
                  {item.unitPrice ? `€${item.unitPrice}` : '-'}
                </TableCell>
                <TableCell data-testid={`text-total-value-${item.articleId}`}>
                  {item.totalValue ? `€${item.totalValue}` : '-'}
                </TableCell>
                <TableCell data-testid={`text-status-${item.articleId}`}>
                  {item.isLowStock ? (
                    <Badge variant="destructive">Niedrigbestand</Badge>
                  ) : (
                    <Badge variant="default">Normal</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  const MovementReportTable = () => (
    <div className="space-y-4">
      <ExportButtons reportType="stock-movements" />
      {movementLoading ? (
        <div className="text-center py-8">Laden...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Artikel</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Menge</TableHead>
              <TableHead>Kostenstelle</TableHead>
              <TableHead>Benutzer</TableHead>
              <TableHead>Notizen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movementReport?.map((item) => (
              <TableRow 
                key={item.id}
                data-testid={`row-movement-${item.id}`}
              >
                <TableCell data-testid={`text-date-${item.id}`}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('de-DE') : '-'}
                </TableCell>
                <TableCell data-testid={`text-article-${item.id}`}>
                  <div>
                    <div className="font-mono text-sm">{item.article.articleNumber}</div>
                    <div className="text-sm text-gray-600">{item.article.name}</div>
                  </div>
                </TableCell>
                <TableCell data-testid={`text-type-${item.id}`}>
                  <Badge variant={item.type === 'checkout' ? 'destructive' : 'default'}>
                    {item.type === 'checkin' && 'Einlagerung'}
                    {item.type === 'checkout' && 'Entnahme'}
                    {item.type === 'adjustment' && 'Korrektur'}
                    {item.type === 'transfer' && 'Transfer'}
                  </Badge>
                </TableCell>
                <TableCell 
                  className={item.type === 'checkout' ? "text-red-600" : "text-green-600"}
                  data-testid={`text-quantity-${item.id}`}
                >
                  {item.type === 'checkout' ? '-' : ''}{item.quantity}
                </TableCell>
                <TableCell data-testid={`text-cost-center-${item.id}`}>
                  {item.costCenter ? `${item.costCenter.name} (${item.costCenter.code})` : '-'}
                </TableCell>
                <TableCell data-testid={`text-user-${item.id}`}>
                  {item.user.firstName} {item.user.lastName}
                </TableCell>
                <TableCell data-testid={`text-notes-${item.id}`}>
                  {item.notes || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  const CategoryReportTable = () => (
    <div className="space-y-4">
      <ExportButtons reportType="categories" />
      {categoryLoading ? (
        <div className="text-center py-8">Laden...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Artikel Anzahl</TableHead>
              <TableHead>Gesamtbestand</TableHead>
              <TableHead>Gesamtwert</TableHead>
              <TableHead>Niedrigbestand</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryReport?.map((item) => (
              <TableRow 
                key={item.categoryId}
                data-testid={`row-category-${item.categoryId}`}
              >
                <TableCell className="font-mono" data-testid={`text-code-${item.categoryId}`}>
                  {item.categoryCode}
                </TableCell>
                <TableCell data-testid={`text-name-${item.categoryId}`}>
                  {item.categoryName}
                </TableCell>
                <TableCell data-testid={`text-total-articles-${item.categoryId}`}>
                  {item.totalArticles}
                </TableCell>
                <TableCell data-testid={`text-total-stock-${item.categoryId}`}>
                  {item.totalStock}
                </TableCell>
                <TableCell data-testid={`text-total-value-${item.categoryId}`}>
                  €{parseFloat(item.totalValue).toFixed(2)}
                </TableCell>
                <TableCell data-testid={`text-low-stock-${item.categoryId}`}>
                  {item.lowStockArticles > 0 ? (
                    <Badge variant="destructive">{item.lowStockArticles}</Badge>
                  ) : (
                    <Badge variant="default">0</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Berichte</h1>
      </div>

      <FilterSection />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            <Package className="h-4 w-4 mr-2" />
            Lagerbestand
          </TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">
            <TrendingUp className="h-4 w-4 mr-2" />
            Lagerbewegungen
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <FileText className="h-4 w-4 mr-2" />
            Kategorien
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lagerbestand Bericht</CardTitle>
              <CardDescription>
                Übersicht über alle Artikel im Lager mit aktuellen Beständen und Werten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryReportTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lagerbewegungen Bericht</CardTitle>
              <CardDescription>
                Detaillierte Aufstellung aller Ein- und Auslagerungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MovementReportTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kategorien Übersicht</CardTitle>
              <CardDescription>
                Zusammenfassung der Lagerbestände nach Kategorien
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryReportTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}