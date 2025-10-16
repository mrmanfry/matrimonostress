import { Card } from "@/components/ui/card";
import { Users, Briefcase } from "lucide-react";

const personas = [
  {
    icon: Users,
    name: "I Pianificatori Digitali",
    profiles: "Luca & Sofia, 29-32 anni",
    who: "Professionisti tech-savvy (Project Manager, Marketing Specialist) abituati a strumenti digitali per ottimizzare lavoro e vita privata.",
    goals: "Vogliono uno strumento potente, flessibile e integrato per gestire il matrimonio come un vero progetto. Cercano funzionalità avanzate: filtri, esportazioni, automazioni.",
    frustrations: "Odiano perdita di tempo, dati duplicati e strumenti lenti. La loro paura: un dettaglio che va storto per disattenzione.",
    gradient: "from-accent/20 to-gold/20",
  },
  {
    icon: Briefcase,
    name: "La Coppia Sopraffatta",
    profiles: "Marco & Giulia, 33-36 anni",
    who: "Professionisti con carriere impegnative (Medico, Avvocato) che hanno poco tempo. Amano l'idea di un matrimonio curato ma si sentono sopraffatti.",
    goals: "Hanno bisogno di una guida chiara e semplice. Desiderano uno strumento che li prenda per mano, che dica loro cosa fare e quando.",
    frustrations: "Si sentono persi e non sanno da dove iniziare. La loro paura: l'ignoto e sentirsi costantemente in ritardo.",
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
            Per Chi Abbiamo Creato Questa Soluzione
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Due personas primarie che guidano lo sviluppo e il design del prodotto
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
                      <h3 className="text-2xl font-bold mb-1">{persona.name}</h3>
                      <p className="text-sm font-medium text-muted-foreground">{persona.profiles}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground/70 mb-2">Chi sono</h4>
                      <p className="text-foreground/90 leading-relaxed">{persona.who}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground/70 mb-2">Obiettivi</h4>
                      <p className="text-foreground/90 leading-relaxed">{persona.goals}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground/70 mb-2">Frustrazioni</h4>
                      <p className="text-foreground/90 leading-relaxed">{persona.frustrations}</p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bottom Message */}
        <div className="text-center mt-16">
          <p className="text-lg text-muted-foreground">
            Indipendentemente dal tuo profilo, <strong className="text-foreground">Nozze Senza Stress</strong> si 
            adatta alle tue esigenze, offrendoti il giusto livello di guida e controllo.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TargetAudience;
