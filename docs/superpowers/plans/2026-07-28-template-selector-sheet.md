# Template Selector Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `TemplateCarousel` out of the always-visible viewfinder in `SnapCamera.tsx` into an on-demand bottom sheet, opened by repurposing the existing "Stock Backgrounds" button, and remove the stock-photos modal it replaces.

**Architecture:** Single-file change to `src/components/SnapCamera.tsx`. Add one new boolean state (`showTemplateSheet`), reuse the existing bottom-sheet visual pattern already present in the file (Music Picker / Lens Settings / Camera Options sheets), move the `TemplateCarousel` JSX from its current inline location into the new sheet, delete the inline carousel block and the stock-photos sheet block plus their now-unused state.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind, `motion/react` (Framer Motion) for sheet animation, `lucide-react` icons. No test runner in this project — verification is `npm run lint` (`tsc --noEmit`) plus manual check in the running dev server.

## Global Constraints

- No test framework is configured (`package.json` scripts: `dev`, `build`, `preview`, `clean`, `lint`). Verification uses `npm run lint` (TypeScript compile check) and manual browser verification, per the spec's Testing section — not unit tests.
- Only `src/components/SnapCamera.tsx` is modified. No other files change.
- Follow the existing bottom-sheet visual pattern already in this file (see the Lens Settings sheet at the current lines 854–900) rather than inventing a new one.
- `STOCK_PHOTOS` data and `handleSelectStockPhoto` must remain — both are still used by the Stories view (line 427) and Memories view (line 478), which are out of scope.
- Reference spec: `docs/superpowers/specs/2026-07-28-template-selector-sheet-design.md`.

---

### Task 1: Add `showTemplateSheet` state and move the carousel's `onSelect` sheet in place of the trigger button

**Files:**
- Modify: `src/components/SnapCamera.tsx`

