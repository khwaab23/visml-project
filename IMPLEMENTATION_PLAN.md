# visML Dashboard - Phased Implementation Plan

**Date:** November 30, 2025  
**Project:** visML Tile Metrics Dashboard Enhancement  
**Approach:** Incremental feature addition with continuous working state

---

## 🎯 GLOBAL OBJECTIVE

Transform `example/tilemetrics.html` from basic metrics viewer into professional ML error-analysis dashboard by adding:

1. **Global Confusion Matrix** (aggregate TP/FP/FN across all tiles)
2. **2D Precision vs Recall Scatter Plot** (replace 1D plot)
3. **Metric Distribution Visualizations** (boxplots showing quartiles, outliers)
4. **TP/FP/FN Stacked Bar Charts** (error composition per tile)
5. **Correlation Heatmap** (7×7 metric relationships)
6. **Performance Buckets** (group tiles by F1 score ranges)
7. **(Stretch)** Mini-map, sparklines, parallel coordinates, full cross-view linking

**Key Constraint:** Implement in **phased subsets** to maintain working dashboard at all times.

---

## 📌 CURRENT STATE SUMMARY

### Existing Dashboard Structure (`tilemetrics.html` - 771 lines)

**Sections:**
- **Stats Grid** (lines 258-262): 4 summary cards (Avg/Median/Min/Max)
- **Control Panel** (lines 264-278): View mode, metric select, sort by, filter threshold
- **View Sections** (lines 280-360):
  - Data Table (sortable, filterable)
  - Heatmap Grid (12×8 tiles, color-coded)
  - Scatter Plot (1D, shows top 50 tiles sorted by metric)

**Key Functions:**
- `loadData()` (line 460): Fetches `confusion_matrix_per_tile.json`
- `processData()` (line 480): Computes grid layout + stats (avg/median/min/max)
- `renderStats()` (line 610): Updates 4 summary cards
- `renderHeatmap()` (line 640): Generates 12×8 CSS grid
- `renderScatter()` (line 670): Plots 1D sorted values **(needs replacement)**
- `renderTable()` (line 710): Generates sortable HTML table
- `render()` (line 750): Master orchestrator, switches views

**Available Metrics (18 fields per tile):**
- **Currently visualized (7):** `f1_score`, `precision`, `recall`, `iou`, `tp_length_m`, `fp_length_m`, `fn_length_m`
- **Unused (11):** `tp_count`, `fp_count`, `fn_count`, `ml_total_length_m`, `osm_total_length_m`, `ml_count`, `osm_count`, `lat`, `lon`, `buffer_distance_m`, `alignment_angle_threshold_deg`

**Data Model:** 96 tiles (12×8 grid) from Boston study area

---

## 📋 IMPLEMENTATION PHASES

### 🔥 PHASE 1 – Core ML Visuals (Must-Have)

**Goal:** Add fundamental ML analysis capabilities without breaking existing features.

**Features (3):**

#### **1.1 Global Confusion Matrix Card**

**Complexity:** ⭐ Very Low (20-30 lines)  
**Impact:** High (currently missing aggregate view)

**Implementation Details:**
- **Location:** Insert **above** existing stats-grid (before line 258)
- **Data Source:** Sum `tp_length_m`, `fp_length_m`, `fn_length_m` across all 96 tiles
- **Visual:** 2×2 CSS grid showing TP (green), FP (red), FN (orange), Total (gray)
- **Display Format:** Absolute length (m or km) + percentage of total
- **Function:** `renderGlobalConfusionMatrix(data)` - called at start of `render()`
- **CSS Classes:** `.global-confusion-matrix`, `.cm-grid`, `.cm-cell` (with `.tp/.fp/.fn/.total` variants)

**Acceptance Criteria:**
- [ ] Sums match manual calculation (first 5 tiles)
- [ ] Percentages sum to 100%
- [ ] Card always visible regardless of view mode
- [ ] Existing 4 summary cards remain functional

---

