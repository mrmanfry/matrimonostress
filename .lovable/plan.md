

## Fix: Seat slots wrapping to new line in imperial table layout

The issue is that `flex-wrap` on Side A and Side B containers allows seats to wrap when the container is too narrow. The fix is to remove `flex-wrap` and instead make the rows horizontally scrollable with `overflow-x-auto`, ensuring all seats stay on one line.

### Changes

**`src/components/tables/ImperialTableLayout.tsx`** (lines 222 and 241):
- Side A (line 222): Change `flex gap-1 justify-center flex-wrap mb-1` → `flex gap-1 justify-center overflow-x-auto mb-1`
- Side B (line 241): Change `flex gap-1 justify-center flex-wrap mt-1` → `flex gap-1 justify-center overflow-x-auto mt-1`

This keeps all seats on one row and allows horizontal scrolling if the table is wider than the container. For ≤20 seats this should rarely scroll, but prevents wrapping in all cases.

