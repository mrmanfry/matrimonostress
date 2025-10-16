import { Card } from "@/components/ui/card";
import { Monitor, Server, Database, ArrowRight } from "lucide-react";

const architecture = [
  {
    icon: Monitor,
    title: "La Tua Interfaccia",
    subtitle: "Front-end Moderno",
    description: "Un'esperienza fluida e reattiva nel tuo browser. Nessun caricamento continuo, feedback immediato ad ogni azione. Come un'app desktop, ma senza installazioni.",
    color: "text-accent",
  },
  {
    icon: Server,
    title: "Il Cervello",
    subtitle: "Back-end Intelligente",
    description: "Elabora i tuoi dati, calcola automaticamente i budget, applica le regole di sicurezza e invia notifiche al momento giusto. Tutto in background, senza che tu debba pensarci.",
    color: "text-gold",
  },
  {
    icon: Database,
    title: "Il Magazzino Sicuro",
    subtitle: "Database Protetto",
    description: "Tutti i tuoi dati in un luogo sicuro e sempre disponibile. Backup automatici, crittografia e protezione garantita. Il tuo matrimonio è al sicuro.",
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
            Un'Architettura Pensata per la Semplicità
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tecnologia all'avanguardia nascosta dietro un'interfaccia intuitiva. 
            Tu organizzi, noi gestiamo la complessità tecnica.
          </p>
        </div>

        {/* Architecture Flow */}
        <div className="relative">
          {/* Desktop Flow with Arrows */}
          <div className="hidden lg:flex items-center justify-center gap-4 mb-16">
            {architecture.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-2xl bg-background shadow-elegant border-2 border-accent/20`}>
                      <Icon className={`w-12 h-12 ${item.color}`} />
                    </div>
                    <p className="text-sm font-semibold mt-3">{item.title}</p>
                  </div>
                  {index < architecture.length - 1 && (
                    <ArrowRight className="w-8 h-8 text-muted-foreground mx-6" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Architecture Cards */}
          <div className="grid lg:grid-cols-3 gap-8">
            {architecture.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={index}
                  className="p-8 bg-gradient-card border-2 hover:border-accent/50 transition-all hover:shadow-elegant"
                >
                  <div className="space-y-4">
                    {/* Icon */}
                    <div className="inline-flex p-3 rounded-xl bg-background shadow-soft">
                      <Icon className={`w-8 h-8 ${item.color}`} />
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{item.title}</h3>
                      <p className="text-sm font-medium text-muted-foreground">{item.subtitle}</p>
                    </div>

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

        {/* Bottom Message */}
        <div className="text-center mt-16 p-8 rounded-2xl bg-gradient-hero border border-accent/20">
          <h3 className="text-2xl font-bold mb-3">Tecnologia Gestita, Tu Pensi al Matrimonio</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Server, database, backup, sicurezza e aggiornamenti sono completamente gestiti dalla piattaforma. 
            Tu concentrati solo su ciò che conta: il tuo giorno speciale.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
