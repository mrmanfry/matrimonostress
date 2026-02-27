import { Button } from "@/components/ui/button";
import { Heart, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, hsl(250 40% 25%), hsl(270 35% 35%), hsl(260 30% 20%))',
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-16 left-1/4 w-64 h-64 rounded-full bg-white/8" />
      <div className="absolute top-1/3 left-1/2 w-40 h-40 rounded-full border border-white/10" />
      <div className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full bg-white/[0.03]" />

      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Content */}
      <div className="container relative z-10 px-4 py-20">
        {/* Top logo */}
        <div className="absolute top-8 left-4 md:left-8 flex items-center gap-3">
          <div className="relative p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg">
            <Heart className="w-6 h-6 text-white fill-white/70" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white/40 blur-[1px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-serif text-xl font-bold tracking-wider leading-none">
              WedsApp
            </span>
            <span className="text-white/40 text-[10px] font-medium tracking-[0.25em] uppercase leading-none mt-1">
              Wedding Planner
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8 pt-16">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white leading-tight">
            Il tuo matrimonio,{" "}
            <span className="text-white/80">sotto controllo.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Budget, invitati, fornitori e checklist in un unico posto.
            Niente più fogli Excel, chat infinite e notti insonni.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {["Tesoreria smart", "Lista invitati", "Gestione fornitori", "Checklist intelligente", "RSVP digitale"].map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm text-white/90 border border-white/10"
              >
                <Sparkles className="w-3 h-3" />
                {feature}
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-white text-[hsl(250_40%_25%)] hover:bg-white/90 font-semibold shadow-lg"
              asChild
            >
              <a href="/auth">
                <Heart className="w-5 h-5" />
                Inizia Gratis
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-2 border-white/30 text-white hover:bg-white/10 bg-transparent"
              asChild
            >
              <a href="#features">Scopri Come Funziona</a>
            </Button>
          </div>

          {/* Social proof */}
          <div className="pt-12 flex flex-col items-center gap-3">
            <div className="flex -space-x-2">
              {["L", "F", "G", "S", "M"].map((letter, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-white/20 bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-xs font-semibold"
                >
                  {letter}
                </div>
              ))}
              <div className="w-9 h-9 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 text-xs">
                +
              </div>
            </div>
            <p className="text-sm text-white/50">
              Coppie che hanno già scelto di organizzare senza stress
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
