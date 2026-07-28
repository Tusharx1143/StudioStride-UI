# Template Selector Sheet in SnapCamera

## Problem

`SnapCamera.tsx` renders `TemplateCarousel` inline, permanently visible above the
shutter button. This clutters the viewfinder. Separately, the button on the right
side of the shutter row (currently labeled "Stock Backgrounds", `Sparkles` icon)
opens a "Select Photo Background" sheet (`showStockModal`) — a feature with no
other entry point and limited value now that templates drive the overlay.

## Goal

Repurpose that button to open a new bottom sheet containing `TemplateCarousel`,
removing the inline carousel and the stock-photos feature it replaces.

## Changes

### 1. Trigger button (`SnapCamera.tsx` ~line 727)

- Icon: `Sparkles` → `Wand2` (already imported, currently unused — removes one
  dead import).
- `title`: `"Stock Backgrounds"` → `"Templates"`.
- `onClick`: `setShowStockModal(true)` → `setShowTemplateSheet(true)` (new
  boolean state, same pattern as `showLensSettings` / `showCameraSettings`).

### 2. New sheet: Template Selector

- Follows the existing sheet pattern used by Music Picker / Lens Settings /
  Camera Options: `AnimatePresence` + `motion.div` slide-up, `bg-surface
  rounded-t-3xl hairline-border-t p-screen-gutter`, header row with title +
  `X` close button (`role="dialog" aria-modal="true"`).
- Body: `TemplateCarousel` with `templates={TEMPLATE_FAMILIES}`,
  `selectedId={selectedTemplate.id}`, and the existing `onSelect` handler
  (sets `selectedTemplate`, triggers the "Selected" label flash via
  `templateLabelVisible` / `templateLabelTimerRef`) — moved as-is from the
  inline usage, not duplicated.
- State: `showTemplateSheet: boolean`, default `false`.

### 3. Remove inline carousel

- Delete the "Activity Template Generation Carousel" block (current lines
  655–669) that renders `TemplateCarousel` permanently above the shutter row.

### 4. Remove stock-photos feature

- Delete the "STOCK PHOTOS MODAL SHEET" JSX block (current lines 1044–1123).
- Delete `showStockModal` and `selectedSourceCategory` state.
- Keep `handleSelectStockPhoto` — it's also called from the Stories view
  (line 427) and Memories view (line 478) quick-select thumbnails, which are
  out of scope for this change. Only its call site inside the deleted modal
  (line 1106) goes away.
- `STOCK_PHOTOS` data import stays — still used by Stories/Memories view
  thumbnails, which are out of scope for this change.

## Out of scope

- The lens category filter pills row (`GestureSwipeCarousel` filtering
  `activeCategory` / `lenses`) is untouched — it filters lenses, not
  templates.
- Stories/Memories views and their use of `STOCK_PHOTOS` are untouched.

## Testing

- Manual verification in the running app: open Camera screen, confirm no
  inline template carousel above the shutter, tap the repurposed button,
  confirm the Template sheet opens with the carousel, selecting a template
  updates the overlay preview and closes/stays per existing UX, close sheet
  via `X`.
- Confirm no remaining references to `showStockModal` / stock-photos sheet
  anywhere in the file (grep check).
