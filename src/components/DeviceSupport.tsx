import { Card } from "@/components/ui/card";
import { Monitor, Smartphone, CheckCircle2 } from "lucide-react";

const platforms = [
  {
    icon: Monitor,
    title: "Desktop: La Tua Base Operativa",
    priority: "Ottimizzato Primario",
    description: "L'esperienza completa su schermo ampio. Gestione budget dettagliata, organizzazione tavoli con drag & drop, comparazione preventivi.",
    features: [
      "Dashboard completa con tutte le funzionalità",
      "Designer tavoli interattivo",
      "Gestione avanzata budget e fornitori",
      "Visualizzazioni e report dettagliati"
    ],
    gradient: "from-primary/10 to-accent/10",
  },
  {
    icon: Smartphone,
    title: "Mobile: Sempre con Te",
    priority: "Design Responsive",
    description: "Accesso in mobilità per consultazione e azioni rapide. Perfetto per controllare informazioni durante sopralluoghi o eventi.",
    features: [
      "Consultazione dashboard e informazioni chiave",
      "Modifica RSVP e task checklist al volo",
      "Ricerca contatti fornitori",
      "Timeline giorno del matrimonio sempre a portata"
    ],
    gradient: "from-accent/10 to-gold/10",
  },
];

const browsers = [
  "Google Chrome (ultime 2 versioni)",
  "Mozilla Firefox (ultime 2 versioni)",
  "Apple Safari (ultime 2 versioni)",
  "Microsoft Edge (ultime 2 versioni)"
];

const DeviceSupport = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Ovunque Tu Sia, Siamo con Te
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Un'esperienza ottimizzata per ogni dispositivo e contesto d'uso
          </p>
        </div>

        {/* Platforms */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {platforms.map((platform, index) => {
            const Icon = platform.icon;
            return (
              <Card 
                key={index}
                className={`p-8 bg-gradient-to-br ${platform.gradient} border-2 hover:border-accent/50 transition-all hover:shadow-elegant`}
              >
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-background shadow-soft">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <div className="inline-block px-3 py-1 rounded-full bg-accent/30 text-xs font-semibold text-foreground mb-2">
                        {platform.priority}
                      </div>
                      <h3 className="text-2xl font-bold">{platform.title}</h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-foreground/80 leading-relaxed">
                    {platform.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2">
                    {platform.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground/90">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Browser Support */}
        <div className="bg-gradient-card border-2 border-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">Browser Supportati</h3>
            <p className="text-muted-foreground">
              Compatibilità garantita con i browser moderni più diffusi
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {browsers.map((browser, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-lg bg-background/50 border border-border"
              >
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-sm font-medium">{browser}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progressive Web App Note */}
        <div className="mt-12 text-center p-6 rounded-xl bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Progressive Web App</strong> in arrivo: 
            esperienza simile ad un'app nativa, installabile sulla home screen del tuo smartphone, 
            senza bisogno di store.
          </p>
        </div>
      </div>
    </section>
  );
};

export default DeviceSupport;
