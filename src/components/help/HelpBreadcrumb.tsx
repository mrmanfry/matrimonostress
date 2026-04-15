import { useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Props {
  categoryTitle?: string;
  categorySlug?: string;
  articleTitle?: string;
}

const HelpBreadcrumb = ({ categoryTitle, categorySlug, articleTitle }: Props) => {
  const navigate = useNavigate();

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            className="cursor-pointer"
            onClick={() => navigate("/help")}
          >
            Guida
          </BreadcrumbLink>
        </BreadcrumbItem>

        {categoryTitle && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {articleTitle ? (
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => {
                    if (categorySlug) {
                      const { helpCategories } = require("@/data/helpArticles");
                      const cat = helpCategories.find((c: any) => c.slug === categorySlug);
                      if (cat?.articles[0]) {
                        navigate(`/help/${categorySlug}/${cat.articles[0].slug}`);
                      }
                    }
                  }}
                >
                  {categoryTitle}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{categoryTitle}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}

        {articleTitle && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{articleTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default HelpBreadcrumb;