#### **1.2 2D Precision vs Recall Scatter Plot**

**Complexity:** ⭐⭐ Low-Medium (60-80 lines)  
**Impact:** High (replaces useless 1D plot with actual metric relationship analysis)

**Implementation Details:**
- **Location:** Replace `renderScatter()` function (lines 670-710)
- **Data Source:** `tile.precision`, `tile.recall`, `tile.f1_score` for all filtered tiles
- **Visual:** SVG scatter plot (600×400px)
  - X-axis: Precision (0-100%)
  - Y-axis: Recall (0-100%)
  - Points: Circles colored by F1 score (green=high, red=low)
  - Reference line: Diagonal dashed line (Precision = Recall)
- **Interactions:** Hover → tooltip showing tile_id + metrics
- **Function:** `renderScatter2D(data)` - replaces `renderScatter()`
- **Reuse:** `getColorForValue(f1, 'f1_score')` for point colors

**Acceptance Criteria:**
- [ ] Point at (92.7, 94.8) corresponds to tile with Precision=92.7%, Recall=94.8%
- [ ] Diagonal line passes through (0,0) and (100,100)
- [ ] Hover tooltip shows correct tile_id
- [ ] Existing heatmap/table views unaffected

---

#### **1.3 Distributions View Mode (Boxplots)**

**Complexity:** ⭐⭐ Low-Medium (80-100 lines)  
**Impact:** Medium-High (reveals variance, outliers, data quality)

**Implementation Details:**
- **Location:** New view section after `#scatter-section` (line 340)
- **Data Source:** Arrays of metric values for F1, Precision, Recall, IoU
- **Visual:** 4 horizontal boxplots (one per metric, 600×60px each)
  - Box: Q1 to Q3 (light blue fill, dark stroke)
  - Median: Thick vertical line inside box
  - Whiskers: Extend to min/max or 1.5×IQR
  - Outliers: Circles beyond whiskers
  - Axis: 0-100% scale labels
- **Function:** `renderDistributions(data)` + helper `computeQuartiles(values)`
- **View Mode:** Add "Distributions" option to view-select dropdown (line 266)
- **CSS Classes:** `.boxplot-container`, `.boxplot-row`, `.boxplot-svg`

**Acceptance Criteria:**
- [ ] Manual sort of F1 values matches Q1/median/Q3 positions in boxplot
- [ ] Outliers correctly identified (> Q3 + 1.5×IQR)
- [ ] Hover tooltip shows quartile values
- [ ] Switching to other views (heatmap/table/scatter) still works

---

### 🟠 PHASE 2 – Error Composition + Relationships

**Goal:** Deeper error analysis and metric correlations.

**Features (3):**

#### **2.1 TP/FP/FN Stacked Bar Chart**

**Complexity:** ⭐⭐ Low-Medium (70-90 lines)  
**Impact:** High (visualizes error composition per tile)

**Implementation Details:**
- **Location:** New view mode "Composition"
- **Data Source:** Normalize `tp/fp/fn_length_m` to percentages per tile
- **Visual:** Horizontal stacked bars (top 50 tiles, sorted by F1)
  - Green segment = TP%, Red = FP%, Orange = FN%
- **Function:** `renderCompositionBars(data)`
- **Interactions:** Hover → show absolute lengths + percentages

---

#### **2.2 Metric Correlation Heatmap**

**Complexity:** ⭐⭐⭐ Medium (100-120 lines)  
**Impact:** Medium (reveals metric relationships, useful for model analysis)

**Implementation Details:**
- **Location:** New section in control panel or below stats
- **Data Source:** Compute Pearson correlation for all 7 metric pairs
- **Visual:** 7×7 grid (blue=positive, red=negative, white=zero)
- **Function:** `computeCorrelationMatrix(data)` + `renderCorrelationHeatmap(matrix)`
- **Interactions:** Click cell → mini scatter plot of those two metrics

---

#### **2.3 Performance Buckets (Small Multiples)**

