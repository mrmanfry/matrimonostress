import { cn } from "@/lib/utils";
import type { HelpSection } from "@/data/helpArticles";

interface Props {
  sections: HelpSection[];
  activeId?: string;
}

const HelpTableOfContents = ({ sections, activeId }: Props) => {
  if (sections.length < 2) return null;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="w-52 shrink-0 hidden xl:block">
      <div className="sticky top-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          In questa pagina
        </p>
        <ul className="space-y-1.5 border-l border-border pl-3">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => scrollTo(s.id)}
                className={cn(
                  "text-sm text-left w-full hover:text-foreground transition-colors leading-snug",
                  activeId === s.id
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default HelpTableOfContents;
