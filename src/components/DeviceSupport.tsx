import { Monitor, Smartphone } from "lucide-react";

const DeviceSupport = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="rounded-2xl bg-gradient-card border border-border p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            {/* Icons */}
            <div className="flex gap-4 flex-shrink-0">
              <div className="p-3 rounded-xl bg-primary/10">
                <Monitor className="w-8 h-8 text-primary" />
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <Smartphone className="w-8 h-8 text-accent" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">
                Funziona su Tutti i Dispositivi
              </h3>
              <p className="text-foreground/70 leading-relaxed max-w-xl">
                Desktop per la gestione completa, smartphone per consultare e agire al volo.
                Nessuna app da scaricare: apri il browser e sei operativo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeviceSupport;
