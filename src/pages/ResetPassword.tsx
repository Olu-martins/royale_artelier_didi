import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";

const MIN_LENGTH = 8;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters`);
      return;
    }

    if (password !== confirmation) {
      setError("Those passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not reset your password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold mb-3">
            This link is incomplete
          </h1>
          <p className="text-muted-foreground mb-8">
            Open the link from your email, or request a new one.
          </p>
          <Button className="btn-primary" asChild>
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (done) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 max-w-md text-center">
          <CheckCircle2 size={44} className="mx-auto text-accent mb-6" />
          <h1 className="font-display text-2xl font-semibold mb-3">
            Password updated
          </h1>
          <p className="text-muted-foreground mb-8">
            You can now sign in with your new password.
          </p>
          <Button className="btn-primary" onClick={() => navigate("/login")}>
            Sign in
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <h1 className="font-display text-3xl font-semibold mb-2">
          Choose a new password
        </h1>
        <p className="text-muted-foreground mb-8">
          Make it at least {MIN_LENGTH} characters.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="confirmation">Confirm new password</Label>
            <Input
              id="confirmation"
              type="password"
              required
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full btn-primary"
            size="lg"
            disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default ResetPassword;
