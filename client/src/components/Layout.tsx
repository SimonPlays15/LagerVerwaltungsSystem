import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Warehouse,
  LayoutDashboard,
  Package,
  Tags,
  FolderTree,
  QrCode,
  Users,
  Bell,
  Settings,
  LogOut,
  FileText,
  Calculator,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout", {});
      // Clear all queries to reset the auth state
      queryClient.clear();
      // Navigate to the login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback: force reload to clear the state
      window.location.href = "/login";
    }
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      current: location === "/",
    },
    {
      name: "Bestandsverwaltung",
      href: "/inventory",
      icon: Package,
      current: location === "/inventory",
    },
    {
      name: "Artikel-Management",
      href: "/articles",
      icon: Tags,
      current: location === "/articles",
    },
    {
      name: "Kategorien",
      href: "/categories",
      icon: FolderTree,
      current: location === "/categories",
    },
    {
      name: "Kostenstellen",
      href: "/cost-centers",
      icon: Tags,
      current: location === "/cost-centers",
    },
    {
      name: "Scanner",
      href: "/scanner",
      icon: QrCode,
      current: location === "/scanner",
    },
    {
      name: "Inventurzählungen",
      href: "/inventory-counting",
      icon: Calculator,
      current: location === "/inventory-counting",
    },
    {
      name: "Berichte",
      href: "/reports",
      icon: FileText,
      current: location === "/reports",
    },
    ...(user?.role === "admin"
      ? [
          {
            name: "Benutzerverwaltung",
            href: "/users",
            icon: Users,
            current: location === "/users",
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border shadow-sm">
        <div className="flex items-center justify-center h-16 px-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Warehouse className="text-primary-foreground" size={16} />
            </div>
            <h1 className="text-lg font-bold text-foreground">
              Lager Verwaltung
            </h1>
          </div>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <a
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    item.current
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  data-testid={`nav-${item.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                >
                  <item.icon className="mr-3" size={16} />
                  {item.name}
                </a>
              </Link>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-border">
            <div className="px-3 py-2">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <Users className="text-muted-foreground" size={12} />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-foreground">
                    {user?.firstName || user?.lastName
                      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                      : user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role || "User"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-foreground">
                {navigation.find((item) => item.current)?.name || "Dashboard"}
              </h2>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded-md">Live</span>
                <span>Letzte Aktualisierung: vor 2 Min.</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  handleLogout();
                }}
                data-testid="button-logout"
              >
                <LogOut size={14} className="mr-1" />
                Abmelden
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
