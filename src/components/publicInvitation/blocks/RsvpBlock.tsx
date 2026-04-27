import { useState } from "react";
import { Loader2, Check, X, Utensils, ChevronDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { RsvpBlock } from "@/lib/invitationBlocks/types";
import { type WeddingPublicData, applyStyle } from "./_shared";

export interface GuestMember {
  id: string;
  first_name: string;
  last_name: string;
  alias?: string | null;
  rsvp_status: string;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  is_child: boolean;
  allow_plus_one: boolean;
  plus_one_name: string | null;
  plus_one_menu: string | null;
}

export interface MemberData {
  rsvpStatus: "pending" | "confirmed" | "declined";
  isVegetarian: boolean;
  isVegan: boolean;
  dietaryRestrictions: string;
  hasPlusOne: boolean;
  plusOneName: string;
  plusOneMenu: string;
}

interface DietaryOptionConfig {
  id: string;
  label: string;
  enabled: boolean;
  is_custom: boolean;
}

interface CateringConfig {
  dietary_options?: DietaryOptionConfig[];
  show_allergy_field?: boolean;
  show_dietary_notes?: boolean;
}

interface Props {
  block: RsvpBlock;
  wedding: WeddingPublicData;
  members: GuestMember[];
  memberData: Record<string, MemberData>;
  onMemberDataChange: (data: Record<string, MemberData>) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  isReadOnly?: boolean;
  deadlineDate?: string | null;
  cateringConfig?: CateringConfig | null;
}

export function RsvpBlockView({
  block,
  wedding,
  members,
  memberData,
  onMemberDataChange,
  onSubmit,
  submitting,
  isReadOnly,
  deadlineDate,
  cateringConfig,
}: Props) {
  if (!block.visible) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#fafaf9" });

  const sortedMembers = [...members].sort((a, b) => {
    if (a.is_child !== b.is_child) return a.is_child ? 1 : -1;
    return (a.first_name || "").localeCompare(b.first_name || "", "it", { sensitivity: "base" });
  });

  const handleStatusChange = (memberId: string, status: "confirmed" | "declined") => {
    onMemberDataChange({
      ...memberData,
      [memberId]: { ...memberData[memberId], rsvpStatus: status },
    });
  };

  const handleFieldChange = <K extends keyof MemberData>(
    memberId: string,
    field: K,
    value: MemberData[K]
  ) => {
    onMemberDataChange({
      ...memberData,
      [memberId]: { ...memberData[memberId], [field]: value },
    });
  };

  return (
    <section id="rsvp-section" className={`${padY} px-6`} style={containerStyle}>
      <div className="max-w-lg mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h2 className="font-cormorant text-3xl sm:text-4xl font-light" style={{ color: primaryColor }}>
            {config.title}
          </h2>
          <p className="text-stone-600">{config.welcomeMessage}</p>
          {deadlineDate && (
            <p className="text-sm text-stone-500">
              {config.deadlineLabel}{" "}
              {new Date(deadlineDate).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {isReadOnly && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700 text-sm">
              Il termine per rispondere è scaduto. Le risposte non possono più essere modificate.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {sortedMembers.map((member) => {
            const data = memberData[member.id];
            const isConfirmed = data?.rsvpStatus === "confirmed";
            const isDeclined = data?.rsvpStatus === "declined";

            return (
              <div
                key={member.id}
                className={cn(
                  "bg-white rounded-xl shadow-sm border transition-all overflow-hidden",
                  isConfirmed && "border-green-200",
                  isDeclined && "border-red-200"
                )}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                        isConfirmed && "bg-green-500",
                        isDeclined && "bg-red-400",
                        !isConfirmed && !isDeclined && "bg-stone-300"
                      )}
                    >
                      {member.first_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">
                        {member.first_name} {member.last_name}
                      </p>
                      {member.is_child && (
                        <span className="text-xs text-stone-500">{config.childLabel}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => !isReadOnly && handleStatusChange(member.id, "confirmed")}
                      disabled={isReadOnly}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        isConfirmed
                          ? "bg-green-500 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-green-100 hover:text-green-700",
                        isReadOnly && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Check className="w-4 h-4" />
                      <span className="hidden sm:inline">Ci sarò</span>
                    </button>
                    <button
                      onClick={() => !isReadOnly && handleStatusChange(member.id, "declined")}
                      disabled={isReadOnly}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        isDeclined
                          ? "bg-red-400 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-red-100 hover:text-red-700",
                        isReadOnly && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Non ci sarò</span>
                    </button>
                  </div>
                </div>

                {isConfirmed && (
                  <div className="px-4 pb-4 space-y-4 border-t border-stone-100 pt-4">
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors w-full">
                        <Utensils className="w-4 h-4" />
                        Preferenze alimentari
                        <ChevronDown className="w-4 h-4 ml-auto transition-transform [[data-state=open]>&]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 space-y-3">
                        <div className="flex flex-wrap gap-3">
                          {(() => {
                            const defaults = [
                              { id: "vegetariano", label: "Vegetariano", enabled: true },
                              { id: "vegano", label: "Vegano", enabled: true },
                            ];
                            const opts =
                              cateringConfig?.dietary_options?.filter((o) => o.enabled) || defaults;
                            return opts.map((opt) => (
                              <div key={opt.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={
                                    opt.id === "vegetariano"
                                      ? data?.isVegetarian || false
                                      : opt.id === "vegano"
                                      ? data?.isVegan || false
                                      : data?.dietaryRestrictions?.includes(opt.label) || false
                                  }
                                  onCheckedChange={(checked) => {
                                    const cur = memberData[member.id] || {
                                      rsvpStatus: "pending" as const,
                                      isVegetarian: false,
                                      isVegan: false,
                                      dietaryRestrictions: "",
                                      hasPlusOne: false,
                                      plusOneName: "",
                                      plusOneMenu: "",
                                    };
                                    const upd: Partial<MemberData> = {};
                                    if (opt.id === "vegetariano") upd.isVegetarian = !!checked;
                                    else if (opt.id === "vegano") upd.isVegan = !!checked;
                                    else {
                                      const items = (cur.dietaryRestrictions || "")
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean);
                                      if (checked) {
                                        if (!items.includes(opt.label)) items.push(opt.label);
                                      } else {
                                        const idx = items.indexOf(opt.label);
                                        if (idx >= 0) items.splice(idx, 1);
                                      }
                                      upd.dietaryRestrictions = items.join(", ");
                                    }
                                    onMemberDataChange({
                                      ...memberData,
                                      [member.id]: { ...cur, ...upd },
                                    });
                                  }}
                                  disabled={isReadOnly}
                                />
                                <span className="text-sm text-stone-600">{opt.label}</span>
                              </div>
                            ));
                          })()}
                        </div>
                        {cateringConfig?.show_allergy_field !== false && (
                          <Input
                            placeholder="Allergie o intolleranze..."
                            value={data?.dietaryRestrictions || ""}
                            onChange={(e) =>
                              handleFieldChange(member.id, "dietaryRestrictions", e.target.value)
                            }
                            disabled={isReadOnly}
                            className="text-sm"
                          />
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {member.allow_plus_one && (
                      <div className="space-y-3 pt-2 border-t border-stone-100">
                        <div className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={data?.hasPlusOne || false}
                            onCheckedChange={(c) =>
                              handleFieldChange(member.id, "hasPlusOne", !!c)
                            }
                            disabled={isReadOnly}
                          />
                          <span className="text-sm text-stone-700 flex items-center gap-1">
                            <UserPlus className="w-4 h-4" />
                            Porto un accompagnatore
                          </span>
                        </div>
                        {data?.hasPlusOne && (
                          <div className="space-y-2 pl-6">
                            <Input
                              placeholder="Nome e cognome accompagnatore"
                              value={data?.plusOneName || ""}
                              onChange={(e) =>
                                handleFieldChange(member.id, "plusOneName", e.target.value)
                              }
                              disabled={isReadOnly}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isReadOnly && (
          <Button
            onClick={onSubmit}
            disabled={
              submitting || members.some((m) => memberData[m.id]?.rsvpStatus === "pending")
            }
            className="w-full py-6 text-lg font-medium rounded-full"
            style={{ backgroundColor: primaryColor, color: "white" }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Invio in corso...
              </>
            ) : (
              config.confirmButtonText
            )}
          </Button>
        )}

        {members.some((m) => memberData[m.id]?.rsvpStatus === "pending") && (
          <p className="text-center text-sm text-stone-500">{config.pendingHelperText}</p>
        )}
      </div>
    </section>
  );
}
