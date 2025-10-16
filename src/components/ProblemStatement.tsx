import { Card } from "@/components/ui/card";
import { AlertTriangle, Banknote, Heart } from "lucide-react";

const problems = [
  {
    icon: AlertTriangle,
    title: "Inefficienza Operativa",
    issues: [
      "Excel come \"mostro\" multi-pagina impossibile da gestire",
      "Conferme RSVP disperse tra WhatsApp, email e telefonate",
      "Documenti e contratti sparsi ovunque, senza visione d'insieme"
    ],
    impact: "Il risultato? Un sistema caotico, inefficiente e prono all'errore.",
  },
  {
    icon: Banknote,
    title: "Rischio Finanziario",
    issues: [
      "Facile sforare il budget di migliaia di euro senza accorgersene",
      "Scadenze dei pagamenti scritte sui contratti ma non monitorate",
      "Nessuna visione aggregata delle spese reali vs previste"
    ],
    impact: "Dimenticare un pagamento può portare a penali o perdere un fornitore.",
  },
  {
    icon: Heart,
    title: "Stress Emotivo e Relazionale",
    issues: [
      "Centinaia di decisioni senza informazioni a portata di mano",
      "Partner non allineati, incomprensioni e discussioni",
      "Ansia costante di aver dimenticato un dettaglio fondamentale"
    ],
    impact: "La pressione può mettere a dura prova la relazione e i rapporti familiari.",
  },
];

const ProblemStatement = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Il Problema Reale</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Organizzare un Matrimonio Non Dovrebbe Essere Così
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Senza il supporto adeguato, la pianificazione diventa un problema complesso 
            che si articola su tre assi di criticità
          </p>
        </div>

        {/* Problems Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <Card 
                key={index}
                className="p-6 bg-card border-2 hover:border-destructive/30 transition-all"
              >
                <div className="space-y-4">
                  {/* Icon & Title */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <Icon className="w-6 h-6 text-destructive" />
                    </div>
                    <h3 className="text-xl font-bold flex-1">{problem.title}</h3>
                  </div>

                  {/* Issues List */}
                  <ul className="space-y-3">
                    {problem.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <span className="text-destructive mt-1">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Impact */}
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm font-medium text-destructive/90 italic">
                      {problem.impact}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Solution Teaser */}
        <div className="text-center p-8 rounded-2xl bg-gradient-hero border border-accent/20">
          <p className="text-xl font-semibold text-foreground mb-2">
            La Soluzione? Un Partner Digitale Completo.
          </p>
          <p className="text-muted-foreground">
            Nozze Senza Stress elimina questi problemi alla radice, restituendoti serenità e controllo.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProblemStatement;
