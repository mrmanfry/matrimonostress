import { Card } from "@/components/ui/card";
import { Database, Zap, Eye, Shield } from "lucide-react";

const objectives = [
  {
    icon: Database,
    title: "Centralizzare",
    subtitle: "L'Unica Fonte di Verità",
    description: "Tutte le informazioni, documenti, decisioni e comunicazioni in un unico luogo. Niente più ricerca frenetica di preventivi persi o messaggi sparsi.",
    color: "text-accent",
  },
  {
    icon: Zap,
    title: "Automatizzare",
    subtitle: "Il Lavoro Sporco Digitale",
    description: "Promemoria automatici, aggiornamenti in tempo reale del budget, liste filtrate e solleciti agli invitati. Risparmiati decine di ore.",
    color: "text-gold",
  },
  {
    icon: Eye,
    title: "Chiarificare",
    subtitle: "Controllo Totale attraverso la Chiarezza",
    description: "Dashboard intuitive e indicatori visivi. Saprai sempre, a colpo d'occhio, quanto hai speso, quanti hanno confermato e quali sono le prossime scadenze.",
    color: "text-accent",
  },
  {
    icon: Shield,
    title: "Prevenire",
    subtitle: "Il Tuo Wedding Planner Virtuale",
    description: "Suggerimenti proattivi, checklist intelligente e best practice integrate. Evita le trappole più comuni prima ancora che si presentino.",
    color: "text-gold",
  },
];

const ValueProposition = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            I Nostri 4 Obiettivi Strategici
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Quattro pilastri interconnessi che costituiscono la nostra proposta di valore fondamentale
          </p>
        </div>

        {/* Objectives Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {objectives.map((objective, index) => {
            const Icon = objective.icon;
            return (
              <Card 
                key={index}
                className="p-8 bg-gradient-card border-2 hover:border-accent/50 transition-all hover:shadow-elegant group"
              >
                <div className="space-y-4">
                  {/* Icon */}
                  <div className="inline-flex p-3 rounded-xl bg-background shadow-soft group-hover:scale-110 transition-transform">
                    <Icon className={`w-8 h-8 ${objective.color}`} />
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{objective.title}</h3>
                    <p className="text-sm font-medium text-muted-foreground">{objective.subtitle}</p>
                  </div>

                  {/* Description */}
                  <p className="text-foreground/80 leading-relaxed">
                    {objective.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-muted-foreground italic">
            Perché il tuo matrimonio dovrebbe essere un'esperienza di <strong className="text-foreground">gioia</strong>, 
            non un secondo lavoro stressante.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ValueProposition;
