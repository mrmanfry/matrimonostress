import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Save, X, Plus, Trash2, GripVertical, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface MenuCourse {
  id: string;
  category: string;
  items: string[];
}

export interface MenuData {
  title: string;
  courses: MenuCourse[];
}

const DEFAULT_CATEGORIES = ["Antipasto", "Primo", "Secondo", "Contorno", "Dolce", "Vini", "Bevande"];

const DEFAULT_MENU: MenuData = {
  title: "Il Nostro Menu",
  courses: [
    { id: crypto.randomUUID(), category: "Antipasto", items: [] },
    { id: crypto.randomUUID(), category: "Primo", items: [] },
    { id: crypto.randomUUID(), category: "Secondo", items: [] },
    { id: crypto.randomUUID(), category: "Dolce", items: [] },
  ],
};

interface MenuComposerProps {
  weddingId: string;
  cateringConfig: any;
  onConfigChange: (config: any) => void;
}

export const MenuComposer = ({ weddingId, cateringConfig, onConfigChange }: MenuComposerProps) => {
  const existingMenu = cateringConfig?.menu as MenuData | undefined;
  const menu = existingMenu || DEFAULT_MENU;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<MenuData>(menu);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(menu)));
    setIsEditing(true);
  };

  const cancel = () => {
    setIsEditing(false);
    setNewCategoryName("");
  };

  const updateTitle = (title: string) => {
    setDraft(prev => ({ ...prev, title }));
  };

  const addCourse = (category?: string) => {
    const cat = category || newCategoryName.trim();
    if (!cat) return;
    setDraft(prev => ({
      ...prev,
      courses: [...prev.courses, { id: crypto.randomUUID(), category: cat, items: [] }],
    }));
    setNewCategoryName("");
  };

  const removeCourse = (id: string) => {
    setDraft(prev => ({
      ...prev,
      courses: prev.courses.filter(c => c.id !== id),
    }));
  };

  const updateCourseCategory = (id: string, category: string) => {
    setDraft(prev => ({
      ...prev,
      courses: prev.courses.map(c => c.id === id ? { ...c, category } : c),
    }));
  };

  const addItem = (courseId: string, item: string) => {
    if (!item.trim()) return;
    setDraft(prev => ({
      ...prev,
      courses: prev.courses.map(c =>
        c.id === courseId ? { ...c, items: [...c.items, item.trim()] } : c
      ),
    }));
  };

  const removeItem = (courseId: string, index: number) => {
    setDraft(prev => ({
      ...prev,
      courses: prev.courses.map(c =>
        c.id === courseId ? { ...c, items: c.items.filter((_, i) => i !== index) } : c
      ),
    }));
  };

  const updateItem = (courseId: string, index: number, value: string) => {
    setDraft(prev => ({
      ...prev,
      courses: prev.courses.map(c =>
        c.id === courseId
          ? { ...c, items: c.items.map((item, i) => i === index ? value : item) }
          : c
      ),
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const updatedConfig = { ...cateringConfig, menu: draft };
      const { error } = await supabase
        .from("weddings")
        .update({ catering_config: updatedConfig as any })
        .eq("id", weddingId);
      if (error) throw error;
      onConfigChange(updatedConfig);
      setIsEditing(false);
      toast.success("Menu salvato");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const currentMenu = isEditing ? draft : menu;
  const totalDishes = currentMenu.courses.reduce((sum, c) => sum + c.items.length, 0);
  const isEmpty = totalDishes === 0;

  // Suggest categories not already added
  const usedCategories = new Set(currentMenu.courses.map(c => c.category));
  const suggestedCategories = DEFAULT_CATEGORIES.filter(c => !usedCategories.has(c));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5" />
              Composizione Menu
            </CardTitle>
            <CardDescription>
              Configura le portate e i piatti del tuo matrimonio
            </CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="w-4 h-4 mr-1" /> Modifica
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancel} disabled={saving}>
                <X className="w-4 h-4 mr-1" /> Annulla
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> Salva
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Titolo del Menu</Label>
          {isEditing ? (
            <Input
              value={draft.title}
              onChange={e => updateTitle(e.target.value)}
              placeholder="Il Nostro Menu"
            />
          ) : (
            <p className="text-xl font-semibold text-foreground text-center py-2">{currentMenu.title}</p>
          )}
        </div>

        {/* Courses */}
        <div className="space-y-4">
          {currentMenu.courses.map((course) => (
            <div key={course.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                {isEditing ? (
                  <Input
                    value={course.category}
                    onChange={e => updateCourseCategory(course.id, e.target.value)}
                    className="font-semibold text-sm w-48"
                  />
                ) : (
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {course.category}
                  </h4>
                )}
                {isEditing && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCourse(course.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                {course.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {isEditing && <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
                    {isEditing ? (
                      <>
                        <Input
                          value={item}
                          onChange={e => updateItem(course.id, idx, e.target.value)}
                          className="flex-1 text-sm"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => removeItem(course.id, idx)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-foreground pl-2">• {item}</p>
                    )}
                  </div>
                ))}
                {course.items.length === 0 && !isEditing && (
                  <p className="text-xs text-muted-foreground italic pl-2">Nessun piatto inserito</p>
                )}
              </div>

              {/* Add item input */}
              {isEditing && (
                <AddItemInput onAdd={(val) => addItem(course.id, val)} />
              )}
            </div>
          ))}

          {isEmpty && !isEditing && (
            <div className="text-center py-8 text-muted-foreground">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nessun piatto configurato.</p>
              <p className="text-xs mt-1">Clicca "Modifica" per comporre il tuo menu.</p>
            </div>
          )}
        </div>

        {/* Add category */}
        {isEditing && (
          <div className="space-y-3 pt-4 border-t border-border">
            <Label className="text-sm font-medium">Aggiungi Categoria</Label>
            {suggestedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestedCategories.map(cat => (
                  <Button key={cat} variant="outline" size="sm" onClick={() => addCourse(cat)} className="text-xs">
                    <Plus className="w-3 h-3 mr-1" /> {cat}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Nome categoria personalizzata..."
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCourse()}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => addCourse()} disabled={!newCategoryName.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Aggiungi
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Small helper component for adding items
function AddItemInput({ onAdd }: { onAdd: (val: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        placeholder="Aggiungi piatto..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && value.trim()) {
            onAdd(value);
            setValue("");
          }
        }}
        className="flex-1 text-sm"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => { onAdd(value); setValue(""); }}
        disabled={!value.trim()}
      >
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}

export default MenuComposer;
