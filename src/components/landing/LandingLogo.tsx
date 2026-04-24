import logoSrc from "@/assets/wedsapp-logo.png";
import { T } from "./LandingTokens";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
  showWordmark?: boolean;
}

// Logo WedsApp: usa l'immagine ufficiale fornita dall'utente (anelli intrecciati + wordmark).
// L'immagine include già il wordmark, quindi mostriamo solo l'immagine in dimensione adeguata.
const LandingLogo = ({ size = "md", onDark = false }: LogoProps) => {
  const h = size === "lg" ? 96 : size === "md" ? 72 : 56;
  return (
    <a
      href="/"
      aria-label="WedsApp — Home"
      style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
    >
      <img
        src={logoSrc}
        alt="WedsApp"
        style={{
          height: h,
          width: "auto",
          display: "block",
          filter: onDark ? "brightness(0) invert(1)" : "none",
        }}
      />
    </a>
  );
};

export default LandingLogo;
