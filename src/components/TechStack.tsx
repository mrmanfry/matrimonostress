import { Card } from "@/components/ui/card";
import { Shield, Lock, Cloud, Zap } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Dati Sempre Protetti",
    description:
      "Crittografia di livello bancario e conformità GDPR. Le vostre informazioni personali, i contratti e i dati dei vostri invitati sono al sicuro.",
  },
  {
    icon: Cloud,
    title: "Sempre Disponibile",
    description:
      "Accesso da qualsiasi dispositivo, ovunque voi siate. I vostri dati sono sincronizzati in tempo reale su telefono, tablet e computer.",
  },
  {
    icon: Zap,
    title: "Veloce e Affidabile",
    description:
      "Caricamenti istantanei e aggiornamenti in tempo reale. Nessuna attesa, nessun rallentamento, anche con centinaia di invitati.",
  },
  {
    icon: Lock,
    title: "Backup Automatici",
    description:
      "I vostri dati vengono salvati automaticamente ogni giorno. Non perderete mai una modifica, un contatto o un pagamento registrato.",
  },
];

const TechStack = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Sicurezza e Affidabilità
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            I Tuoi Dati Sono al Sicuro
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Costruito su fondamenta solide per darti tranquillità totale
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-8 bg-card border-2 hover:border-primary/30 transition-all hover:shadow-elegant group"
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-foreground/80 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TechStack;
