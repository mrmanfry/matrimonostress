import { Card } from "@/components/ui/card";
import { Users, Clock } from "lucide-react";

const personas = [
  {
    icon: Users,
    name: "Organizzate tutto da soli",
    description:
      "Siete una coppia che vuole avere il controllo su ogni dettaglio. Avete 150 invitati, un budget da rispettare e vi ritrovate sommersi da Excel, chat di WhatsApp e preventivi in PDF. Cercate uno strumento potente che vi faccia sentire in controllo, non più in balia degli eventi.",
    needs: [
      "Un posto unico per budget, invitati e fornitori",
      "Visione chiara delle scadenze e dei pagamenti",
      "Automazioni che vi facciano risparmiare ore",
    ],
    gradient: "from-accent/20 to-gold/20",
  },
  {
    icon: Clock,
    name: "Avete poco tempo",
    description:
      "Lavorate entrambi e il tempo è la vostra risorsa più scarsa. Amate l'idea di un matrimonio curato ma vi sentite sopraffatti. Avete bisogno di una guida chiara che vi dica cosa fare, quando farlo, e che vi tolga il peso delle cose ripetitive.",
    needs: [
      "Checklist intelligente che vi guida passo passo",
      "Promemoria automatici per non dimenticare nulla",
      "Interfaccia semplice da usare anche di fretta",
    ],
    gradient: "from-gold/20 to-accent/20",
  },
];

const TargetAudience = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Pensato per Voi
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Che organizziate tutto da soli o abbiate poco tempo, 
            siamo qui per rendere tutto più semplice
          </p>
        </div>

        {/* Personas Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {personas.map((persona, index) => {
            const Icon = persona.icon;
            return (
              <Card
                key={index}
                className={`p-8 bg-gradient-to-br ${persona.gradient} border-2 hover:border-accent/50 transition-all hover:shadow-elegant`}
              >
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-background shadow-soft">
                      <Icon className="w-7 h-7 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{persona.name}</h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-foreground/80 leading-relaxed">
                    {persona.description}
                  </p>

                  {/* Needs */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground/70">
                      Cosa vi serve
                    </h4>
                    <ul className="space-y-2">
                      {persona.needs.map((need, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground/90"
                        >
                          <span className="text-accent mt-0.5">✓</span>
                          <span>{need}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bottom Message */}
        <div className="text-center mt-16">
          <p className="text-lg text-muted-foreground">
            Indipendentemente dalla vostra situazione,{" "}
            <strong className="text-foreground">WedsApp</strong> si
            adatta alle vostre esigenze.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TargetAudience;
