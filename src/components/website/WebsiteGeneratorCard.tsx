import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import WebsiteSetupWizard from "./WebsiteSetupWizard";

interface Props {
  weddingId: string;
}

const WebsiteGeneratorCard = ({ weddingId }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card className="p-4 md:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-6 h-6 text-primary" />
            <h3 className="text-lg md:text-xl font-semibold">Sito Web Magico con AI</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Genera un sito web bellissimo per il tuo matrimonio in un solo clic, ottimizzato per smartphone e pronto per ricevere le conferme degli invitati.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full">
          <Wand2 className="w-4 h-4 mr-2" />
          Genera Sito Ora
        </Button>
      </Card>

      <WebsiteSetupWizard
        weddingId={weddingId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};

export default WebsiteGeneratorCard;
