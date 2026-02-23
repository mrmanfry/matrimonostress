import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
}

interface ExpenseLineRowProps {
  lineItem: ExpenseLineItem;
  calculationMode: 'planned' | 'actual';
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

  const isQuantityEditable = localData.quantity_type === 'fixed';
  const isDynamicQuantity = localData.quantity_type !== 'fixed';
  const showQuantityLimit = isDynamicQuantity && localData.quantity_range !== 'all';

  if (isMobile) {
    return (
      <Card className="p-3 space-y-3">
        {/* Row 1: Description + Delete */}
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

        {/* Row 2: Price + Quantity Type + Quantity */}
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
            <Label className="text-xs text-muted-foreground mb-1 block">Tipo Qtà</Label>
            <Select
              value={localData.quantity_type}
              onValueChange={(val) => {
                if (val === 'fixed') {
                  handleBatchUpdate({ quantity_type: val, quantity_range: 'all', quantity_limit: null });
                } else {
                  handleUpdate('quantity_type', val);
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="fixed">Fissa</SelectItem>
                <SelectItem value="adults">Adulti</SelectItem>
                <SelectItem value="children">Bambini</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="total_guests">Tutti</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Qtà</Label>
            <Input
              type="number"
              min="0"
              value={getQuantityDisplay() || ''}
              onChange={(e) => {
                if (isQuantityEditable) {
                  handleUpdate('quantity_fixed', parseInt(e.target.value) || 0);
                }
              }}
              disabled={!isQuantityEditable}
              className={`h-9 ${!isQuantityEditable ? 'bg-muted cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        {/* Row 2.5: Dynamic quantity range (if applicable) */}
        {isDynamicQuantity && (
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

        {/* Row 3: Discount + VAT + Total */}
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
          <div className="text-right">
            <Label className="text-xs text-muted-foreground mb-1 block">Totale</Label>
            <div className="h-9 flex items-center justify-end font-semibold text-primary text-sm">
              € {totalAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Desktop layout (unchanged)
  return (
    <Card className="p-4">
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
        <div className="col-span-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={localData.unit_price || ''}
            onChange={(e) => handleUpdate('unit_price', parseFloat(e.target.value) || 0)}
            placeholder="Prezzo €"
            className="h-9"
          />
        </div>

        {/* Tipo Quantità */}
        <div className="col-span-2">
          <Select
            value={localData.quantity_type}
            onValueChange={(val) => {
              if (val === 'fixed') {
                handleBatchUpdate({ quantity_type: val, quantity_range: 'all', quantity_limit: null });
              } else {
                handleUpdate('quantity_type', val);
              }
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="fixed">Quantità Fissa</SelectItem>
              <SelectItem value="adults">N° Adulti</SelectItem>
              <SelectItem value="children">N° Bambini</SelectItem>
              <SelectItem value="staff">N° Staff</SelectItem>
              <SelectItem value="total_guests">N° Totale (Tutti)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scaglione */}
        {isDynamicQuantity && (
          <div className="col-span-1">
            <Select
              value={localData.quantity_range}
              onValueChange={(val) => handleUpdate('quantity_range', val)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="up_to">Fino a</SelectItem>
                <SelectItem value="over">Oltre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Limite */}
        {showQuantityLimit && (
          <div className="col-span-1">
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

        {/* Quantità */}
        <div className={isDynamicQuantity && !showQuantityLimit ? "col-span-1" : showQuantityLimit ? "col-span-0" : "col-span-1"}>
          {(!isDynamicQuantity || !showQuantityLimit) && (
            <Input
              type="number"
              min="0"
              value={getQuantityDisplay() || ''}
              onChange={(e) => {
                if (isQuantityEditable) {
                  handleUpdate('quantity_fixed', parseInt(e.target.value) || 0);
                }
              }}
              disabled={!isQuantityEditable}
              className={`h-9 ${!isQuantityEditable ? 'bg-muted cursor-not-allowed' : ''}`}
            />
          )}
        </div>

        {/* Quantità Calcolata */}
        {isDynamicQuantity && showQuantityLimit && (
          <div className="col-span-1">
            <div className="h-9 flex items-center justify-center font-medium text-muted-foreground">
              {getQuantityDisplay()}
            </div>
          </div>
        )}

        {/* Sconto % */}
        <div className="col-span-1">
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={localData.discount_percentage || ''}
            onChange={(e) => handleUpdate('discount_percentage', parseFloat(e.target.value) || 0)}
            placeholder="Sconto %"
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
            placeholder="IVA %"
            className="h-9"
          />
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
        <div className="col-span-2">Prezzo Unitario</div>
        <div className="col-span-2">Tipo Quantità</div>
        {isDynamicQuantity && <div className="col-span-1">Scaglione</div>}
        {showQuantityLimit && <div className="col-span-1">Limite</div>}
        {(!isDynamicQuantity || !showQuantityLimit) && <div className="col-span-1">Qtà</div>}
        {isDynamicQuantity && showQuantityLimit && <div className="col-span-1">Qtà Calc.</div>}
        <div className="col-span-1">Sconto</div>
        <div className="col-span-1">IVA</div>
        <div className="col-span-1 text-right">Totale</div>
        <div className="col-span-1"></div>
      </div>
    </Card>
  );
}
