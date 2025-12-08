import { User, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OwnerSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  partner1Name?: string;
  partner2Name?: string;
  disabled?: boolean;
}

export function OwnerSelector({ 
  value, 
  onChange, 
  partner1Name = "Partner 1",
  partner2Name = "Partner 2",
  disabled = false 
}: OwnerSelectorProps) {
  return (
    <Select 
      value={value || "both"} 
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Assegna a..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="both">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Entrambi</span>
          </div>
        </SelectItem>
        <SelectItem value="partner1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{partner1Name}</span>
          </div>
        </SelectItem>
        <SelectItem value="partner2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{partner2Name}</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export function OwnerBadge({ owner, partner1Name, partner2Name }: { 
  owner: string | null; 
  partner1Name?: string;
  partner2Name?: string;
}) {
  const config = {
    partner1: { icon: User, label: partner1Name || "Partner 1" },
    partner2: { icon: User, label: partner2Name || "Partner 2" },
    both: { icon: Users, label: "Entrambi" },
  };

  const o = owner || "both";
  const { icon: Icon, label } = config[o as keyof typeof config] || config.both;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}
