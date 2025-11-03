-- Drop the old check constraint
ALTER TABLE expense_line_items 
DROP CONSTRAINT IF EXISTS expense_line_items_quantity_type_check;

-- Add the new check constraint that includes 'staff'
ALTER TABLE expense_line_items
ADD CONSTRAINT expense_line_items_quantity_type_check 
CHECK (quantity_type IN ('fixed', 'adults', 'children', 'total_guests', 'staff'));