import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Users, Image, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";

interface MemoriesKPIsProps {
  totalPhotos: number;
  totalParticipants: number;
  hardLimit: number;
  pendingApproval: number;
  requireApproval: boolean;
  unlockedPhotoLimit: number;
  onUpgradeClick?: () => void;
}

function getTierName(limit: number) {
  if (limit >= 2500) return "Premium";
  if (limit >= 1500) return "Plus";
  if (limit >= 500) return "Starter";
  return "Base";
}

export default function MemoriesKPIs({
  totalPhotos,
  totalParticipants,
  hardLimit,
  pendingApproval,
  requireApproval,
  unlockedPhotoLimit,
  onUpgradeClick,
}: MemoriesKPIsProps) {
  const hiddenPhotos = Math.max(0, totalPhotos - unlockedPhotoLimit);
  const canUpgrade = unlockedPhotoLimit < 2500;
  const tierName = getTierName(unlockedPhotoLimit);

  const kpis = [
    {
      label: "Foto visibili",
      value: Math.min(totalPhotos, unlockedPhotoLimit),
      sub: `/ ${totalPhotos} scattate`,
      icon: Image,
      badge: hiddenPhotos > 0
        ? { label: `+${hiddenPhotos} da sbloccare`, variant: "secondary" as const, icon: Sparkles }
        : null,
    },
    {
      label: "Partecipanti",
      value: totalParticipants,
      icon: Users,
    },
    {
      label: "Limite foto",
      value: unlockedPhotoLimit,
      sub: `Piano ${tierName}`,
      icon: Camera,
      badge: canUpgrade
        ? { label: "Upgrade", variant: "secondary" as const, icon: Sparkles, clickable: true }
        : null,
    },
    ...(requireApproval
      ? [{ label: "Da approvare", value: pendingApproval, icon: ShieldCheck }]
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
            </div>
            <p className="text-2xl font-bold">
              {kpi.value}
              {"sub" in kpi && kpi.sub && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {kpi.sub}
                </span>
              )}
            </p>
            {"badge" in kpi && kpi.badge && (
              <Badge
                variant={kpi.badge.variant}
                className={`text-[10px] px-1.5 py-0 mt-1 ${
                  kpi.badge.icon === Sparkles
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-orange-100 text-orange-700 border-orange-200"
                } ${"clickable" in kpi.badge && kpi.badge.clickable ? "cursor-pointer hover:bg-primary/20" : ""}`}
                onClick={"clickable" in kpi.badge && kpi.badge.clickable ? onUpgradeClick : undefined}
              >
                {kpi.badge.icon && <kpi.badge.icon size={10} className="mr-0.5" />}
                {kpi.badge.label}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
