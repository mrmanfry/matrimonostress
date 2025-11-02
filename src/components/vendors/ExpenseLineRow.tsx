import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ExpenseLineItem {
  id?: string;
  expense_item_id: string;
  description: string;
  unit_price: number;
  quantity_type: 'fixed' | 'adults' | 'children' | 'total_guests';
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
  actualAdults: number;
  actualChildren: number;
  onUpdate: (id: string, updates: Partial<ExpenseLineItem>) => void;
  onDelete: (id: string) => void;
  totalAmount: number;
}

export function ExpenseLineRow({
  lineItem,
  calculationMode,
  plannedAdults,
  plannedChildren,
  actualAdults,
  actualChildren,
  onUpdate,
  onDelete,
  totalAmount,
}: ExpenseLineRowProps) {
  const [localData, setLocalData] = useState(lineItem);

  const handleUpdate = (field: keyof ExpenseLineItem, value: any) => {
    const updated = { ...localData, [field]: value };
    setLocalData(updated);
    if (lineItem.id) {
      onUpdate(lineItem.id, { [field]: value });
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
    } else if (localData.quantity_type === 'total_guests') {
      baseQuantity = calculationMode === 'planned' 
        ? plannedAdults + plannedChildren 
        : actualAdults + actualChildren;
    }

    // Apply quantity range logic
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
              handleUpdate('quantity_type', val);
              if (val === 'fixed') {
                handleUpdate('quantity_range', 'all');
              }
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Quantità Fissa</SelectItem>
              <SelectItem value="adults">N° Adulti</SelectItem>
              <SelectItem value="children">N° Bambini</SelectItem>
              <SelectItem value="total_guests">N° Totale Invitati</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scaglione (solo per quantità dinamiche) */}
        {isDynamicQuantity && (
          <div className="col-span-1">
            <Select
              value={localData.quantity_range}
              onValueChange={(val) => handleUpdate('quantity_range', val)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="up_to">Fino a</SelectItem>
                <SelectItem value="over">Oltre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Limite (visibile solo se scaglione != "tutti") */}
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

        {/* Quantità Calcolata (solo per dinamici con scaglione) */}
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
