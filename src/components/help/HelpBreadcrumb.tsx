import { useNavigate } from "react-router-dom";
import { getCategoryBySlug } from "@/data/helpArticles";
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
                      const cat = getCategoryBySlug(categorySlug);
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
