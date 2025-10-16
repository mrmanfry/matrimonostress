import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, FolderOpen, Plus } from "lucide-react";

interface Category {
  id: string;
  name: string;
  expense_count?: number;
  total_spent?: number;
}

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCreateCategory: (name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export function CategoryManager({
  open,
  onOpenChange,
  categories,
  onCreateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    try {
      await onCreateCategory(newCategoryName.trim());
      setNewCategoryName("");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, hasExpenses: boolean) => {
    if (hasExpenses) {
      alert("Impossibile eliminare una categoria con spese associate");
      return;
    }

    if (!confirm("Eliminare questa categoria?")) return;

    setLoading(true);
    try {
      await onDeleteCategory(id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Gestione Categorie
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <form onSubmit={handleCreate} className="space-y-2">
            <Label htmlFor="category_name">Nuova Categoria</Label>
            <div className="flex gap-2">
              <Input
                id="category_name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Es: Location, Catering, Foto/Video"
                maxLength={100}
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !newCategoryName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <Label>Categorie Esistenti ({categories.length})</Label>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessuna categoria creata
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {categories.map((category) => (
                  <Card key={category.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{category.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {category.expense_count !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {category.expense_count} spes{category.expense_count === 1 ? "a" : "e"}
                            </Badge>
                          )}
                          {category.total_spent !== undefined && category.total_spent > 0 && (
                            <span className="text-sm text-muted-foreground">
                              €{category.total_spent.toLocaleString("it-IT")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDelete(category.id, (category.expense_count || 0) > 0)
                        }
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
