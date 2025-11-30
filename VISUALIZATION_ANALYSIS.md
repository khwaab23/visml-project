# visML Tile Metrics Dashboard - Visualization Enhancement Analysis

**Date:** November 30, 2025  
**Project:** visML Pedestrian Path Detection Evaluation  
**Scope:** Analysis of `example/tilemetrics.html` with recommendations for richer ML-focused visualizations

---

## Executive Summary

The current tile metrics dashboard provides basic overview capabilities (heatmap grid, 1D scatter, sortable table) but lacks critical ML error-analysis features. This document proposes 10 concrete enhancements ranging from low-effort wins (Global Confusion Matrix) to high-impact advanced features (Mini Leaflet Map Integration). **Priority: Implement the top 3 "quick wins" first** (Global Confusion Matrix, 2D Scatter Plot, Distribution Boxplots) to dramatically improve analytical depth without major refactoring.

---

## A. Current Implementation Summary

### Dashboard Structure (771 lines, monolithic HTML/CSS/JS)

**File:** `example/tilemetrics.html`

**View Modes (3):**
1. **Heatmap Grid** (12×8 = 96 tiles)
   - Color-coded cells based on selected metric (F1/Precision/Recall/IoU/TP/FP/FN)
   - Hover tooltips showing tile coordinates + metric value
   - Opacity-based filtering (threshold slider 0-100%)
2. **Scatter Plot** (Top 50 tiles)
   - **Currently 1D**: Just plots metric values sorted descending
   - Shows tile_id labels on hover
   - No multi-dimensional analysis
3. **Data Table** (All 96 tiles)
   - 9 columns: Tile ID, Lat/Lon, F1, Precision, Recall, IoU, TP/FP/FN lengths
   - Sortable by any column (click header)
   - Filterable by threshold slider
   - Color-coded F1 cells (green >70%, yellow 40-70%, red <40%)

**Control Panel:**
- View Mode dropdown (Heatmap/Scatter/Table)
- Metric Select dropdown (7 options)
- Sort By dropdown (9 columns)
- Filter Threshold slider (0-100%)

**Stats Section:**
- 4 summary cards showing Average/Median/Min/Max for selected metric
- Statically computed, no interactivity

**Current Metrics Tracked (7 of 18 available):**
```javascript
const metricsConfig = {
  f1_score: { label: 'F1 Score', isPercentage: true },
  precision: { label: 'Precision', isPercentage: true },
  recall: { label: 'Recall', isPercentage: true },
  iou: { label: 'IoU', isPercentage: true },
  tp_length_m: { label: 'True Positive (m)', isPercentage: false },
  fp_length_m: { label: 'False Positive (m)', isPercentage: false },
  fn_length_m: { label: 'False Negative (m)', isPercentage: false }
};
```

**Unused Fields (11):**
- `tp_count`, `fp_count`, `fn_count` - Path segment counts
- `ml_total_length_m`, `osm_total_length_m` - Total predicted/ground truth lengths
- `ml_count`, `osm_count` - Total segment counts
- `buffer_distance_m`, `alignment_angle_threshold_deg` - Config parameters
- `lat`, `lon` - Tile centers (shown in table but not visualized)

### Data Model

**Source:** `output/confusion_matrix_per_tile.json` (96 tiles)

**Per-Tile Structure (18 fields):**
```json
{
  "tile_id": "19_157130_191330",
  "xtile": 157130, "ytile": 191330,
  "lat": 42.35290, "lon": -71.06920,
  "tp_length_m": 156.78, "fp_length_m": 12.34, "fn_length_m": 8.45,
  "tp_count": 23, "fp_count": 3, "fn_count": 2,
  "precision": 0.9270, "recall": 0.9488, "f1_score": 0.9378, "iou": 0.8827,
  "ml_total_length_m": 169.12, "osm_total_length_m": 165.23,
  "ml_count": 26, "osm_count": 25,
  "buffer_distance_m": 5.0, "alignment_angle_threshold_deg": 15.0
}
```

