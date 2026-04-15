import { useNavigate } from "react-router-dom";
import { helpCategories } from "@/data/helpArticles";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const HelpHome = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Centro Assistenza WedsApp
        </h1>
        <p className="text-muted-foreground text-lg">
          Tutto quello che ti serve per organizzare il tuo matrimonio senza stress.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {helpCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card
              key={cat.slug}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
              onClick={() => {
                const firstArticle = cat.articles[0];
                if (firstArticle) {
                  navigate(`/help/${cat.slug}/${firstArticle.slug}`);
                }
              }}
            >
              <CardHeader className="p-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{cat.title}</CardTitle>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {cat.description}
                </CardDescription>
                <div className="text-xs text-muted-foreground mt-2">
                  {cat.articles.length} {cat.articles.length === 1 ? "articolo" : "articoli"}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default HelpHome;