**Complexity:** ⭐⭐⭐ Medium (90-110 lines)  
**Impact:** Medium (quick overview of tile quality distribution)

**Implementation Details:**
- **Location:** New view mode "Buckets"
- **Data Source:** Group tiles by F1 ranges (Excellent >90%, Good 70-90%, Fair 50-70%, Poor <50%)
- **Visual:** 4 mini heatmaps (one per bucket)
- **Function:** `renderBuckets(data)`

---

### 🔵 PHASE 3 – Advanced Features (Stretch Goals)

**Features (4):**

#### **3.1 Mini Leaflet Map with Tile Highlighting**

**Complexity:** ⭐⭐⭐⭐ High (200-250 lines)  
**Dependencies:** Leaflet.js library

---

#### **3.2 Sparklines in Summary Cards**

**Complexity:** ⭐ Very Low (30-40 lines)  
**Visual:** Tiny line charts embedded in avg/median/min/max cards

---

#### **3.3 Parallel Coordinates Plot**

**Complexity:** ⭐⭐⭐⭐ High (180-220 lines)  
**Visual:** Multi-dimensional analysis (all 7 metrics as vertical axes)

---

#### **3.4 Full Cross-View Linking**

**Complexity:** ⭐⭐⭐⭐ High (150-200 lines)  
**Implementation:** Global state management + click handlers in all views

---

## 🛠️ DETAILED IMPLEMENTATION SPECS (PHASE 1)

### Feature 1.1: Global Confusion Matrix Card

#### **File Modifications:**

**1. HTML Addition (before line 258):**
```html
<!-- Global Confusion Matrix -->
<div id="global-confusion-matrix" class="section">
  <h2>Global Confusion Matrix (All 96 Tiles)</h2>
  <div class="cm-grid">
    <!-- Populated by renderGlobalConfusionMatrix() -->
  </div>
</div>
```

**2. CSS Addition (around line 150):**
```css
.global-confusion-matrix {
  margin-bottom: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.cm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  max-width: 600px;
  margin: 0 auto;
}

.cm-cell {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.cm-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.cm-cell.tp {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.5);
}

.cm-cell.fp {
  background: rgba(244, 67, 54, 0.2);
  border-color: rgba(244, 67, 54, 0.5);
}

.cm-cell.fn {
  background: rgba(255, 152, 0, 0.2);
  border-color: rgba(255, 152, 0, 0.5);
}

.cm-cell.total {
  background: rgba(158, 158, 158, 0.1);
  border-color: rgba(158, 158, 158, 0.3);
}

.cm-cell h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  text-transform: uppercase;
  opacity: 0.8;
}

.cm-cell .value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.cm-cell .percentage {
  font-size: 16px;
  opacity: 0.7;
}
```