### Key Functions

**Data Pipeline:**
- `loadData()` - Fetches JSON from file
- `processData(data)` - Computes grid layout (finds xtile/ytile ranges) + global stats (avg/median/min/max per metric)

**Rendering:**
- `renderStats(data)` - Updates 4 summary cards
- `renderHeatmap(data)` - Creates 12×8 CSS grid with colored cells + tooltips
- `renderScatter(data)` - Plots top 50 tiles (currently 1D)
- `renderTable(data)` - Generates sortable/filterable HTML table

**Utilities:**
- `formatValue(value, metric)` - Handles percentage vs. absolute formatting
- `getColorForValue(value, metric)` - Maps metric values to RGB colors (red→yellow→green gradient)

### Current Deficiencies (ML Analysis Perspective)

1. **No Global Confusion Matrix** - Missing aggregate TP/FP/FN view across all tiles
2. **1D Scatter Plot** - No multi-dimensional analysis (e.g., Precision vs. Recall tradeoffs)
3. **No Distribution Visualizations** - Can't see variance, outliers, quartiles
4. **No Error Composition Analysis** - Can't visualize TP/FP/FN proportions per tile
5. **No Cross-View Linking** - Clicking heatmap cell doesn't highlight in table/scatter
6. **No Spatial Context** - Lat/lon shown but no geographic visualization
7. **Static Stats** - No dynamic filtering or subgroup analysis
8. **Underutilized Data** - 11 of 18 fields never visualized

---

## B. Proposed Enhancements (10 Visualizations Ranked by Effort/Impact)

### 1. Global Confusion Matrix Display ⭐ (Very Low Effort, High Impact)

**What:** 2×2 grid showing aggregate TP/FP/TN/FN across all 96 tiles

**Why:** Currently NO aggregate confusion matrix view exists. This is fundamental ML evaluation.

**Data Required:**
- Sum `tp_length_m`, `fp_length_m`, `fn_length_m` across all tiles
- Compute TN as `global_TN = total_area - (TP + FP + FN)` (or omit if not applicable)

**Visual Design:**
```
┌─────────────┬─────────────┐
│   TP: 15.2km│   FP: 1.1km │
│   (91.2%)   │   (6.6%)    │
├─────────────┼─────────────┤
│   FN: 0.4km │   TN: N/A   │
│   (2.2%)    │             │
└─────────────┴─────────────┘
```
- 2×2 CSS grid (similar to heatmap cells but larger)
- Green background for TP, red for FP/FN
- Show both absolute length (km) and percentage of total

**Interactions:**
- Click any quadrant → filter table/heatmap to show only tiles contributing to that category
- Tooltip shows breakdown: "TP distributed across 96 tiles, avg 158m per tile"

**Code Placement:** Add new function `renderGlobalConfusionMatrix(data)` after line 620 (after `renderStats`), call it alongside stats rendering

**Complexity:** ⭐ Very Low (20-30 lines, simple sum aggregation)

---

### 2. 2D Scatter Plot: Precision vs. Recall ⭐⭐ (Low-Medium Effort, High Impact)

**What:** Replace current 1D scatter with true 2D plot showing Precision (x-axis) vs. Recall (y-axis)

**Why:** Current scatter just shows sorted metric values (essentially a bar chart). ML practitioners need to see **tradeoff relationships** between metrics.

**Data Required:**
- `precision`, `recall` from each tile
- Optional: Size bubbles by `f1_score`, color by `iou`

**Visual Design:**
```
    Recall (%)
    100 │         ● ●●
        │       ●●●  ●
     50 │     ●●
        │   ●
      0 └─────────────
        0    50    100
           Precision (%)
```
- SVG-based scatter (each tile = circle)
- Diagonal reference line (Precision = Recall)
- Quadrant labels: "High P, Low R" / "Balanced" / "High R, Low P" / "Poor"
- Hover tooltip: Tile ID + Precision/Recall/F1 values

