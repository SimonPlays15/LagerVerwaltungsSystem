import { Switch, Route } from "wouter";
import {apiRequest, queryClient} from "./lib/queryClient";
import {QueryClientProvider} from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import Home from "@/pages/Home";
import Layout from "@/components/Layout";
import InventoryManagement from "@/components/InventoryManagement";
import ArticleManagement from "@/components/ArticleManagement";
import CategoryManagement from "@/components/CategoryManagement";
import CostCenterManagement from "@/components/CostCenterManagement";
import Scanner from "@/components/Scanner";
import UserManagement from "@/components/UserManagement";
import ReportingManagement from "@/components/ReportingManagement";
import InventoryCountingManagement from "@/components/InventoryCountingManagement";
import Register from "@/pages/Register.tsx";

function Router() {
  const { isAuthenticated, isLoading, forcePasswordChange } = useAuth();
  let firstLaunch = false;
    apiRequest("GET", "/api/firstlaunch").then((res) => {
        if(res.ok) {
            firstLaunch = true;
        }
    });
  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
            <Route path="/" component={Login}/>
          <Route path="/login" component={Login} />
          <Route path="/register" component={firstLaunch ? Register : Login} />
        </>
      ) : forcePasswordChange ? (
        // Force password change flow–only show change password page
        <>
          <Route path="/" component={ChangePassword} />
          <Route path="/change-password" component={ChangePassword} />
        </>
      ) : (
        // Normal authenticated flow
        <>
          <Route path="/" component={Home} />
          <Route path="/inventory">
            <Layout>
              <InventoryManagement />
            </Layout>
          </Route>
          <Route path="/articles">
            <Layout>
              <ArticleManagement />
            </Layout>
          </Route>
          <Route path="/categories">
            <Layout>
              <CategoryManagement />
            </Layout>
          </Route>
          <Route path="/cost-centers">
            <Layout>
              <CostCenterManagement />
            </Layout>
          </Route>
          <Route path="/scanner">
            <Layout>
              <Scanner />
            </Layout>
          </Route>
          <Route path="/users">
            <Layout>
              <UserManagement />
            </Layout>
          </Route>
          <Route path="/reports">
            <Layout>
              <ReportingManagement />
            </Layout>
          </Route>
          <Route path="/inventory-counting">
            <Layout>
              <InventoryCountingManagement />
            </Layout>
          </Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