**3. JavaScript Function (after line 620):**
```javascript
function renderGlobalConfusionMatrix(data) {
  const container = document.querySelector('.cm-grid');
  if (!container) return;

  // Sum TP/FP/FN across all tiles
  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;

  data.forEach(tile => {
    totalTP += tile.tp_length_m || 0;
    totalFP += tile.fp_length_m || 0;
    totalFN += tile.fn_length_m || 0;
  });

  const total = totalTP + totalFP + totalFN;

  // Calculate percentages
  const tpPct = ((totalTP / total) * 100).toFixed(1);
  const fpPct = ((totalFP / total) * 100).toFixed(1);
  const fnPct = ((totalFN / total) * 100).toFixed(1);

  // Format lengths (convert to km if > 1000m)
  const formatLength = (m) => {
    return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`;
  };

  // Generate HTML
  container.innerHTML = `
    <div class="cm-cell tp">
      <h3>True Positive (TP)</h3>
      <div class="value">${formatLength(totalTP)}</div>
      <div class="percentage">${tpPct}%</div>
    </div>
    <div class="cm-cell fp">
      <h3>False Positive (FP)</h3>
      <div class="value">${formatLength(totalFP)}</div>
      <div class="percentage">${fpPct}%</div>
    </div>
    <div class="cm-cell fn">
      <h3>False Negative (FN)</h3>
      <div class="value">${formatLength(totalFN)}</div>
      <div class="percentage">${fnPct}%</div>
    </div>
    <div class="cm-cell total">
      <h3>Total Evaluated</h3>
      <div class="value">${formatLength(total)}</div>
      <div class="percentage">100%</div>
    </div>
  `;
}
```

**4. Call in render() function (line 750):**
```javascript
function render() {
  // Always render global confusion matrix
  renderGlobalConfusionMatrix(processedData.data);

  // ... rest of existing render logic
}
```

---

### Feature 1.2: 2D Precision vs Recall Scatter Plot

#### **File Modifications:**

**1. Replace renderScatter() function (lines 670-710):**

```javascript
function renderScatter2D(data) {
  const container = document.getElementById('scatter-section');
  if (!container) return;

  // SVG dimensions
  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Create SVG
  let svg = container.querySelector('svg');
  if (svg) svg.remove();

  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.style.display = 'block';
  svg.style.margin = '0 auto';
  container.appendChild(svg);

  // Create group for plot area
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
  svg.appendChild(g);

  // Scales (0-100% for both axes)
  const xScale = (val) => (val / 100) * plotWidth;
  const yScale = (val) => plotHeight - (val / 100) * plotHeight;

  // Draw axes
  // X-axis
  const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  xAxis.setAttribute('x1', 0);
  xAxis.setAttribute('y1', plotHeight);
  xAxis.setAttribute('x2', plotWidth);
  xAxis.setAttribute('y2', plotHeight);
  xAxis.setAttribute('stroke', '#666');
  xAxis.setAttribute('stroke-width', 2);
  g.appendChild(xAxis);

  // Y-axis
  const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  yAxis.setAttribute('x1', 0);
  yAxis.setAttribute('y1', 0);
  yAxis.setAttribute('x2', 0);
  yAxis.setAttribute('y2', plotHeight);
  yAxis.setAttribute('stroke', '#666');
  yAxis.setAttribute('stroke-width', 2);
  g.appendChild(yAxis);

  // Draw diagonal reference line (Precision = Recall)
  const diagonal = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  diagonal.setAttribute('x1', 0);
  diagonal.setAttribute('y1', plotHeight);
  diagonal.setAttribute('x2', plotWidth);
  diagonal.setAttribute('y2', 0);
  diagonal.setAttribute('stroke', '#888');
  diagonal.setAttribute('stroke-width', 1);
  diagonal.setAttribute('stroke-dasharray', '5,5');
  diagonal.setAttribute('opacity', 0.5);
  g.appendChild(diagonal);

  // Add axis labels and ticks
  for (let i = 0; i <= 100; i += 20) {
    // X-axis ticks
    const xTick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xTick.setAttribute('x1', xScale(i));
    xTick.setAttribute('y1', plotHeight);
    xTick.setAttribute('x2', xScale(i));
    xTick.setAttribute('y2', plotHeight + 5);
    xTick.setAttribute('stroke', '#666');
    g.appendChild(xTick);

    const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLabel.setAttribute('x', xScale(i));
    xLabel.setAttribute('y', plotHeight + 20);
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('fill', '#ccc');
    xLabel.setAttribute('font-size', '12px');
    xLabel.textContent = `${i}%`;
    g.appendChild(xLabel);

    // Y-axis ticks
    const yTick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yTick.setAttribute('x1', -5);
    yTick.setAttribute('y1', yScale(i));
    yTick.setAttribute('x2', 0);
    yTick.setAttribute('y2', yScale(i));
    yTick.setAttribute('stroke', '#666');
    g.appendChild(yTick);

    const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yLabel.setAttribute('x', -10);
    yLabel.setAttribute('y', yScale(i));
    yLabel.setAttribute('text-anchor', 'end');
    yLabel.setAttribute('dominant-baseline', 'middle');
    yLabel.setAttribute('fill', '#ccc');
    yLabel.setAttribute('font-size', '12px');
    yLabel.textContent = `${i}%`;
    g.appendChild(yLabel);
  }

  // Axis titles
  const xTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  xTitle.setAttribute('x', plotWidth / 2);
  xTitle.setAttribute('y', plotHeight + 40);
  xTitle.setAttribute('text-anchor', 'middle');
  xTitle.setAttribute('fill', '#fff');
  xTitle.setAttribute('font-size', '14px');
  xTitle.setAttribute('font-weight', 'bold');
  xTitle.textContent = 'Precision (%)';
  g.appendChild(xTitle);

  const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  yTitle.setAttribute('x', -plotHeight / 2);
  yTitle.setAttribute('y', -45);
  yTitle.setAttribute('text-anchor', 'middle');
  yTitle.setAttribute('fill', '#fff');
  yTitle.setAttribute('font-size', '14px');
  yTitle.setAttribute('font-weight', 'bold');
  yTitle.setAttribute('transform', 'rotate(-90)');
  yTitle.textContent = 'Recall (%)';
  g.appendChild(yTitle);

  // Plot points
  data.forEach(tile => {
    const precision = (tile.precision * 100) || 0;
    const recall = (tile.recall * 100) || 0;
    const f1 = tile.f1_score || 0;

    const cx = xScale(precision);
    const cy = yScale(recall);

    // Get color based on F1 score
    const color = getColorForValue(f1, 'f1_score');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', 5);
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', 1);
    circle.setAttribute('opacity', 0.8);
    circle.style.cursor = 'pointer';

    // Tooltip on hover
    circle.addEventListener('mouseenter', (e) => {
      circle.setAttribute('r', 7);
      circle.setAttribute('stroke-width', 2);
      circle.setAttribute('opacity', 1);

      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'scatter-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.left = `${e.clientX + 10}px`;
      tooltip.style.top = `${e.clientY - 10}px`;
      tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '10px';
      tooltip.style.borderRadius = '5px';
      tooltip.style.fontSize = '12px';
      tooltip.style.zIndex = '10000';
      tooltip.style.pointerEvents = 'none';
      tooltip.innerHTML = `
        <strong>Tile:</strong> ${tile.tile_id}<br>
        <strong>Precision:</strong> ${precision.toFixed(1)}%<br>
        <strong>Recall:</strong> ${recall.toFixed(1)}%<br>
        <strong>F1:</strong> ${(f1 * 100).toFixed(1)}%
      `;
      document.body.appendChild(tooltip);

      circle._tooltip = tooltip;
    });

    circle.addEventListener('mouseleave', () => {
      circle.setAttribute('r', 5);
      circle.setAttribute('stroke-width', 1);
      circle.setAttribute('opacity', 0.8);

      if (circle._tooltip) {
        document.body.removeChild(circle._tooltip);
        circle._tooltip = null;
      }
    });

    g.appendChild(circle);
  });
}
```

**2. Update render() function to call renderScatter2D:**
```javascript
case 'scatter':
  document.getElementById('scatter-section').style.display = 'block';
  renderScatter2D(filteredData);  // Changed from renderScatter
  break;