**Interactions:**
- Click point → highlight tile in heatmap + scroll to row in table
- Brush/lasso selection (advanced) → filter to selected tiles
- Color-code by another metric (dropdown to choose: F1, IoU, TP length, etc.)

**Code Placement:** Replace `renderScatter()` function (lines 670-710) with new implementation

**Complexity:** ⭐⭐ Low-Medium (60-80 lines, SVG manipulation + event handlers)

---

### 3. Distribution Visualizations (Boxplots/Histograms) ⭐⭐ (Low-Medium Effort, Medium Impact)

**What:** Show distribution of each metric across 96 tiles using boxplots or histograms

**Why:** Current stats (avg/median/min/max) are good but don't reveal **variance, outliers, skewness**.

**Data Required:**
- Arrays of all values for each metric: `[tile1.f1, tile2.f1, ..., tile96.f1]`
- Compute quartiles (Q1, Q3), IQR, outliers

**Visual Design (Option A - Boxplots):**
```
F1 Score    ├─────[████]─────┤  ● outlier at 0.42
Precision   ├────[████]──────┤
Recall      ├───[████]───────┤
IoU         ├──────[████]────┤
            0%      50%     100%
```
- Horizontal boxplots (one per metric)
- Show whiskers (1.5×IQR), box (Q1-Q3), median line
- Highlight outliers as circles

**Visual Design (Option B - Histograms):**
```
F1 Score Distribution
Count
  30 │    ███
  20 │   ████
  10 │  ██████
   0 └─────────
     40% 60% 80% 100%
```
- 10-bin histogram for selected metric
- Overlay kernel density estimate (smoothed curve)

**Interactions:**
- Click a bin/box → filter tiles in that range
- Toggle between boxplot/histogram view
- Show distributions for filtered subset (e.g., only tiles with F1 > 70%)

**Code Placement:** Add new section in HTML between stats and view-content (around line 280), new function `renderDistributions(data)` after line 660

**Complexity:** ⭐⭐ Low-Medium (80-100 lines, quartile computation + SVG rendering)

---

### 4. Stacked Bar Chart: TP/FP/FN Composition ⭐⭐ (Low-Medium Effort, High Impact)

**What:** Show proportion of TP/FP/FN lengths for each tile in a stacked bar chart

**Why:** Quickly identify **error patterns** - which tiles have high FP (over-prediction) vs. FN (under-prediction)?

**Data Required:**
- `tp_length_m`, `fp_length_m`, `fn_length_m` per tile
- Normalize to percentages: `tp_pct = tp / (tp + fp + fn)`

**Visual Design:**
```
Tile 001 ████████░░ (80% TP, 15% FP, 5% FN)
Tile 002 ████████░░ (85% TP, 10% FP, 5% FN)
Tile 003 ██████░░░░ (60% TP, 30% FP, 10% FN) ← Problem tile!
...
```
- Horizontal bars (one per tile, sorted by F1 descending)
- Green segment = TP, Red = FP, Orange = FN
- Only show top 50 tiles (scrollable) to avoid clutter

**Interactions:**
- Hover bar → tooltip with absolute lengths (m) + percentages
- Click bar → highlight in heatmap + table
- Toggle sort: by F1, by FP%, by FN%, by tile_id

**Code Placement:** Add new view mode "Composition" in view-select dropdown, new function `renderCompositionBars(data)` after `renderScatter`

**Complexity:** ⭐⭐ Low-Medium (70-90 lines, SVG bars + sorting logic)

---

### 5. Metric Correlation Heatmap ⭐⭐⭐ (Medium Effort, Medium Impact)

**What:** Show correlation matrix between all 7 metrics (e.g., does high Precision correlate with low Recall?)

**Why:** Understand **inter-metric relationships** and potential tradeoffs across the dataset.

