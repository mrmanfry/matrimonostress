import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Users, Image, ShieldCheck, AlertTriangle } from "lucide-react";

interface MemoriesKPIsProps {
  totalPhotos: number;
  totalParticipants: number;
  hardLimit: number;
  pendingApproval: number;
  requireApproval: boolean;
}

export default function MemoriesKPIs({
  totalPhotos,
  totalParticipants,
  hardLimit,
  pendingApproval,
  requireApproval,
}: MemoriesKPIsProps) {
  const usagePercent = hardLimit > 0 ? totalPhotos / hardLimit : 0;
  const isNearLimit = usagePercent >= 0.9 && usagePercent < 1;
  const isAtLimit = usagePercent >= 1;

  const kpis = [
    {
      label: "Foto scattate",
      value: totalPhotos,
      sub: `/ ${hardLimit} max`,
      icon: Image,
      badge: isAtLimit
        ? { label: "Rullino pieno", variant: "destructive" as const }
        : isNearLimit
          ? { label: "Quasi pieno", variant: "secondary" as const }
          : null,
    },
    {
      label: "Partecipanti",
      value: totalParticipants,
      icon: Users,
    },
    {
      label: "Scatti disponibili",
      value: Math.max(0, hardLimit - totalPhotos),
      icon: Camera,
    },
    ...(requireApproval
      ? [
          {
            label: "Da approvare",
            value: pendingApproval,
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <kpi.icon size={14} />
              <span className="text-xs">{kpi.label}</span>
              {"badge" in kpi && kpi.badge && (
                <Badge
                  variant={kpi.badge.variant}
                  className={`text-[10px] px-1.5 py-0 ${
                    kpi.badge.variant === "destructive" ? "" : "bg-orange-100 text-orange-700 border-orange-200"
                  }`}
                >
                  <AlertTriangle size={10} className="mr-0.5" />
                  {kpi.badge.label}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">
              {kpi.value}
              {"sub" in kpi && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {(kpi as any).sub}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
