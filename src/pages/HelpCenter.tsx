import { useParams } from "react-router-dom";
import HelpSidebar from "@/components/help/HelpSidebar";
import HelpHome from "@/components/help/HelpHome";
import HelpArticleView from "@/components/help/HelpArticleView";
import { getArticle } from "@/data/helpArticles";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const HelpCenter = () => {
  const { category, article } = useParams();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const match = category && article ? getArticle(category, article) : undefined;

  const content = match ? (
    <HelpArticleView category={match.category} article={match.article} />
  ) : (
    <HelpHome />
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-semibold text-sm">Guida WedsApp</span>
        </header>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setSidebarOpen(false)}>
            <div
              className="w-72 h-full bg-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div onClick={() => setSidebarOpen(false)}>
                <HelpSidebar />
              </div>
            </div>
          </div>
        )}

        <main className="px-4 py-6">{content}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <HelpSidebar />
      <main className="flex-1 px-8 py-8 overflow-y-auto">{content}</main>
    </div>
  );
};

export default HelpCenter;
