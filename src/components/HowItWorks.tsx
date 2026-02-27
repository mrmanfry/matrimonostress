import { Card } from "@/components/ui/card";
import { UserPlus, LayoutDashboard, PartyPopper, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "1",
    title: "Crea il Tuo Spazio",
    description:
      "Registrati gratis in 30 secondi. Inserisci la data del matrimonio e i nomi: il tuo spazio personale è pronto. Nessuna carta di credito, nessun vincolo.",
    color: "text-accent",
  },
  {
    icon: LayoutDashboard,
    step: "2",
    title: "Organizza Tutto",
    description:
      "Aggiungi invitati, fornitori e budget. La checklist intelligente ti guida passo passo. I pagamenti si calcolano automaticamente, i promemoria arrivano da soli.",
    color: "text-gold",
  },
  {
    icon: PartyPopper,
    step: "3",
    title: "Vivi Sereno",
    description:
      "Arriva al giorno del matrimonio con tutto sotto controllo. La timeline del giorno, i contatti dei fornitori e ogni dettaglio sempre a portata di mano.",
    color: "text-primary",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Come Funziona
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tre passi per trasformare il caos in serenità
          </p>
        </div>

        {/* Steps Flow */}
        <div className="relative">
          {/* Desktop Flow with Arrows */}
          <div className="hidden lg:flex items-center justify-center gap-4 mb-16">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="p-4 rounded-2xl bg-background shadow-elegant border-2 border-accent/20">
                        <Icon className={`w-12 h-12 ${item.color}`} />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center">
                        {item.step}
                      </div>
                    </div>
                    <p className="text-sm font-semibold mt-3">{item.title}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-8 h-8 text-muted-foreground mx-6" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Cards */}
          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={index}
                  className="p-8 bg-gradient-card border-2 hover:border-accent/50 transition-all hover:shadow-elegant"
                >
                  <div className="space-y-4">
                    {/* Icon with step number */}
                    <div className="flex items-center gap-3">
                      <div className="inline-flex p-3 rounded-xl bg-background shadow-soft">
                        <Icon className={`w-8 h-8 ${item.color}`} />
                      </div>
                      <span className="text-3xl font-bold text-muted-foreground/30">
                        {item.step}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold">{item.title}</h3>

                    {/* Description */}
                    <p className="text-foreground/80 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
