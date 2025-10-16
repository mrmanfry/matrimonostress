import { Card } from "@/components/ui/card";
import { Shield, Zap, Cloud, Lock } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Affidabilità Garantita",
    description: "Infrastruttura enterprise gestita e monitorata 24/7. Backup automatici quotidiani e ridondanza dei dati.",
  },
  {
    icon: Lock,
    title: "Sicurezza Totale",
    description: "Crittografia end-to-end, autenticazione robusta e conformità GDPR. I tuoi dati sono protetti come quelli di una banca.",
  },
  {
    icon: Zap,
    title: "Prestazioni Eccellenti",
    description: "Architettura moderna e ottimizzata. Caricamenti istantanei, aggiornamenti in tempo reale, zero lag.",
  },
  {
    icon: Cloud,
    title: "Sempre Disponibile",
    description: "Accesso da qualsiasi dispositivo, ovunque tu sia. I tuoi dati sincronizzati in tempo reale su tutti i device.",
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
            <span className="text-sm font-medium text-primary">Piattaforma Lovable</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Costruita su Fondamenta Solide
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            La potenza di una piattaforma enterprise, l'eleganza di un'interfaccia moderna
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

        {/* Tech Details */}
        <div className="mt-16 text-center space-y-6">
          <div className="p-8 rounded-2xl bg-gradient-card border border-border">
            <h3 className="text-2xl font-bold mb-4">Tecnologia All'Avanguardia</h3>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div>
                <h4 className="font-semibold text-primary mb-2">Front-end Moderno</h4>
                <p className="text-sm text-muted-foreground">
                  Single Page Application (SPA) per un'esperienza fluida e reattiva. 
                  Nessun refresh, feedback immediato.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">API Robuste</h4>
                <p className="text-sm text-muted-foreground">
                  Back-end scalabile che gestisce logica di business, automazioni 
                  e integrazioni in modo sicuro.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Database Professionale</h4>
                <p className="text-sm text-muted-foreground">
                  Struttura dati ottimizzata, backup automatici e protezione 
                  garantita per ogni informazione.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechStack;
