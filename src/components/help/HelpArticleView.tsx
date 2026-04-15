import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HelpArticle, HelpCategory } from "@/data/helpArticles";
import HelpBreadcrumb from "./HelpBreadcrumb";
import HelpTableOfContents from "./HelpTableOfContents";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  category: HelpCategory;
  article: HelpArticle;
}

const HelpArticleView = ({ category, article }: Props) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>("");

  // Intersection observer for TOC highlighting
  useEffect(() => {
    const ids = article.sections.map(s => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [article]);

  // Prev / Next navigation
  const currentIdx = category.articles.findIndex(a => a.slug === article.slug);
  const prevArticle = currentIdx > 0 ? category.articles[currentIdx - 1] : null;
  const nextArticle = currentIdx < category.articles.length - 1 ? category.articles[currentIdx + 1] : null;

  return (
    <div className="flex gap-8 flex-1 min-w-0">
      {/* Main content */}
      <article className="flex-1 min-w-0 max-w-3xl">
        <HelpBreadcrumb
          categoryTitle={category.title}
          categorySlug={category.slug}
          articleTitle={article.title}
        />

        <h1 className="text-2xl font-bold text-foreground mb-2">{article.title}</h1>
        <p className="text-muted-foreground mb-8">{article.description}</p>

        <div className="space-y-8">
          {article.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20">
              <h2 className="text-lg font-semibold text-foreground mb-3 border-b border-border pb-2">
                {section.title}
              </h2>
              <div
                className="help-content prose prose-sm max-w-none text-foreground/90"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </section>
          ))}
        </div>

        {/* Prev / Next */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
          {prevArticle ? (
            <Button
              variant="ghost"
              className="gap-1"
              onClick={() => navigate(`/help/${category.slug}/${prevArticle.slug}`)}
            >
              <ChevronLeft className="h-4 w-4" />
              {prevArticle.title}
            </Button>
          ) : <div />}
          {nextArticle ? (
            <Button
              variant="ghost"
              className="gap-1"
              onClick={() => navigate(`/help/${category.slug}/${nextArticle.slug}`)}
            >
              {nextArticle.title}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : <div />}
        </div>
      </article>

      {/* TOC */}
      <HelpTableOfContents sections={article.sections} activeId={activeSection} />
    </div>
  );
};

export default HelpArticleView;