```

---

### Feature 1.3: Distributions View Mode (Boxplots)

#### **File Modifications:**

**1. HTML - Add to view-select dropdown (line 266):**
```html
<option value="distributions">Distributions</option>
```

**2. HTML - Add new section (after line 340):**
```html
<div id="distributions-section" class="view-section" style="display: none;">
  <h2>Metric Distributions</h2>
  <div class="boxplot-container">
    <!-- Populated by renderDistributions() -->
  </div>
</div>
```

**3. CSS Addition (around line 200):**
```css
.boxplot-container {
  padding: 20px;
}

.boxplot-row {
  margin-bottom: 30px;
}

.boxplot-label {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #fff;
}

.boxplot-svg {
  display: block;
  margin: 0 auto;
}
```

**4. JavaScript Functions (after line 710):**

```javascript
function computeQuartiles(values) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const min = sorted[0];
  const max = sorted[n - 1];

  // Identify outliers
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = sorted.filter(v => v < lowerBound || v > upperBound);

  return { min, q1, median, q3, max, iqr, outliers, lowerBound, upperBound };
}

function renderDistributions(data) {
  const container = document.querySelector('.boxplot-container');
  if (!container) return;

  container.innerHTML = '';

  const metrics = ['f1_score', 'precision', 'recall', 'iou'];
  const width = 700;
  const height = 80;
  const margin = { top: 10, right: 20, bottom: 30, left: 150 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  metrics.forEach(metric => {
    // Extract values
    const values = data.map(tile => (tile[metric] || 0) * 100); // Convert to percentage
    const stats = computeQuartiles(values);
    if (!stats) return;

    // Create container for this metric
    const row = document.createElement('div');
    row.className = 'boxplot-row';

    const label = document.createElement('div');
    label.className = 'boxplot-label';
    label.textContent = metricsConfig[metric]?.label || metric;
    row.appendChild(label);

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'boxplot-svg');
    row.appendChild(svg);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    // Scale (0-100%)
    const xScale = (val) => (val / 100) * plotWidth;
    const centerY = plotHeight / 2;

    // Draw axis
    const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    axis.setAttribute('x1', 0);
    axis.setAttribute('y1', centerY);
    axis.setAttribute('x2', plotWidth);
    axis.setAttribute('y2', centerY);
    axis.setAttribute('stroke', '#444');
    axis.setAttribute('stroke-width', 1);
    g.appendChild(axis);

    // Draw whiskers
    const whiskerLeft = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    whiskerLeft.setAttribute('x1', xScale(Math.max(stats.min, stats.lowerBound)));
    whiskerLeft.setAttribute('y1', centerY);
    whiskerLeft.setAttribute('x2', xScale(stats.q1));
    whiskerLeft.setAttribute('y2', centerY);
    whiskerLeft.setAttribute('stroke', '#4CAF50');
    whiskerLeft.setAttribute('stroke-width', 2);
    g.appendChild(whiskerLeft);

    const whiskerRight = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    whiskerRight.setAttribute('x1', xScale(stats.q3));
    whiskerRight.setAttribute('y1', centerY);
    whiskerRight.setAttribute('x2', xScale(Math.min(stats.max, stats.upperBound)));
    whiskerRight.setAttribute('y2', centerY);
    whiskerRight.setAttribute('stroke', '#4CAF50');
    whiskerRight.setAttribute('stroke-width', 2);
    g.appendChild(whiskerRight);

    // Draw box (Q1 to Q3)
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('x', xScale(stats.q1));
    box.setAttribute('y', centerY - 15);
    box.setAttribute('width', xScale(stats.q3) - xScale(stats.q1));
    box.setAttribute('height', 30);
    box.setAttribute('fill', 'rgba(76, 175, 80, 0.3)');
    box.setAttribute('stroke', '#4CAF50');
    box.setAttribute('stroke-width', 2);
    g.appendChild(box);

    // Draw median line
    const medianLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    medianLine.setAttribute('x1', xScale(stats.median));
    medianLine.setAttribute('y1', centerY - 15);
    medianLine.setAttribute('x2', xScale(stats.median));
    medianLine.setAttribute('y2', centerY + 15);
    medianLine.setAttribute('stroke', '#FF5722');
    medianLine.setAttribute('stroke-width', 3);
    g.appendChild(medianLine);

    // Draw outliers
    stats.outliers.forEach(outlier => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', xScale(outlier));
      circle.setAttribute('cy', centerY);
      circle.setAttribute('r', 4);
      circle.setAttribute('fill', '#FF5722');
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', 1);
      g.appendChild(circle);
    });

    // Add tick labels
    for (let i = 0; i <= 100; i += 20) {
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', xScale(i));
      tick.setAttribute('y1', centerY);
      tick.setAttribute('x2', xScale(i));
      tick.setAttribute('y2', centerY + 5);
      tick.setAttribute('stroke', '#666');
      g.appendChild(tick);

      const tickLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tickLabel.setAttribute('x', xScale(i));
      tickLabel.setAttribute('y', centerY + 20);
      tickLabel.setAttribute('text-anchor', 'middle');
      tickLabel.setAttribute('fill', '#999');
      tickLabel.setAttribute('font-size', '10px');
      tickLabel.textContent = `${i}%`;
      g.appendChild(tickLabel);
    }

    // Add tooltip to box
    box.style.cursor = 'pointer';
    box.addEventListener('mouseenter', (e) => {
      const tooltip = document.createElement('div');
      tooltip.style.position = 'fixed';
      tooltip.style.left = `${e.clientX + 10}px`;
      tooltip.style.top = `${e.clientY - 10}px`;
      tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '10px';
      tooltip.style.borderRadius = '5px';
      tooltip.style.fontSize = '12px';
      tooltip.style.zIndex = '10000';
      tooltip.style.pointerEvents = 'none';
      tooltip.innerHTML = `
        <strong>Q1:</strong> ${stats.q1.toFixed(1)}%<br>
        <strong>Median:</strong> ${stats.median.toFixed(1)}%<br>
        <strong>Q3:</strong> ${stats.q3.toFixed(1)}%<br>
        <strong>IQR:</strong> ${stats.iqr.toFixed(1)}%<br>
        <strong>Outliers:</strong> ${stats.outliers.length}
      `;
      document.body.appendChild(tooltip);
      box._tooltip = tooltip;
    });

    box.addEventListener('mouseleave', () => {
      if (box._tooltip) {
        document.body.removeChild(box._tooltip);
        box._tooltip = null;
      }
    });

    container.appendChild(row);
  });
}
```

**5. Update render() function to include distributions:**
```javascript
case 'distributions':
  document.getElementById('distributions-section').style.display = 'block';
  renderDistributions(filteredData);
  break;
