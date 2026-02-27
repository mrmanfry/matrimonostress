import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-accent fill-accent" />
            <span className="text-xl font-bold">WedsApp</span>
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
