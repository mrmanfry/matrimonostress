import Logo from "@/components/Logo";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
  showWordmark?: boolean;
}

/**
 * Landing-page wrapper around the shared <Logo /> component.
 * Uses the official horizontal SVG (transparent background).
 */
const LandingLogo = ({ size = "md", onDark = false }: LogoProps) => {
  const h = size === "lg" ? 56 : size === "md" ? 44 : 36;
  return (
    <a
      href="/"
      aria-label="WedsApp — Home"
      style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
    >
      <Logo variant={onDark ? "white" : "horizontal"} size={h} />
    </a>
  );
};

export default LandingLogo;