```

---

## ✅ TESTING CHECKLIST

### After Feature 1.1 (Global Confusion Matrix):
- [ ] Open browser at `localhost:8000/tilemetrics.html`
- [ ] Verify confusion matrix card appears above stats grid
- [ ] Manually sum first 5 tiles: `tile[0].tp_length_m + tile[1].tp_length_m + ...`
- [ ] Check if TP + FP + FN percentages = 100%
- [ ] Test all existing views still work (table, heatmap, scatter)

### After Feature 1.2 (2D Scatter):
- [ ] Switch to Scatter view
- [ ] Verify axes show 0-100% labels
- [ ] Hover over point, confirm tooltip shows correct tile_id
- [ ] Manually check: tile with P=92.7%, R=94.8% appears at correct coordinates
- [ ] Verify diagonal reference line is visible

### After Feature 1.3 (Distributions):
- [ ] Select "Distributions" from view dropdown
- [ ] Verify 4 boxplots appear (F1, Precision, Recall, IoU)
- [ ] Manually sort F1 values in console, verify Q1/median/Q3 positions match
- [ ] Hover over box, confirm tooltip shows quartile values
- [ ] Check outliers are marked as red circles

---

## 📊 ESTIMATED TIMELINE

**Phase 1 Implementation:**
- Feature 1.1: 30-45 minutes
- Feature 1.2: 60-90 minutes
- Feature 1.3: 90-120 minutes
- Testing: 30 minutes
- **Total Phase 1: 3.5-5 hours**

**Phase 2 (Future):** 4-6 hours  
**Phase 3 (Stretch):** 8-12 hours

---

## 🚀 READY TO BEGIN

**Next Command:**
- **"Implement Feature 1.1"** → Generate Global Confusion Matrix code
- **"Implement Feature 1.2"** → Generate 2D Scatter code
- **"Implement Feature 1.3"** → Generate Distributions code
- **"Implement all Phase 1 features"** → Generate all three at once

Awaiting your instruction! 🎯
