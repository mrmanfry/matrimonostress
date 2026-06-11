import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { T } from "@/components/landing/LandingTokens";
import { PageNav, LandingFooter } from "@/components/landing/PageChrome";
import { FinalCTA } from "@/components/landing/LandingSections";
import {
  getArticleBySlug,
  getRelatedArticles,
  type BlogArticle,
} from "@/data/blogArticles";

const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://wedsapp.it";

const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const setCanonical = (href: string) => {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const setJsonLd = (id: string, json: object) => {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
};

const useArticleSeo = (article: BlogArticle) => {
  useEffect(() => {
    const url = `${ORIGIN}/risorse/${article.slug}`;
    const title = `${article.title} — WedsApp`;
    document.title = title;
    setMeta("description", article.description);
    setMeta("og:title", title, "property");
    setMeta("og:description", article.description, "property");
    setMeta("og:type", "article", "property");
    setMeta("og:url", url, "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", article.description);
    setCanonical(url);

    setJsonLd("ld-article", {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      author: { "@type": "Organization", name: "WedsApp" },
      publisher: {
        "@type": "Organization",
        name: "WedsApp",
        url: ORIGIN,
      },
      mainEntityOfPage: url,
    });

    setJsonLd("ld-breadcrumb", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: ORIGIN },
        { "@type": "ListItem", position: 2, name: "Risorse", item: `${ORIGIN}/risorse` },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    });

    return () => {
      document.getElementById("ld-article")?.remove();
      document.getElementById("ld-breadcrumb")?.remove();
    };
  }, [article]);
};

const proseStyles = `
.wa-prose { font-family: ${T.fontUi}; color: ${T.ink}; font-size: 16px; line-height: 1.7; }
.wa-prose .lede { font-size: 18px; color: ${T.ink2}; margin: 0 0 28px; }
.wa-prose h2 { font-family: ${T.fontSerif}; font-weight: 500; font-size: 26px; letter-spacing: -0.01em; margin: 40px 0 14px; color: ${T.ink}; line-height: 1.25; }
.wa-prose h3 { font-family: ${T.fontSerif}; font-weight: 500; font-size: 20px; margin: 28px 0 10px; color: ${T.ink}; }
.wa-prose p { margin: 0 0 14px; color: ${T.ink2}; }
.wa-prose ul, .wa-prose ol { margin: 0 0 18px; padding-left: 22px; color: ${T.ink2}; }
.wa-prose li { margin-bottom: 6px; }
.wa-prose a { color: ${T.brandInk}; text-decoration: underline; text-underline-offset: 2px; }
.wa-prose a:hover { color: ${T.brandDeep}; }
.wa-prose strong { color: ${T.ink}; font-weight: 600; }
.wa-prose blockquote { margin: 20px 0; padding: 14px 18px; border-left: 3px solid ${T.brand}; background: ${T.brandTint}; border-radius: 6px; color: ${T.ink}; font-style: italic; }
.wa-prose .table-wrap { overflow-x: auto; margin: 18px -4px; -webkit-overflow-scrolling: touch; }
.wa-prose table { border-collapse: collapse; width: 100%; min-width: 480px; font-size: 14px; }
.wa-prose th, .wa-prose td { border: 1px solid ${T.border}; padding: 10px 12px; text-align: left; vertical-align: top; }
.wa-prose th { background: ${T.surfaceMuted}; font-weight: 600; color: ${T.ink}; }
@media (max-width: 720px) {
  .wa-prose { font-size: 15.5px; }
  .wa-prose h2 { font-size: 22px; }
  .wa-prose h3 { font-size: 18px; }
  .wa-prose .lede { font-size: 16.5px; }
}
`;

const RisorseArticle = () => {
  const { slug = "" } = useParams();
  const article = getArticleBySlug(slug);
  if (!article) return <Navigate to="/risorse" replace />;
  useArticleSeo(article);

  const related = getRelatedArticles(article.related);

  return (
    <div
      style={{
        background: T.bg,
        color: T.ink,
        fontFamily: T.fontUi,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{proseStyles}</style>
      <PageNav active="risorse" />

      <main>
        <article
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "clamp(28px, 6vw, 64px) clamp(20px, 5vw, 40px) 32px",
          }}
        >
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            style={{
              fontSize: 13,
              color: T.ink3,
              marginBottom: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            <Link to="/" style={{ color: T.ink3 }}>Home</Link>
            <span>›</span>
            <Link to="/risorse" style={{ color: T.ink3 }}>Risorse</Link>
            <span>›</span>
            <span style={{ color: T.ink2 }}>{article.category}</span>
          </nav>

          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 600,
              color: T.brandInk,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: T.brandTint,
              padding: "5px 11px",
              borderRadius: 999,
              border: "1px solid rgba(139,92,246,.18)",
              marginBottom: 14,
            }}
          >
            {article.category}
          </div>

          <h1
            style={{
              fontFamily: T.fontSerif,
              fontWeight: 400,
              fontSize: "clamp(28px, 5.5vw, 42px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              margin: "0 0 14px",
              color: T.ink,
            }}
          >
            {article.title}
          </h1>

          <div
            style={{
              fontSize: 13,
              color: T.ink3,
              fontFamily: T.fontMono,
              marginBottom: 28,
            }}
          >
            {article.readMinutes} min di lettura · Aggiornato{" "}
            {new Date(article.updatedAt).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>

          <div
            className="wa-prose"
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />

          {related.length > 0 && (
            <section
              style={{
                marginTop: 56,
                paddingTop: 32,
                borderTop: `1px solid ${T.border}`,
              }}
            >
              <h2
                style={{
                  fontFamily: T.fontSerif,
                  fontWeight: 500,
                  fontSize: 22,
                  margin: "0 0 18px",
                  color: T.ink,
                }}
              >
                Articoli correlati
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    to={`/risorse/${r.slug}`}
                    style={{
                      display: "block",
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: 12,
                      padding: 16,
                      textDecoration: "none",
                      boxShadow: T.shadowSm,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.brandInk,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {r.category}
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontSerif,
                        fontWeight: 500,
                        fontSize: 17,
                        color: T.ink,
                        lineHeight: 1.3,
                      }}
                    >
                      {r.title}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        <FinalCTA />
      </main>

      <LandingFooter />
    </div>
  );
};

export default RisorseArticle;
