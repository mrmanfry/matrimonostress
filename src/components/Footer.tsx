import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <div className="relative p-3 rounded-2xl bg-accent/10 border border-accent/15">
              <Heart className="w-6 h-6 text-accent fill-accent/70" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent/40 blur-[1px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-wider leading-none">WedsApp</span>
              <span className="text-muted-foreground text-[10px] font-medium tracking-[0.25em] uppercase leading-none mt-1">Wedding Planner</span>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-muted-foreground max-w-md">
            Il tuo partner digitale per organizzare il matrimonio perfetto,
            in tutta serenità e controllo.
          </p>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a
              href="/auth"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Accedi / Registrati
            </a>
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Funzionalità
            </a>
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t border-border w-full">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} WedsApp. Fatto con amore
              in Italia.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
