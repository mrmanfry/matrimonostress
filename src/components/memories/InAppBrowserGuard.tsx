import { useState, useEffect, useMemo } from "react";

/**
 * Detects if the page is running inside an in-app browser (Instagram, Facebook, etc.)
 * and shows a warning to open in Safari/Chrome.
 */
export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || navigator.vendor || "";
  const rules = [
    "FBAN", "FBAV", // Facebook
    "Instagram",
    "Line/",
    "Twitter",
    "MicroMessenger", // WeChat
    "Snapchat",
    "Pinterest",
    "LinkedIn",
  ];
  return rules.some((r) => ua.includes(r));
}

interface InAppBrowserGuardProps {
  cameraUrl: string;
  children: React.ReactNode;
}

export default function InAppBrowserGuard({
  cameraUrl,
  children,
}: InAppBrowserGuardProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsBlocked(isInAppBrowser());
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cameraUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isBlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 text-center z-50">
      <div className="text-6xl mb-6">📷</div>
      <h1 className="text-white text-2xl font-bold mb-3">
        Apri in Safari o Chrome
      </h1>
      <p className="text-white/70 text-sm mb-6 max-w-xs">
        La fotocamera non funziona nei browser integrati nelle app (Instagram,
        Facebook, ecc.). Copia il link e aprilo nel tuo browser preferito.
      </p>
      <button
        onClick={handleCopy}
        className="bg-white text-black font-semibold px-6 py-3 rounded-full text-sm active:scale-95 transition-transform"
      >
        {copied ? "✓ Link copiato!" : "Copia il link"}
      </button>
      <p className="text-white/40 text-xs mt-4 max-w-xs">
        Poi incollalo nella barra degli indirizzi di Safari o Chrome
      </p>
    </div>
  );
}