**Data Required:**
- Compute Pearson correlation coefficient for all pairs: `corr(precision, recall)`, `corr(f1, iou)`, etc.
- Results in 7×7 symmetric matrix

**Visual Design:**
```
            F1  Prec Rec  IoU  TP   FP   FN
F1         1.0  0.8  0.9  0.95 0.6 -0.3 -0.4
Precision  0.8  1.0  0.5  0.7  0.4 -0.5 -0.2
Recall     0.9  0.5  1.0  0.8  0.7 -0.1 -0.6
...
```
- 7×7 grid with color intensity (blue = +1 strong positive, red = -1 strong negative, white = 0)
- Diagonal always 1.0 (self-correlation)
- Hover cell → tooltip: "Precision vs. Recall: r = 0.52 (moderate positive)"

**Interactions:**
- Click cell → scatter plot of those two metrics appears in modal/overlay

**Code Placement:** Add new section in controls area, new function `renderCorrelationMatrix(data)` after distributions

**Complexity:** ⭐⭐⭐ Medium (100-120 lines, correlation computation + 7×7 grid rendering)

---

### 6. Sparklines in Summary Cards ⭐ (Very Low Effort, Low Impact)

**What:** Add mini line charts showing metric distribution inside each summary card

**Why:** Visual indicator of variance alongside avg/median/min/max numbers

**Data Required:**
- Array of metric values across 96 tiles (already available)

**Visual Design:**
```
┌────────────────────────────┐
│ Average F1: 93.8%          │
│ ▁▂▃▅▇█▇▅▃▂▁ (sparkline)    │
└────────────────────────────┘
```
- Tiny line chart (50px wide, 20px tall) embedded in card
- No axes, just shape visualization

**Interactions:** None (purely decorative)

**Code Placement:** Modify `renderStats()` function (around line 610), add sparkline generation helper

**Complexity:** ⭐ Very Low (30-40 lines, simple SVG path generation)

---

### 7. Dynamic Filtering: Multi-Metric Sliders ⭐⭐⭐ (Medium Effort, High Impact)

**What:** Allow filtering tiles by **multiple metrics simultaneously** (e.g., "Show tiles where F1 > 70% AND FP < 20m")

**Why:** Current filter only works on one metric at a time. ML analysis often requires **compound conditions**.

**Data Required:**
- All 7 metrics per tile
- Min/max ranges for each metric (already computed in `processData`)

**Visual Design:**
```
┌─ Filters ─────────────────────────────┐
│ F1 Score:      [██████░░░░] 70-100%   │
│ Precision:     [████░░░░░░] 50-100%   │
│ Recall:        [██████████] 0-100%    │  ← No filter
│ FP Length:     [░░░░░░████] 0-50m     │
│ FN Length:     [██████████] 0-50m     │  ← No filter
│ [Apply Filters] [Reset All]           │
└───────────────────────────────────────┘
Showing 42 of 96 tiles
```
- One range slider per metric (7 total)
- "Apply" button to trigger re-render (avoid lag on drag)
- Show count of filtered tiles

**Interactions:**
- Adjust sliders → click Apply → all views (heatmap/scatter/table) update to show only matching tiles
- Reset All → restore to 96 tiles
- Save filter preset (advanced): "High-quality tiles (F1 > 80%)"

**Code Placement:** Replace single filter-threshold slider (line 272) with expanded filter panel, modify all render functions to respect filters

**Complexity:** ⭐⭐⭐ Medium (120-150 lines, multi-range logic + UI changes)

---

### 8. Tile Detail Modal/Panel ⭐⭐⭐ (Medium Effort, Medium-High Impact)

**What:** Clicking any tile (in heatmap/scatter/table) opens detailed view showing **all 18 fields** + mini map of that tile's location

**Why:** Currently can only see 9 fields max (in table). Many fields (counts, totals, config) are hidden.

**Data Required:**
- All 18 fields for selected tile
- Tile bounds computed from lat/lon + zoom level (256px at zoom 19)

