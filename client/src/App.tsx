import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutShell } from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";

// Pages
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ProjectsPage from "@/pages/projects-page";
import ProjectDetailPage from "@/pages/project-detail-page";
import TasksPage from "@/pages/tasks-page";
import TaskDetailPage from "@/pages/task-detail-page";
import AdminPage from "@/pages/admin-page";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="/">
        <LayoutShell>
          <ProtectedRoute component={DashboardPage} />
        </LayoutShell>
      </Route>

      <Route path="/projects">
        <LayoutShell>
          <ProtectedRoute component={ProjectsPage} />
        </LayoutShell>
      </Route>

      <Route path="/projects/:id">
        <LayoutShell>
          <ProtectedRoute component={ProjectDetailPage} />
        </LayoutShell>
      </Route>

      <Route path="/tasks">
        <LayoutShell>
          <ProtectedRoute component={TasksPage} />
        </LayoutShell>
      </Route>

      <Route path="/tasks/:id">
        <LayoutShell>
          <ProtectedRoute component={TaskDetailPage} />
        </LayoutShell>
      </Route>

      <Route path="/admin">
        <LayoutShell>
          <ProtectedRoute component={AdminPage} adminOnly />
        </LayoutShell>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
