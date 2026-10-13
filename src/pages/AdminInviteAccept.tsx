import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { toast } from "sonner";

const AdminInviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUserData } = useAuth();
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const invite = await api.getAdminInvitePreview(token);
        setInviteEmail(invite.email);
        setExpiresAt(invite.expiresAt);
        setError(null);
      } catch (err) {
        console.error("Failed to load invite", err);
        setError("This invite is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.acceptAdminInvite(token, {
        name: formData.name.trim(),
        password: formData.password,
      });
      setUserData(response.user);
      toast.success("Welcome to the admin team!");
      navigate("/admin", { replace: true });
    } catch (err) {
      console.error("Failed to accept invite", err);
      toast.error(
        "Unable to accept invite. Please try again or request a new link."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout hideFooter>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">
                Join the Royale Artelier admin team
              </h1>
              <p className="text-muted-foreground">
                Complete your profile to activate admin access.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Validating your invite link...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={() => navigate("/login")}>
                Return to login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Email</Label>
                <Input value={inviteEmail} disabled className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Invite expires {new Date(expiresAt).toLocaleString()}
                </p>
              </div>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-2"
                  placeholder="Alex Morgan"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="mt-2"
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 8 characters.
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="mt-2"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn-primary"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Activating...
                  </span>
                ) : (
                  "Activate Admin Account"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminInviteAccept;