**Visual Design:**
```
┌─ Tile 19_157130_191330 ─────────────────────────┐
│ Location: 42.3529°N, 71.0692°W                  │
│ [Mini Leaflet Map showing tile bounds + paths]  │
│                                                  │
│ Performance Metrics:                             │
│   F1: 93.78%  │  Precision: 92.70%              │
│   Recall: 94.88%  │  IoU: 88.27%                │
│                                                  │
│ Confusion Matrix (Lengths):                     │
│   TP: 156.78m  │  FP: 12.34m  │  FN: 8.45m      │
│                                                  │
│ Confusion Matrix (Counts):                      │
│   TP: 23 segs  │  FP: 3 segs  │  FN: 2 segs     │
│                                                  │
│ Totals:                                          │
│   ML Predicted: 169.12m (26 segments)           │
│   OSM Ground Truth: 165.23m (25 segments)       │
│                                                  │
│ Config: Buffer 5m, Angle Threshold 15°          │
│ [View on Main Map] [Close]                      │
└─────────────────────────────────────────────────┘
```

**Interactions:**
- Click "View on Main Map" → opens `index.html` with URL params to zoom to this tile
- Hover mini map → highlight ML paths (blue) vs. OSM paths (green)

**Code Placement:** Add modal HTML template after line 400, new function `showTileDetail(tileData)` triggered by click events in heatmap/scatter/table

**Complexity:** ⭐⭐⭐ Medium (150-180 lines, modal UI + Leaflet mini-map initialization)

---

### 9. Export/Download Capabilities ⭐⭐ (Low-Medium Effort, Low-Medium Impact)

**What:** Allow downloading current view/data as CSV, JSON, or PNG image

**Why:** Enables **reproducible research** and sharing results with non-technical stakeholders.

**Data Required:**
- Filtered dataset (after applying threshold/filters)
- Current view rendering (for PNG export)

**Export Formats:**
- **CSV**: Table data with all 9 columns (or all 18 if checkbox enabled)
- **JSON**: Raw tile data (filtered subset)
- **PNG**: Screenshot of current heatmap/scatter/table view (using html2canvas library)

**Visual Design:**
```
┌─ Export ────────────────────────┐
│ Format:  (•) CSV  ( ) JSON      │
│ Include: [✓] All 18 fields      │
│ Filtered: 42 of 96 tiles        │
│ [Download] [Cancel]             │
└─────────────────────────────────┘
```
- Small export button in header (next to title)
- Modal dialog with format options

**Interactions:**
- CSV: `download` attribute on `<a>` tag with Blob URL
- JSON: Similar Blob approach
- PNG: Use `html2canvas` to render current view, download as image

**Code Placement:** Add export button in header (line 254), new function `exportData(format)` after utilities

**Complexity:** ⭐⭐ Low-Medium (80-100 lines, CSV/JSON generation + canvas library integration)

---

### 10. Mini Leaflet Map with Tile Highlighting ⭐⭐⭐⭐ (High Effort, High Impact)

**What:** Embed small Leaflet map showing all 96 tiles as rectangles, color-coded by selected metric

**Why:** Adds **spatial context** - see where high/low-performing tiles are geographically clustered.

**Data Required:**
- `lat`, `lon` per tile (centers)
- Tile bounds computed from zoom level 19 (each tile = ~50m × 50m at Boston latitude)
- Selected metric values for color-coding

**Visual Design:**
```
┌─ Spatial View ───────────────────────┐
│ [Small Leaflet map, 400×300px]       │
│ - 96 tile rectangles overlaid        │
│ - Color intensity = F1 score          │
│ - Green (high) → Red (low)            │
│ - OSM basemap for context             │
└──────────────────────────────────────┘
```
- Positioned in side panel or as 4th view mode
- Synchronized with metric selector (changes color scheme when user picks different metric)

