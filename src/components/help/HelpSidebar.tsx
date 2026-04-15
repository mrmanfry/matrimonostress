import { useNavigate, useParams } from "react-router-dom";
import { helpCategories } from "@/data/helpArticles";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";

const HelpSidebar = () => {
  const navigate = useNavigate();
  const { category: activeCategory, article: activeArticle } = useParams();
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  useEffect(() => {
    if (activeCategory && !openCategories.includes(activeCategory)) {
      setOpenCategories(prev => [...prev, activeCategory]);
    }
  }, [activeCategory]);

  const toggleCategory = (slug: string) => {
    setOpenCategories(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  return (
    <nav className="w-64 shrink-0 border-r border-border bg-card/50 overflow-y-auto h-full">
      <div className="p-4">
        <button
          onClick={() => navigate("/help")}
          className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
        >
          📖 Guida WedsApp
        </button>
      </div>

      <div className="px-2 pb-6 space-y-0.5">
        {helpCategories.map((cat) => {
          const Icon = cat.icon;
          const isOpen = openCategories.includes(cat.slug);
          const isCatActive = activeCategory === cat.slug;

          return (
            <Collapsible
              key={cat.slug}
              open={isOpen}
              onOpenChange={() => toggleCategory(cat.slug)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium hover:bg-muted/40 transition-colors text-left">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className={cn("flex-1", isCatActive && "text-primary")}>
                  {cat.title}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-6 border-l border-border pl-3 py-1 space-y-0.5">
                  {cat.articles.map((art) => {
                    const isActive = activeCategory === cat.slug && activeArticle === art.slug;
                    return (
                      <button
                        key={art.slug}
                        onClick={() => navigate(`/help/${cat.slug}/${art.slug}`)}
                        className={cn(
                          "block w-full text-left px-2 py-1.5 rounded text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        {art.title}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </nav>
  );
};

export default HelpSidebar;
