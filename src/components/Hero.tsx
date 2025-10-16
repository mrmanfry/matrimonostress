import { Button } from "@/components/ui/button";
import { Heart, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-wedding.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/85" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-foreground">Il tuo matrimonio senza stress</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Nozze Senza{" "}
            <span className="bg-gradient-to-r from-accent via-gold to-accent bg-clip-text text-transparent">
              Stress
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Trasforma l'organizzazione del tuo matrimonio da un incubo stressante 
            in un'esperienza di <strong className="text-foreground">pianificazione controllata</strong>, 
            collaborativa e gioiosa.
          </p>

          {/* Value Proposition */}
          <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
            Non un semplice software, ma il tuo <em className="text-accent font-semibold">partner digitale</em> che 
            ti affianca in ogni fase del percorso, garantendo che arriviate al vostro giorno speciale 
            non solo preparati, ma anche <strong className="text-foreground">sereni</strong>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button size="lg" variant="hero" className="text-lg px-8 py-6" asChild>
              <a href="/auth">
                <Heart className="w-5 h-5" />
                Inizia Gratis
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2" asChild>
              <a href="#features">Scopri Come Funziona</a>
            </Button>
          </div>

          {/* Social Proof */}
          <p className="text-sm text-muted-foreground pt-8">
            Unisciti alle <strong className="text-foreground">centinaia di coppie</strong> che hanno organizzato 
            il loro matrimonio perfetto, senza stress
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
