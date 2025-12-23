import { Navigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isAdmin, isCheckingAdmin } = useAdmin();

  // Loading state while checking admin status
  if (isCheckingAdmin) {
    return (
      <div className="container py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted animate-pulse">
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Redirect to access denied page if not admin
  if (!isAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
