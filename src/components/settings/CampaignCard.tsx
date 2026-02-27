import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CalendarHeart, 
  Mail, 
  Settings2, 
  ExternalLink, 
  Play, 
  Pause, 
  Eye,
  ImageIcon,
  Users
} from "lucide-react";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface GiftInfo {
  enabled: boolean;
  message: string;
  couple_names: string;
  iban: string;
  bic_swift: string;
  bank_name: string;
  account_holder: string;
  registry_url: string | null;
}

export interface CampaignConfig {
  status: "draft" | "active" | "closed";
  enabled: boolean;
  hero_image_url: string | null;
  welcome_title: string;
  welcome_text: string;
  deadline_date: string | null;
  whatsapp_message_template?: string | null;
  faqs?: FAQItem[];
  gift_info?: GiftInfo;
}

export interface CampaignsConfig {
  save_the_date: CampaignConfig;
  rsvp: CampaignConfig;
  theme: {
    layout_mode: "immersive_scroll" | "classic";
    font_family: "serif" | "sans" | "elegant";
    primary_color: string;
    show_countdown: boolean;
    show_powered_by: boolean;
  };
}

interface CampaignCardProps {
  type: "save_the_date" | "rsvp";
  config: CampaignConfig;
  stats?: {
    sent: number;
    responded: number;
  };
  onConfigure: () => void;
  onPreview: () => void;
  onToggleStatus: () => void;
}

const CampaignCard = ({
  type,
  config,
  stats,
  onConfigure,
  onPreview,
  onToggleStatus,
}: CampaignCardProps) => {
  const isSTD = type === "save_the_date";
  
  const getStatusBadge = () => {
    switch (config.status) {
      case "draft":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">🟡 Bozza</Badge>;
      case "active":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">🟢 Attiva</Badge>;
      case "closed":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">⚫ Conclusa</Badge>;
    }
  };

  const Icon = isSTD ? CalendarHeart : Mail;
  const title = isSTD ? "Save The Date" : "Invito Ufficiale (RSVP)";
  const description = isSTD 
    ? "Anticipa la data del matrimonio ai tuoi invitati"
    : "Raccogli le conferme di partecipazione";

  return (
    <Card className="relative overflow-hidden">
      {/* Hero image preview thumbnail */}
      <div className="h-24 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative overflow-hidden">
        {config.hero_image_url ? (
          <img 
            src={config.hero_image_url} 
            alt="Preview" 
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
        )}
        <div className="absolute top-2 right-2">
          {getStatusBadge()}
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{stats.sent} inviati</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-emerald-600 dark:text-emerald-400">
                {stats.responded} risposte
              </span>
            </div>
          </div>
        )}
        
        {/* Deadline info */}
        {config.deadline_date && (
          <p className="text-sm text-muted-foreground">
            Scadenza: {new Date(config.deadline_date).toLocaleDateString("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </p>
        )}
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onConfigure}
            className="flex-1"
          >
            <Settings2 className="w-4 h-4 mr-1" />
            Configura
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPreview}
          >
            <Eye className="w-4 h-4 mr-1" />
            Anteprima
          </Button>
          
          {config.status !== "closed" && (
            <Button 
              variant={config.status === "active" ? "secondary" : "default"}
              size="sm"
              onClick={onToggleStatus}
            >
              {config.status === "active" ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pausa
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Attiva
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignCard;
