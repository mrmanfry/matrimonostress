-- Reset planned guest counts to NULL for existing variable/mixed expenses
-- This enables automatic inheritance from global wedding.target_* values
UPDATE expense_items
SET planned_adults = NULL, 
    planned_children = NULL,
    planned_staff = NULL
WHERE expense_type IN ('variable', 'mixed')
  AND planned_adults = 100
  AND planned_children = 0
  AND planned_staff = 0;

-- Ensure global wedding targets have sensible defaults
UPDATE weddings 
SET target_adults = COALESCE(target_adults, 100),
    target_children = COALESCE(target_children, 0),
    target_staff = COALESCE(target_staff, 0)
WHERE target_adults IS NULL OR target_children IS NULL OR target_staff IS NULL;