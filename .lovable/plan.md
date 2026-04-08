

## Analysis

The circle (line 183) and square (line 185) icons are "shape indicators" — they show whether a table is round or rectangular. However, as you noted, they serve no interactive purpose and are visually confusing, especially positioned next to the action menu (⋯).

## Plan

**Remove the shape indicator icons** from `TableCanvas.tsx` (lines 180-186). The circle/square adds no actionable value and clutters the UI. The table shape information, if needed, could be conveyed through the table's visual representation itself rather than a tiny ambiguous icon.

### Changes
- **`src/components/tables/TableCanvas.tsx`**: Remove the `{isRound ? <Circle /> : <Square />}` block (lines 181-186). Keep the actions menu as-is.

