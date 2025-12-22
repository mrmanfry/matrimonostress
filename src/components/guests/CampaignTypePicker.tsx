import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Bell, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type CampaignType = 'save_the_date' | 'formal_invite' | 'reminder';

interface CampaignTypePickerProps {
  selected: CampaignType | null;
  onSelect: (type: CampaignType) => void;
}

export function CampaignTypePicker({ selected, onSelect }: CampaignTypePickerProps) {
  const campaignTypes = [
    {
      id: 'save_the_date' as CampaignType,
      title: '📅 Save The Date',
      description: 'Annuncia la data. Include sondaggio di interesse non vincolante.',
      icon: Calendar,
      color: 'violet',
      badge: 'Fase 1',
    },
    {
      id: 'formal_invite' as CampaignType,
      title: '💌 Invito Ufficiale',
      description: 'Richiedi conferma presenza, menu e allergie.',
      icon: Mail,
      color: 'blue',
      badge: 'Fase 2',
    },
    {
      id: 'reminder' as CampaignType,
      title: '🔔 Sollecito / Info',
      description: 'Ricorda di rispondere o invia info logistiche.',
      icon: Bell,
      color: 'amber',
      badge: 'Follow-up',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Che tipo di messaggio vuoi inviare?</h3>
        <p className="text-sm text-muted-foreground">
          Seleziona il tipo di campagna per personalizzare il messaggio e il link
        </p>
      </div>
      
      <div className="grid gap-4">
        {campaignTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selected === type.id;
          
          const colorClasses = {
            violet: {
              border: 'border-violet-300 dark:border-violet-700',
              bg: 'bg-violet-50 dark:bg-violet-950/30',
              icon: 'text-violet-600',
              ring: 'ring-violet-500',
            },
            blue: {
              border: 'border-blue-300 dark:border-blue-700',
              bg: 'bg-blue-50 dark:bg-blue-950/30',
              icon: 'text-blue-600',
              ring: 'ring-blue-500',
            },
            amber: {
              border: 'border-amber-300 dark:border-amber-700',
              bg: 'bg-amber-50 dark:bg-amber-950/30',
              icon: 'text-amber-600',
              ring: 'ring-amber-500',
            },
          }[type.color];
          
          return (
            <Card
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && [colorClasses.bg, colorClasses.border, "ring-2", colorClasses.ring],
                !isSelected && "hover:border-primary/50"
              )}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  colorClasses.bg
                )}>
                  <Icon className={cn("w-6 h-6", colorClasses.icon)} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{type.title}</h4>
                    <Badge variant="outline" className="text-[10px]">
                      {type.badge}
                    </Badge>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
