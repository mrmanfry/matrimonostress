import { CSSProperties } from "react";

export type LogoVariant = "horizontal" | "vertical" | "icon" | "white";

interface LogoProps {
  variant?: LogoVariant;
  /** Height in pixels (width is auto) */
  size?: number;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

const SRC: Record<LogoVariant, string> = {
  horizontal: "/brand/svg/wedsapp-logo-horizontal.svg",
  vertical: "/brand/svg/wedsapp-logo-vertical.svg",
  icon: "/brand/svg/wedsapp-icon.svg",
  white: "/brand/svg/wedsapp-logo-white.svg",
};

/**
 * Reusable WedsApp brand logo. Always renders the SVG asset directly,
 * never wrapped in a colored background.
 */
const Logo = ({
  variant = "horizontal",
  size = 40,
  className,
  style,
  alt = "WedsApp",
}: LogoProps) => (
  <img
    src={SRC[variant]}
    alt={alt}
    className={className}
    style={{
      height: size,
      width: "auto",
      display: "block",
      ...style,
    }}
  />
);

export default Logo;
