import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { POST_LOGIN_ACTION_KEY } from "@/constants/storage";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const getPostLoginDestination = () => {
    let redirectTo =
      (location.state as { redirectTo?: string })?.redirectTo || "/";
    let action = (location.state as { action?: string })?.action;

    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(POST_LOGIN_ACTION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          redirectTo = parsed.redirectTo || redirectTo;
          action = parsed.action || action;
        } catch (error) {
          console.error("Failed to parse post-login action:", error);
        }
        window.sessionStorage.removeItem(POST_LOGIN_ACTION_KEY);
      }
    }

    return { redirectTo, action };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setLoginError(null);
    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        toast.success("Welcome back!");
        const { redirectTo, action } = getPostLoginDestination();

        if (action === "checkout") {
          navigate(redirectTo || "/checkout");
          return;
        }

        navigate(redirectTo);
      } else {
        setLoginError(result.message ?? "Invalid credentials");
        toast.error(result.message ?? "Invalid credentials");
      }
    } finally {
      // Runs even on the success path's early return, so the button never
      // stays spinning if navigation is blocked.
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to home
          </Link>

          <h1 className="font-display text-3xl font-semibold mb-2">
            Welcome Back
          </h1>
          <p className="text-muted-foreground mb-8">
            Sign in to access your account
          </p>

          {loginError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="font-medium text-foreground">{loginError}</p>
                {/* A suspended shopper cannot resolve this themselves, so give
                    them the route to a human rather than just a refusal. */}
                {/suspend/i.test(loginError) && (
                  <Link
                    to="/contact"
                    className="mt-1 inline-block text-accent underline underline-offset-2">
                    Contact support
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="mt-2 input-elegant"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="input-elegant pr-10"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full btn-primary"
              size="lg"
              disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-accent hover:underline font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 bg-muted">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default Login;
