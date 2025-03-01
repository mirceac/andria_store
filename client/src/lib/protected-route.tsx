import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  requireAdmin?: boolean;
  adminOnly?: boolean; // New prop to differentiate between admin-only and regular protected routes
}

export function ProtectedRoute({
  path,
  component: Component,
  requireAdmin = false,
  adminOnly = false, // By default, routes are not admin-only
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // If not logged in, redirect to auth page
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // For admin-only routes, redirect non-admins to home
  if (adminOnly && !user.is_admin) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  // If requireAdmin is true but user is not admin, show unauthorized message but don't redirect
  if (requireAdmin && !user.is_admin) {
    return (
      <Route path={path}>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="text-muted-foreground mt-2">
            You do not have permission to view this page.
          </p>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}