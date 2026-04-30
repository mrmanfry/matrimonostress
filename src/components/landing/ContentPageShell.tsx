import { ReactNode, useEffect } from "react";
import { T } from "@/components/landing/LandingTokens";
import { PageNav, PageHero, LandingFooter } from "@/components/landing/PageChrome";
import { FinalCTA } from "@/components/landing/LandingSections";

type ActiveKey = "funzionalita" | "come-funziona" | "prezzi" | "risorse";

interface Props {
  active: ActiveKey;
  eyebrow: string;
  heroTitle: ReactNode;
  heroLede: string;
  metaTitle: string;
  metaDescription: string;
  children: ReactNode;
}

const ContentPageShell = ({
  active,
  eyebrow,
  heroTitle,
  heroLede,
  metaTitle,
  metaDescription,
  children,
}: Props) => {
  useEffect(() => {
    document.title = metaTitle;
    const meta =
      document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    meta.setAttribute("content", metaDescription);
    if (!meta.parentNode) document.head.appendChild(meta);
  }, [metaTitle, metaDescription]);

  return (
    <div
      style={{
        background: T.bg,
        color: T.ink,
        fontFamily: T.fontUi,
        fontSize: 15,
        lineHeight: 1.55,
        WebkitFontSmoothing: "antialiased",
        minHeight: "100vh",
      }}
    >
      <PageNav active={active} />
      <main>
        <PageHero eyebrow={eyebrow} title={heroTitle} lede={heroLede} />
        {children}
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
};

export default ContentPageShell;
