import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import api, { Order } from "@/services/api";

type State =
  | { phase: "verifying" }
  | { phase: "success"; order: Order }
  | { phase: "failed"; reason: string; orderId?: string }
  | { phase: "missing" };

const PENDING_REFERENCE_KEY = "pending_payment_reference";

/**
 * Where Paystack returns the shopper after payment.
 *
 * The redirect is not proof of anything — it is a browser navigation the
 * shopper could trigger themselves. The order is only treated as paid once
 * the server has verified the reference against Paystack.
 */
const CheckoutCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const [state, setState] = useState<State>({ phase: "verifying" });

  // Guards against the double-invoke of React 18 StrictMode in development,
  // which would otherwise fire two verifications for one payment.
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const reference =
      searchParams.get("reference") ??
      searchParams.get("trxref") ??
      window.sessionStorage.getItem(PENDING_REFERENCE_KEY);

    if (!reference) {
      setState({ phase: "missing" });
      return;
    }

    const verify = async () => {
      try {
        const result = await api.verifyPayment(reference);
        window.sessionStorage.removeItem(PENDING_REFERENCE_KEY);

        if (result.status === "success") {
          // The server empties the cart on payment; pull that through so the
          // header count does not keep showing items already bought.
          await refreshCart();
          setState({ phase: "success", order: result.order });
        } else {
          setState({
            phase: "failed",
            reason: result.reason ?? "Your payment was not completed.",
            orderId: result.order?.id,
          });
        }
      } catch (error) {
        setState({
          phase: "failed",
          reason:
            error instanceof Error
              ? error.message
              : "We could not confirm your payment.",
        });
      }
    };

    void verify();
  }, [searchParams, refreshCart]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 max-w-xl text-center">
        {state.phase === "verifying" && (
          <>
            <Loader2
              size={40}
              className="animate-spin mx-auto text-muted-foreground mb-6"
            />
            <h1 className="font-display text-2xl font-semibold mb-2">
              Confirming your payment
            </h1>
            <p className="text-muted-foreground">
              This only takes a moment — please don&apos;t close this page.
            </p>
          </>
        )}

        {state.phase === "success" && (
          <>
            <CheckCircle2 size={48} className="mx-auto text-accent mb-6" />
            <h1 className="font-display text-3xl font-semibold mb-3">
              Thank you for your order
            </h1>
            <p className="text-muted-foreground mb-2">
              Order {state.order.orderNumber} is confirmed and being prepared.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              A confirmation email is on its way to you.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                className="btn-primary"
                onClick={() => navigate(`/orders/${state.order.id}`)}>
                Track your order
              </Button>
              <Button variant="outline" onClick={() => navigate("/products")}>
                Continue shopping
              </Button>
            </div>
          </>
        )}

        {state.phase === "failed" && (
          <>
            <XCircle size={48} className="mx-auto text-destructive mb-6" />
            <h1 className="font-display text-3xl font-semibold mb-3">
              Payment not completed
            </h1>
            <p className="text-muted-foreground mb-8">{state.reason}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button className="btn-primary" onClick={() => navigate("/cart")}>
                Back to cart
              </Button>
              {state.orderId && (
                <Button variant="outline" asChild>
                  <Link to={`/orders/${state.orderId}`}>View the order</Link>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Nothing has been charged. Your items are still in your cart.
            </p>
          </>
        )}

        {state.phase === "missing" && (
          <>
            <h1 className="font-display text-2xl font-semibold mb-3">
              Nothing to confirm
            </h1>
            <p className="text-muted-foreground mb-8">
              We could not find a payment to verify. If you have just paid,
              check your orders — it may already be confirmed.
            </p>
            <Button className="btn-primary" asChild>
              <Link to="/profile?tab=orders">View your orders</Link>
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
};

export default CheckoutCallback;
