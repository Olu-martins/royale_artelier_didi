import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { MailCheck, ArrowLeft } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await api.forgotPassword(email);
      // The server answers identically whether or not the account exists, so
      // this screen must not imply anything either way.
      setSentMessage(result.message);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        {sentMessage ? (
          <div className="text-center">
            <MailCheck size={44} className="mx-auto text-accent mb-6" />
            <h1 className="font-display text-2xl font-semibold mb-3">
              Check your inbox
            </h1>
            <p className="text-muted-foreground mb-8">{sentMessage}</p>
            <Button variant="outline" asChild>
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft size={16} />
              Back to sign in
            </Link>

            <h1 className="font-display text-3xl font-semibold mb-2">
              Forgot your password?
            </h1>
            <p className="text-muted-foreground mb-8">
              Enter the email address on your account and we will send you a
              link to choose a new password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                className="w-full btn-primary"
                size="lg"
                disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
};

export default ForgotPassword;
