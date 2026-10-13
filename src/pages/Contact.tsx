import { useState, useEffect, FormEvent } from "react";
import { Mail, MapPin, Phone, CheckCircle2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import api from "@/services/api";

const MIN_MESSAGE_LENGTH = 10;

const Contact = () => {
  const { user } = useAuth();
  const { settings } = useCurrency();

  const [values, setValues] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // The auth context resolves after this component first renders, so the
  // initial state above sees no user. Fill the identity fields once they
  // arrive, without clobbering anything already typed.
  useEffect(() => {
    if (!user) return;
    setValues((prev) => ({
      ...prev,
      name: prev.name || user.name || "",
      email: prev.email || user.email || "",
    }));
  }, [user]);

  const setField = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (values.name.trim().length < 2) nextErrors.name = "Please tell us your name";
    if (!/^\S+@\S+\.\S+$/.test(values.email))
      nextErrors.email = "Enter a valid email address";
    if (values.subject.trim().length < 2)
      nextErrors.subject = "Add a short subject";
    if (values.message.trim().length < MIN_MESSAGE_LENGTH)
      nextErrors.message = "Please tell us a little more";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitContactEnquiry(values);
      setSent(true);
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Could not send your message. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactEmail = settings?.contactEmail ?? "support@royaleartelier.com";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <PageBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Contact" },
          ]}
        />
        <h1 className="text-4xl font-display font-bold mb-4">Contact Us</h1>
        <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
          Have a question about our pieces or your order? We&apos;re here to
          help, and usually reply within one business day.
        </p>

        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {sent ? (
              <div className="bg-card rounded-lg p-10 text-center">
                <CheckCircle2 size={44} className="mx-auto text-accent mb-5" />
                <h2 className="font-display text-2xl font-semibold mb-2">
                  Message sent
                </h2>
                <p className="text-muted-foreground mb-6">
                  Thanks for getting in touch — we&apos;ve sent a copy to your
                  inbox and will reply shortly.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSent(false);
                    setValues((prev) => ({
                      ...prev,
                      subject: "",
                      message: "",
                    }));
                  }}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-card rounded-lg p-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="contact-name">Your name</Label>
                    <Input
                      id="contact-name"
                      value={values.name}
                      onChange={(event) => setField("name", event.target.value)}
                      className={errors.name ? "border-destructive" : undefined}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="contact-email">Email address</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={values.email}
                      onChange={(event) => setField("email", event.target.value)}
                      className={
                        errors.email ? "border-destructive" : undefined
                      }
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact-subject">Subject</Label>
                  <Input
                    id="contact-subject"
                    value={values.subject}
                    onChange={(event) => setField("subject", event.target.value)}
                    placeholder="Sizing question, order enquiry…"
                    className={errors.subject ? "border-destructive" : undefined}
                  />
                  {errors.subject && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.subject}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    rows={6}
                    value={values.message}
                    onChange={(event) => setField("message", event.target.value)}
                    placeholder="How can we help?"
                    className={errors.message ? "border-destructive" : undefined}
                  />
                  {errors.message && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.message}
                    </p>
                  )}
                </div>

                {errors.form && (
                  <p className="text-sm text-destructive">{errors.form}</p>
                )}

                <Button
                  type="submit"
                  className="btn-primary"
                  size="lg"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex gap-3">
              <Mail size={18} className="text-muted-foreground shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Email</h3>
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-sm text-muted-foreground hover:text-foreground">
                  {contactEmail}
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <Phone size={18} className="text-muted-foreground shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Phone</h3>
                <p className="text-sm text-muted-foreground">
                  +44 1482 000000
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin size={18} className="text-muted-foreground shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Studio</h3>
                <p className="text-sm text-muted-foreground">
                  10, Ash Grove, De La Pole Avenue
                  <br />
                  Hull, HU3 6RR, United Kingdom
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
