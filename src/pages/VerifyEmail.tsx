import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/services/api";

type State = "verifying" | "verified" | "invalid" | "missing";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>(token ? "verifying" : "missing");
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  // StrictMode double-invokes effects in development; without this guard the
  // second call would consume the (single-use) token and report failure.
  const hasRun = useRef(false);

  useEffect(() => {
    if (!token || hasRun.current) return;
    hasRun.current = true;

    api
      .verifyEmail(token)
      .then(() => setState("verified"))
      .catch(() => setState("invalid"));
  }, [token]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const result = await api.resendVerification(email);
      toast.success(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send the email",
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 max-w-md text-center">
        {state === "verifying" && (
          <>
            <Loader2
              size={40}
              className="animate-spin mx-auto text-muted-foreground mb-6"
            />
            <h1 className="font-display text-2xl font-semibold">
              Confirming your email
            </h1>
          </>
        )}

        {state === "verified" && (
          <>
            <CheckCircle2 size={44} className="mx-auto text-accent mb-6" />
            <h1 className="font-display text-2xl font-semibold mb-3">
              Email confirmed
            </h1>
            <p className="text-muted-foreground mb-8">
              Thanks — your account is all set.
            </p>
            <Button className="btn-primary" asChild>
              <Link to="/products">Start shopping</Link>
            </Button>
          </>
        )}

        {(state === "invalid" || state === "missing") && (
          <>
            <XCircle size={44} className="mx-auto text-destructive mb-6" />
            <h1 className="font-display text-2xl font-semibold mb-3">
              {state === "missing"
                ? "No confirmation link"
                : "This link has expired"}
            </h1>
            <p className="text-muted-foreground mb-6">
              Enter your email address and we will send a fresh one.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button
                className="btn-primary shrink-0"
                onClick={handleResend}
                disabled={isResending || !email}>
                {isResending ? "Sending…" : "Resend"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default VerifyEmail;
