import { isTestMode } from "@/lib/stripe";

/**
 * Banner mostrato in modalità test pagamenti.
 * Non renderizza nulla in produzione (live).
 */
export function PaymentTestModeBanner() {
  if (!isTestMode()) return null;

  return (
    <div className="w-full bg-warning/15 border-b border-warning/30 px-4 py-2 text-center text-xs text-foreground">
      Modalità test pagamenti attiva — usa la carta <strong>4242 4242 4242 4242</strong>, qualsiasi data futura e CVC.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Maggiori info
      </a>
    </div>
  );
}
