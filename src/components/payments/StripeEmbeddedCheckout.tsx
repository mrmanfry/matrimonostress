import { useCallback } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface StripeEmbeddedCheckoutProps {
  /** Edge function name to call to create the checkout session. */
  functionName: "create-checkout" | "unlock-photos" | "create-planner-checkout";
  /** Body to pass to the edge function. weddingId is required. */
  body: Record<string, unknown>;
}

/**
 * Stripe Embedded Checkout — renders payment form inline via iframe.
 * Handles "Add promotion code" natively. After payment, Stripe redirects
 * to the return_url defined in the edge function.
 */
export function StripeEmbeddedCheckout({
  functionName,
  body,
}: StripeEmbeddedCheckoutProps) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { ...body, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Impossibile avviare il pagamento");
    }
    return data.clientSecret as string;
  }, [functionName, body]);

  return (
    <div className="min-h-[520px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