**Interactions:**
- Hover tile rectangle → tooltip with tile_id + metric value
- Click tile → highlight in heatmap/table + open detail modal (from #8)
- Zoom/pan enabled (but defaults to fit all 96 tiles)

**Code Placement:** Add new `<div id="map-view">` in HTML (after line 340), new function `renderMiniMap(data)` calling Leaflet API

**Complexity:** ⭐⭐⭐⭐ High (200-250 lines, Leaflet initialization + 96 rectangle overlays + syncing with other views)

**Dependencies:** Requires Leaflet.js library (already used in main map, add to tilemetrics.html `<head>`)

---

## C. Implementation Specifications

### Code Organization Strategy

**Current State:** 771-line monolithic file (HTML + CSS + JS in one file)

**Recommendation:** Keep monolithic for now (easier maintenance, no build step), but organize into clearly marked sections:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Dependencies -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  
  <style>
    /* ========== EXISTING STYLES (Lines 1-250) ========== */
    /* Add new sections below */
    
    /* ========== GLOBAL CONFUSION MATRIX ========== */
    .global-confusion-matrix { ... }
    
    /* ========== DISTRIBUTION VISUALIZATIONS ========== */
    .boxplot-container { ... }
    
    /* ========== TILE DETAIL MODAL ========== */
    .tile-modal { ... }
    
    /* ========== MINI MAP ========== */
    #map-view { ... }
  </style>
</head>
<body>
  <!-- ========== EXISTING STRUCTURE (Lines 250-400) ========== -->
  
  <!-- ========== NEW SECTIONS ========== -->
  <div id="global-confusion-section" class="section">...</div>
  <div id="distribution-section" class="section">...</div>
  <div id="tile-modal" class="modal hidden">...</div>
  
  <script>
    /* ========== CONFIGURATION (Lines 440-460) ========== */
    const metricsConfig = { ... };
    
    /* ========== DATA LOADING (Lines 460-500) ========== */
    async function loadData() { ... }
    function processData(data) { ... }
    
    /* ========== RENDERING FUNCTIONS ========== */
    // Keep existing functions (lines 500-750)
    
    /* ========== NEW RENDERING FUNCTIONS ========== */
    function renderGlobalConfusionMatrix(data) {
      // Visualization #1 implementation
    }
    
    function renderScatter2D(data) {
      // Visualization #2 implementation (replaces old renderScatter)
    }
    
    function renderDistributions(data) {
      // Visualization #3 implementation
    }
    
    function renderCompositionBars(data) {
      // Visualization #4 implementation
    }
    
    /* ========== INTERACTIVITY HELPERS ========== */
    function showTileDetail(tileId) {
      // Visualization #8 implementation
    }
    
    function applyMultiFilters(filters) {
      // Visualization #7 implementation
    }
    
    /* ========== UTILITIES ========== */
    function computeCorrelation(arr1, arr2) { ... }
    function generateSparkline(values) { ... }
    function exportData(format) { ... }
    
    /* ========== EVENT LISTENERS (Lines 750-771) ========== */
    document.addEventListener('DOMContentLoaded', () => { ... });
  </script>
</body>
</html>
```

### Data Flow for New Visualizations

**Current Flow:**
```
loadData() → processData() → [renderStats, renderHeatmap, renderScatter, renderTable]
                                    ↓
                          User changes controls
                                    ↓
                          Re-run selected render function
```

**Enhanced Flow:**
```
loadData() → processData() → globalState = { data, filters, selection }
                                    ↓
        ┌───────────────────────────┴───────────────────────────┐
        ↓                           ↓                           ↓
  renderStats()              renderViews()              renderGlobalMatrix()
  - Summary cards            - Heatmap                  - Aggregate TP/FP/FN
  - Sparklines (#6)          - 2D Scatter (#2)          - (#1)
                             - Distributions (#3)
                             - Composition (#4)
                             - Mini Map (#10)
                                    ↓
                          User interaction (click/filter)
                                    ↓
                   updateGlobalState() → re-render all views
                                    ↓
                   highlightLinkedElements() → sync across views
```

### Priority Implementation Roadmap

**Phase 1: Quick Wins (1-2 hours coding time)**
1. Global Confusion Matrix (#1) ⭐
2. 2D Scatter Plot (#2) ⭐⭐
3. Distribution Boxplots (#3) ⭐⭐

**Phase 2: Error Analysis (2-3 hours)**
4. Stacked Bar Chart (#4) ⭐⭐
5. Tile Detail Modal (#8) ⭐⭐⭐

**Phase 3: Advanced Interactivity (3-4 hours)**
6. Dynamic Multi-Filtering (#7) ⭐⭐⭐
7. Sparklines (#6) ⭐

**Phase 4: Polish & Sharing (2-3 hours)**
8. Export Capabilities (#9) ⭐⭐
9. Correlation Heatmap (#5) ⭐⭐⭐

**Phase 5: Spatial Integration (4-5 hours)**
10. Mini Leaflet Map (#10) ⭐⭐⭐⭐

**Total Estimated Time:** 12-17 hours for full implementation

---

## D. Technical Requirements & Dependencies

### External Libraries Needed

**Currently Loaded:** None (pure JavaScript)

**Add to `<head>` for enhanced visualizations:**

```html
<!-- For Mini Leaflet Map (#10) -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- For PNG Export (#9) - Optional -->
<script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
```

All other visualizations use pure JavaScript + SVG/CSS (no dependencies).

### Browser Compatibility

**Target:** Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

**Assumptions:**
- CSS Grid support (required for heatmap)
- SVG 2.0 features (required for scatter/boxplots)
- ES6+ JavaScript (async/await, arrow functions, template literals)
- Fetch API (already used in `loadData()`)

**Graceful Degradation:** If Leaflet fails to load, hide mini-map section and show message.

### Data Validation & Error Handling

**Add at top of `processData()`:**

```javascript
function processData(data) {
  // Validate required fields
  const requiredFields = ['tile_id', 'xtile', 'ytile', 'f1_score', 'precision', 'recall'];
  const validTiles = data.filter(tile => 
    requiredFields.every(field => tile[field] !== undefined && tile[field] !== null)
  );
  
  if (validTiles.length < data.length) {
    console.warn(`${data.length - validTiles.length} tiles missing required fields, excluded from analysis`);
  }
  
  // Check for anomalies
  validTiles.forEach(tile => {
    if (tile.precision > 1 || tile.recall > 1) {
      console.warn(`Tile ${tile.tile_id}: Precision/Recall > 100%, data error?`);
    }
    if (tile.tp_length_m < 0 || tile.fp_length_m < 0 || tile.fn_length_m < 0) {
      console.error(`Tile ${tile.tile_id}: Negative confusion matrix values!`);
    }
  });
  
  // Continue with original processing...
}
```

---

## E. Testing & Validation Plan

### Visualization Accuracy Checks

1. **Global Confusion Matrix:**
   - Manually sum first 5 tiles' TP/FP/FN values
   - Verify displayed total matches manual sum
   - Check percentages sum to 100%

2. **2D Scatter Plot:**
   - Verify point positions: tile with Precision=92.7%, Recall=94.8% should appear at (92.7, 94.8)
   - Check diagonal reference line passes through (0,0) and (100,100)
   - Confirm hover tooltip shows correct tile_id

3. **Distribution Boxplots:**
   - Sort tiles by F1, manually find Q1 (25th percentile), median (50th), Q3 (75th)
   - Verify boxplot whiskers/box match calculated quartiles
   - Check outliers are correctly identified (> Q3 + 1.5×IQR)

4. **Stacked Bars:**
   - Pick tile with known TP=80m, FP=10m, FN=10m
   - Verify bar segments are 80%, 10%, 10% widths
   - Check color legend matches (green=TP, red=FP, orange=FN)

### Interaction Testing

- **Cross-View Linking:** Click heatmap cell #23 → verify table scrolls to row 23, scatter point 23 is highlighted
- **Filtering:** Set F1 slider to 70-100% → count visible heatmap cells, verify matches "Showing X of 96 tiles"
- **Modal:** Open tile detail for tile 19_157130_191330 → verify all 18 fields display correct values

### Performance Benchmarks

- **Initial Load:** < 1 second to render all views (96 tiles)
- **View Switching:** < 200ms to switch between heatmap/scatter/table
- **Filtering:** < 500ms to apply multi-metric filters and re-render
- **Mini Map:** < 2 seconds to render 96 tile rectangles with Leaflet

---

## F. Future Enhancements (Beyond Scope)

1. **Time-Series Analysis** - If running multiple model versions, compare metrics over time
2. **Model Comparison Mode** - Load two JSON files, show side-by-side heatmaps
3. **Annotation Tool** - Mark problematic tiles for manual review
4. **Clustering Analysis** - Auto-detect spatial clusters of low-performance tiles
5. **3D Surface Plot** - Show metric values as height map over geographic area
6. **Integration with Main Map** - Click "Analyze" on main map → auto-populate dashboard
7. **ML Model Insights** - If model metadata available, correlate tile features (building density, road complexity) with performance

---

## G. Decision Points for Implementation

### Question 1: Prioritization

**Which 3-5 visualizations should be implemented first?**

**Recommendation:** Start with #1 (Global Confusion Matrix), #2 (2D Scatter), #3 (Boxplots) - all quick wins that dramatically improve analytical depth.

### Question 2: Refactoring Scope

**Should we keep monolithic HTML file or split into separate JS modules?**

**Recommendation:** Keep monolithic for now (simpler deployment, no build step). Only refactor if file exceeds 2000 lines or team size grows > 2 developers.

### Question 3: Leaflet Integration

**Should mini-map (#10) be implemented, or is it over-engineered for current needs?**

**Recommendation:** Defer to Phase 5. Implement only if spatial analysis becomes primary use case (e.g., identifying geographic clusters of errors).

### Question 4: Export Formats

**Which export format is most valuable: CSV, JSON, or PNG?**

**Recommendation:** CSV for table data (most versatile for Excel/Python analysis). PNG export is nice-to-have but lower priority.

### Question 5: Mobile Responsiveness

**Should dashboard be optimized for mobile/tablet viewing?**

**Recommendation:** Not initially. Dashboard is analyst tool (desktop use case). Add mobile CSS media queries only if user feedback requests it.

---

## H. Summary & Next Steps

### Current State Assessment

The existing dashboard provides **basic overview capabilities** but lacks critical ML error-analysis features. It's functional for quick metric browsing but insufficient for serious model evaluation or debugging.

### Transformation Goals

Transform from "basic metrics viewer" to "professional ML evaluation dashboard" by adding:
- Aggregate confusion matrix view (currently missing)
- Multi-dimensional analysis (2D scatter, distributions, correlation)
- Error composition visualization (stacked bars)
- Cross-view linking (click → highlight across all views)
- Spatial context (mini-map with tile highlighting)

### Immediate Next Steps

1. **User Decision:** Review proposed visualizations, confirm priority order
2. **Phase 1 Implementation:** Code #1, #2, #3 (Global Matrix + 2D Scatter + Boxplots)
3. **Testing:** Validate accuracy using manual calculations on subset of tiles
4. **Iteration:** Gather feedback, adjust designs, move to Phase 2

### Success Criteria

**Before:** "The dashboard shows F1 scores in a grid. Not very insightful."

**After:** "I can now identify error patterns (FP vs. FN tradeoffs), see metric distributions, spot outlier tiles, and understand where the model struggles geographically. This is publication-ready analysis!"

---

**Ready for Implementation?** Let me know which visualizations to prioritize, and I'll start coding Phase 1!