**Interfaces:**
- Produces: `showTemplateSheet: boolean` and `setShowTemplateSheet: (v: boolean) => void`, used by Task 2 (the new sheet) and Task 3 (removing the old trigger's modal).
- Consumes: existing `selectedTemplate`, `setSelectedTemplate`, `templateLabelVisible`, `setTemplateLabelVisible`, `templateLabelTimerRef`, `TEMPLATE_FAMILIES` (all already defined earlier in the file).

- [ ] **Step 1: Add the new state**

In the "Modals & Drawers" state block (current lines 131–138), add a new line directly after `showCameraSettings`:

```tsx
  const [showCameraSettings, setShowCameraSettings] = useState<boolean>(false);
  const [showTemplateSheet, setShowTemplateSheet] = useState<boolean>(false);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: no new errors (the state is unused until Task 2/3, which is fine — TS won't flag unused `useState` destructures as errors, only unused imports/vars flagged by `noUnusedLocals` if enabled; if `tsc --noEmit` reports `showTemplateSheet` as unused, that's expected until Task 2 lands — proceed, it will be resolved by the end of Task 2).

- [ ] **Step 3: Commit**

```bash
git add src/components/SnapCamera.tsx
git commit -m "feat: add showTemplateSheet state for template selector sheet"
```

---

### Task 2: Replace the "Stock Backgrounds" trigger button and add the Template Selector sheet

**Files:**
- Modify: `src/components/SnapCamera.tsx`

**Interfaces:**
- Consumes: `showTemplateSheet` / `setShowTemplateSheet` from Task 1; `TEMPLATE_FAMILIES`, `selectedTemplate`, `setSelectedTemplate`, `templateLabelVisible`, `setTemplateLabelVisible`, `templateLabelTimerRef` (existing); `TemplateCarousel` component (existing import); `X` icon and `Wand2` icon (already imported at the top of the file — `Wand2` is currently unused, `X` is already used elsewhere).
- Produces: the visible Template Selector sheet UI, gated by `showTemplateSheet`.

- [ ] **Step 1: Replace the trigger button**

Find the "Stock Photos / Presets Modal Trigger" button (current lines 726–733):

```tsx
              {/* Stock Photos / Presets Modal Trigger */}
              <button
                onClick={() => setShowStockModal(true)}
                className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border flex items-center justify-center text-volt active:scale-95 transition-transform"
                title="Stock Backgrounds"
              >
                <Sparkles className="w-5 h-5" />
              </button>
```

Replace it with:

```tsx
              {/* Template Selector Trigger */}
              <button
                onClick={() => setShowTemplateSheet(true)}
                className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hairline-border flex items-center justify-center text-volt active:scale-95 transition-transform"
                title="Templates"
              >
                <Wand2 className="w-5 h-5" />
              </button>
```

- [ ] **Step 2: Add the Template Selector sheet**

Find the "STOCK PHOTOS MODAL SHEET" block (current lines 1044–1123, starting with `{/* STOCK PHOTOS MODAL SHEET */}` and its enclosing `<AnimatePresence>`). Replace the entire block with:

```tsx
      {/* TEMPLATE SELECTOR SHEET */}
      <AnimatePresence>
        {showTemplateSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Select Template"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-surface rounded-t-3xl hairline-border-t p-screen-gutter space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-hairline">
                <div>
                  <h3 className="text-section-header mb-0.5">Select Template</h3>
                  <p className="text-xs text-text-secondary">Choose an overlay style for your story</p>
                </div>
                <button
                  onClick={() => setShowTemplateSheet(false)}
                  className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-2">
                <TemplateCarousel
                  templates={TEMPLATE_FAMILIES}
                  selectedId={selectedTemplate.id}
                  onSelect={(template) => {
                    setSelectedTemplate(template);
                    setTemplateLabelVisible(true);
                    if (templateLabelTimerRef.current) clearTimeout(templateLabelTimerRef.current);
                    templateLabelTimerRef.current = setTimeout(() => {
                      setTemplateLabelVisible(false);
                    }, 1000);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
```

This introduces a second usage of the `TemplateCarousel` `onSelect` logic (the first still being the inline one, removed in Task 3) — that's expected and temporary between Task 2 and Task 3.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run lint`
Expected: no errors related to `Wand2`, `showTemplateSheet`, or the new sheet JSX. `Sparkles`, `showStockModal`, and `selectedSourceCategory` will now show as unused — that's expected, resolved in Task 3.

- [ ] **Step 4: Commit**

```bash
git add src/components/SnapCamera.tsx
git commit -m "feat: add Template Selector sheet, repurpose stock-backgrounds trigger"
```

---

### Task 3: Remove the inline `TemplateCarousel`, the stock-photos state, and now-unused imports

**Files:**
- Modify: `src/components/SnapCamera.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: final clean state — no inline carousel, no stock-photos state, no unused imports.

- [ ] **Step 1: Remove the inline "Activity Template Generation Carousel" block**

Find (current lines 655–669):

```tsx
            {/* Activity Template Generation Carousel */}
            <div className="w-full px-2 py-1">
              <TemplateCarousel
                templates={TEMPLATE_FAMILIES}
                selectedId={selectedTemplate.id}
                onSelect={(template) => {
                  setSelectedTemplate(template);
                  setTemplateLabelVisible(true);
                  if (templateLabelTimerRef.current) clearTimeout(templateLabelTimerRef.current);
                  templateLabelTimerRef.current = setTimeout(() => {
                    setTemplateLabelVisible(false);
                  }, 1000);
                }}
              />
            </div>
```

Delete it entirely (the same logic now lives in the sheet added in Task 2).

- [ ] **Step 2: Remove the `showStockModal` and `selectedSourceCategory` state**

Find (current lines 137–138):

```tsx
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [selectedSourceCategory, setSelectedSourceCategory] = useState<string>("All");
```

Delete both lines.

- [ ] **Step 3: Remove the now-unused `Sparkles` import**

In the `lucide-react` import block near the top of the file, remove the `Sparkles,` line. Keep `Wand2` (now used by Task 2's button).

- [ ] **Step 4: Verify TypeScript compiles cleanly**

Run: `npm run lint`
Expected: PASS with no errors, and no unused-variable/import warnings for `Sparkles`, `showStockModal`, or `selectedSourceCategory`.

- [ ] **Step 5: Verify no stray references remain**

Run: `grep -n "showStockModal\|selectedSourceCategory\|Sparkles" src/components/SnapCamera.tsx`
Expected: no output.

- [ ] **Step 6: Manual verification in the running app**

Run: `npm run dev`, open the app, navigate to the Camera screen.
Confirm:
- No template carousel is visible above the shutter button by default.
- The right-side button next to the shutter shows a wand icon with title "Templates".
- Clicking it opens a bottom sheet titled "Select Template" containing the template carousel.
- Selecting a template in the sheet updates the overlay preview behind it and shows the "Selected" label flash.
- Closing the sheet via the `X` button works.
- The Stories and Memories swipe views (accessible by swiping the viewfinder) still show their photo grids and still navigate to the editor when a photo is tapped (confirms `handleSelectStockPhoto` / `STOCK_PHOTOS` still work for those, unaffected by this change).

- [ ] **Step 7: Commit**

```bash
git add src/components/SnapCamera.tsx
git commit -m "refactor: remove inline template carousel and stock-photos sheet"
```

---

## Self-Review Notes

- **Spec coverage:** Trigger button repurpose (Task 2, Step 1) ✓. New sheet (Task 2, Step 2) ✓. Inline carousel removal (Task 3, Step 1) ✓. Stock-photos feature removal — state (Task 3, Step 2), modal JSX (Task 2, Step 2 replacement), dead import (Task 3, Step 3) ✓. `handleSelectStockPhoto`/`STOCK_PHOTOS` preserved for Stories/Memories — verified unchanged, confirmed via Task 3 Step 6 manual check ✓. Icon change to template-appropriate icon (`Wand2`) ✓.
- **Placeholder scan:** none found — all steps show exact code and exact commands.
- **Type consistency:** `showTemplateSheet: boolean` / `setShowTemplateSheet` used identically across Tasks 1–3. `TemplateCarousel` props (`templates`, `selectedId`, `onSelect`) match the component's existing interface (`src/components/TemplateCarousel.tsx:6-10`), unchanged from its prior inline usage.