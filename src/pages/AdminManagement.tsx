import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "./AdminDashboard";

const AdminManagement = () => {
  const { user, isAuthenticated, can } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !user?.isAdmin) {
    return <AdminDashboard initialTab="team" />;
  }

  if (!can("team:manage")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md space-y-4">
          <h1 className="font-display text-2xl font-semibold">
            You do not have access to this area
          </h1>
          <p className="text-muted-foreground">
            Managing invites, roles and admin access is restricted to super
            admins. Ask one of them if you need a change made.
          </p>
          <Button onClick={() => navigate("/admin")} className="btn-primary">
            Back to Admin Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <AdminDashboard initialTab="team" />;
};

export default AdminManagement;
