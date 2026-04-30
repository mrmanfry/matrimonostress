import Logo from "@/components/Logo";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
  showWordmark?: boolean;
}

/**
 * Landing-page wrapper around the shared <Logo /> component.
 * Uses the official horizontal SVG (transparent background).
 * - sm: navbar (32px mobile / 40px desktop)
 * - md: 44px (used in footers / on-dark sections)
 * - lg: 56px (hero areas)
 */
const LandingLogo = ({ size = "md", onDark = false }: LogoProps) => {
  const variant = onDark ? "white" : "horizontal";
  const baseHeight = size === "lg" ? 56 : size === "md" ? 44 : 32;
  const responsiveClass =
    size === "sm" ? "!h-8 md:!h-10" : undefined;
  return (
    <a
      href="/"
      aria-label="WedsApp — Home"
      style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
    >
      <Logo variant={variant} size={baseHeight} className={responsiveClass} />
    </a>
  );
};

export default LandingLogo;
