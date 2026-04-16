import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

interface ExpenseLineItem {
  id?: string;
  expense_item_id: string;
  description: string;
  unit_price: number;
  quantity_type: 'fixed' | 'adults' | 'children' | 'total_guests' | 'staff';
  quantity_fixed: number | null;
  quantity_limit: number | null;
  quantity_range: 'all' | 'up_to' | 'over';
  discount_percentage: number;
  tax_rate: number;
  order_index: number;
  price_is_tax_inclusive: boolean;
}

interface ExpenseLineRowProps {
  lineItem: ExpenseLineItem;
  calculationMode: 'planned' | 'confirmed' | 'expected';
  plannedAdults: number;
  plannedChildren: number;
  plannedStaff: number;
  actualAdults: number;
  actualChildren: number;
  actualStaff: number;
  onUpdate: (id: string, updates: Partial<ExpenseLineItem>) => void;
  onDelete: (id: string) => void;
  totalAmount: number;
}

export function ExpenseLineRow({
  lineItem,
  calculationMode,
  plannedAdults,
  plannedChildren,
  plannedStaff,
  actualAdults,
  actualChildren,
  actualStaff,
  onUpdate,
  onDelete,
  totalAmount,
}: ExpenseLineRowProps) {
  const [localData, setLocalData] = useState(lineItem);
  const isMobile = useIsMobile();

  const handleUpdate = (field: keyof ExpenseLineItem, value: any) => {
    const updated = { ...localData, [field]: value };
    setLocalData(updated);
    if (lineItem.id) {
      onUpdate(lineItem.id, { [field]: value });
    }
  };

  const handleBatchUpdate = (updates: Partial<ExpenseLineItem>) => {
    const updated = { ...localData, ...updates };
    setLocalData(updated);
    if (lineItem.id) {
      onUpdate(lineItem.id, updates);
    }
  };

  const getQuantityDisplay = (): number => {
    let baseQuantity = 0;
    
    if (localData.quantity_type === 'fixed') {
      return localData.quantity_fixed || 0;
    } else if (localData.quantity_type === 'adults') {
      baseQuantity = calculationMode === 'planned' ? plannedAdults : actualAdults;
    } else if (localData.quantity_type === 'children') {
      baseQuantity = calculationMode === 'planned' ? plannedChildren : actualChildren;
    } else if (localData.quantity_type === 'staff') {
      baseQuantity = calculationMode === 'planned' ? plannedStaff : actualStaff;
    } else if (localData.quantity_type === 'total_guests') {
      baseQuantity = calculationMode === 'planned' 
        ? plannedAdults + plannedChildren + plannedStaff
        : actualAdults + actualChildren + actualStaff;
    }

    if (localData.quantity_range === 'up_to' && localData.quantity_limit) {
      return Math.min(baseQuantity, localData.quantity_limit);
    } else if (localData.quantity_range === 'over' && localData.quantity_limit) {
      return Math.max(baseQuantity - localData.quantity_limit, 0);
    }
    
    return baseQuantity;
  };

  const isFixed = localData.quantity_type === 'fixed';
  const isVariable = !isFixed;
  const showQuantityLimit = isVariable && localData.quantity_range !== 'all';

  // Livello 1: Fissa / Variabile
  const quantityMode = isFixed ? 'fixed' : 'variable';

  // Livello 2: Conteggio (solo se variabile)
  const countType = isFixed ? 'adults' : localData.quantity_type;

  if (isMobile) {
    return (
      <Card className="p-3 space-y-3">
        {/* Riga 1: Descrizione + Elimina */}
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Descrizione</Label>
            <Input
              value={localData.description}
              onChange={(e) => handleUpdate('description', e.target.value)}
              placeholder="Descrizione"
              className="h-9"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => lineItem.id && onDelete(lineItem.id)}
            className="h-9 w-9 mt-5 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Riga 2: Prezzo + Qtà + Totale */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Prezzo €</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={localData.unit_price || ''}
              onChange={(e) => handleUpdate('unit_price', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Qtà</Label>
            <Input
              type="number"
              min="0"
              value={getQuantityDisplay() || ''}
              onChange={(e) => {
                if (isFixed) {
                  handleUpdate('quantity_fixed', parseInt(e.target.value) || 0);
                }
              }}
              disabled={!isFixed}
              className={`h-9 ${!isFixed ? 'bg-muted cursor-not-allowed' : ''}`}
            />
          </div>
          <div className="text-right">
            <Label className="text-xs text-muted-foreground mb-1 block">Totale</Label>
            <div className="h-9 flex items-center justify-end font-semibold text-primary text-sm">
              € {totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Riga 3: Fissa/Variabile + (se variabile) Conteggio */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Quantità</Label>
            <Select
              value={quantityMode}
              onValueChange={(val) => {
                if (val === 'fixed') {
                  handleBatchUpdate({ quantity_type: 'fixed', quantity_range: 'all', quantity_limit: null, quantity_fixed: 1 });
                } else {
                  handleBatchUpdate({ quantity_type: 'adults', quantity_fixed: null });
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="fixed">Fissa</SelectItem>
                <SelectItem value="variable">Variabile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isVariable && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Conteggio</Label>
              <Select
                value={countType}
                onValueChange={(val) => handleUpdate('quantity_type', val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="adults">Adulti</SelectItem>
                  <SelectItem value="children">Bambini</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="total_guests">Tutti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Riga 4 (se variabile): Scaglione + Limite */}
        {isVariable && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Scaglione</Label>
              <Select
                value={localData.quantity_range}
                onValueChange={(val) => handleUpdate('quantity_range', val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="up_to">Fino a</SelectItem>
                  <SelectItem value="over">Oltre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showQuantityLimit && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Limite</Label>
                <Input
                  type="number"
                  min="0"
                  value={localData.quantity_limit || ''}
                  onChange={(e) => handleUpdate('quantity_limit', parseInt(e.target.value) || null)}
                  placeholder="Limite"
                  className="h-9"
                />
              </div>
            )}
          </div>
        )}

        {/* Riga 5: IVA % + toggle IVA incl/escl + Sconto % */}
        <div className="grid grid-cols-3 gap-2 items-end">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Sconto %</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={localData.discount_percentage || ''}
              onChange={(e) => handleUpdate('discount_percentage', parseFloat(e.target.value) || 0)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">IVA %</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={localData.tax_rate || ''}
              onChange={(e) => handleUpdate('tax_rate', parseFloat(e.target.value) || 0)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">IVA nel prezzo</Label>
            <div className="h-9 flex items-center gap-1.5">
              <Switch
                checked={localData.price_is_tax_inclusive}
                onCheckedChange={(checked) => handleUpdate('price_is_tax_inclusive', checked)}
                className="scale-90"
              />
              <span className="text-[10px] text-muted-foreground">
                {localData.price_is_tax_inclusive ? 'Incl.' : 'Escl.'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ========== DESKTOP ==========
  return (
    <Card className="p-4">
      {/* Main row */}
      <div className="grid grid-cols-12 gap-3 items-start">
        {/* Descrizione */}
        <div className="col-span-3">
          <Input
            value={localData.description}
            onChange={(e) => handleUpdate('description', e.target.value)}
            placeholder="Descrizione"
            className="h-9"
          />
        </div>

        {/* Prezzo Unitario */}
        <div className="col-span-1">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={localData.unit_price || ''}
            onChange={(e) => handleUpdate('unit_price', parseFloat(e.target.value) || 0)}
            placeholder="€"
            className="h-9"
          />
        </div>

        {/* Fissa / Variabile */}
        <div className="col-span-1">
          <Select
            value={quantityMode}
            onValueChange={(val) => {
              if (val === 'fixed') {
                handleBatchUpdate({ quantity_type: 'fixed', quantity_range: 'all', quantity_limit: null, quantity_fixed: 1 });
              } else {
                handleBatchUpdate({ quantity_type: 'adults', quantity_fixed: null });
              }
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="fixed">Fissa</SelectItem>
              <SelectItem value="variable">Variabile</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quantità */}
        <div className="col-span-1">
          <Input
            type="number"
            min="0"
            value={getQuantityDisplay() || ''}
            onChange={(e) => {
              if (isFixed) {
                handleUpdate('quantity_fixed', parseInt(e.target.value) || 0);
              }
            }}
            disabled={!isFixed}
            className={`h-9 ${!isFixed ? 'bg-muted cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Sconto % */}
        <div className="col-span-1">
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={localData.discount_percentage || ''}
            onChange={(e) => handleUpdate('discount_percentage', parseFloat(e.target.value) || 0)}
            placeholder="%"
            className="h-9"
          />
        </div>

        {/* IVA % */}
        <div className="col-span-1">
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={localData.tax_rate || ''}
            onChange={(e) => handleUpdate('tax_rate', parseFloat(e.target.value) || 0)}
            placeholder="%"
            className="h-9"
          />
        </div>

        {/* IVA incl/escl toggle */}
        <div className="col-span-1">
          <div className="h-9 flex items-center gap-1.5">
            <Switch
              checked={localData.price_is_tax_inclusive}
              onCheckedChange={(checked) => handleUpdate('price_is_tax_inclusive', checked)}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground leading-tight">
              {localData.price_is_tax_inclusive ? 'IVA incl.' : 'IVA escl.'}
            </span>
          </div>
        </div>

        {/* Totale Riga */}
        <div className="col-span-1">
          <div className="h-9 flex items-center justify-end font-semibold text-primary">
            € {totalAmount.toFixed(2)}
          </div>
        </div>

        {/* Delete */}
        <div className="col-span-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => lineItem.id && onDelete(lineItem.id)}
            className="h-9 w-9"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Labels Row */}
      <div className="grid grid-cols-12 gap-3 mt-2 text-xs text-muted-foreground">
        <div className="col-span-3">Descrizione</div>
        <div className="col-span-1">Prezzo €</div>
        <div className="col-span-1">Tipo Qtà</div>
        <div className="col-span-1">Qtà</div>
        <div className="col-span-1">Sconto</div>
        <div className="col-span-1">IVA %</div>
        <div className="col-span-1"></div>
        <div className="col-span-1 text-right">Totale</div>
        <div className="col-span-1"></div>
      </div>

      {/* Sub-row for variable details */}
      {isVariable && (
        <div className="mt-3 pt-3 border-t border-dashed flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Conteggio:</Label>
            <Select
              value={countType}
              onValueChange={(val) => handleUpdate('quantity_type', val)}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="adults">Adulti</SelectItem>
                <SelectItem value="children">Bambini</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="total_guests">Tutti</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Scaglione:</Label>
            <Select
              value={localData.quantity_range}
              onValueChange={(val) => handleUpdate('quantity_range', val)}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="up_to">Fino a</SelectItem>
                <SelectItem value="over">Oltre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showQuantityLimit && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Limite:</Label>
              <Input
                type="number"
                min="0"
                value={localData.quantity_limit || ''}
                onChange={(e) => handleUpdate('quantity_limit', parseInt(e.target.value) || null)}
                placeholder="N°"
                className="h-8 w-20 text-xs"
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
