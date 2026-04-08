

## Problem

When a guest assigned to a table has `allow_plus_one = true`, their potential +1 should be visible and counted in the table's capacity -- even if the +1 hasn't been named yet. Currently, virtual +1 entries are only created when `plus_one_name` exists, so "authorized but unnamed" +1s are invisible in the table view.

The user wants two behaviors based on the existing toggle:
- **"Tutti" mode** (planning): count ALL potential +1s (even unnamed) for guests assigned to tables
- **"Confermati" mode**: only count +1s that have a confirmed name

## Plan

### 1. Show phantom +1 placeholders in TableCanvas

In `TableCanvas.tsx`, after rendering the assigned guests for each table, add logic to detect guests who have `allow_plus_one = true` but no corresponding +1 record assigned to the same table. For these, render a "phantom" placeholder row showing:
- A `+1` badge
- Text like "+1 di Alessandro Baldi"
- A muted/dashed style to indicate it's a placeholder, not a confirmed person
- This phantom row increments the `totalGuests` count used for capacity calculation and the progress bar

### 2. Pass the toggle state to TableCanvas

Add a new prop `showConfirmedOnly` to `TableCanvas` and `DroppableTable`. This controls whether phantom +1s are shown:
- `showConfirmedOnly = false` ("Tutti"): show phantom +1 placeholders for all guests with `allow_plus_one = true` (even without a name)
- `showConfirmedOnly = true` ("Confermati"): only show phantom +1 placeholders if `plus_one_name` is set (the +1 was confirmed via RSVP)

### 3. Update capacity counting

In `DroppableTable`, compute `phantomPlusOnes` -- the number of +1 placeholders to show. Add this to `totalGuests` so the capacity badge (`X/Y`), progress bar, and over-capacity warning all account for these phantom seats.

### Technical details

**TableCanvas.tsx changes:**
- Add `showConfirmedOnly?: boolean` to `TableCanvasProps` and `DroppableTable` props
- In `DroppableTable`, after computing `tableGuests`, calculate phantom +1s:
  ```
  const phantomPlusOnes = tableGuests.filter(({ guest }) => 
    guest.allow_plus_one && 
    !tableGuests.some(tg => tg.guest?.is_plus_one && tg.guest?.plus_one_of_guest_id === guest.id) &&
    (!showConfirmedOnly || guest.plus_one_name?.trim())
  );
  ```
- Add `phantomPlusOnes.length` to `totalGuests`
- Render phantom rows with dashed border styling after each qualifying guest

**Tables.tsx changes:**
- Pass `showConfirmedOnly={showConfirmedOnly}` to `TableCanvas`

