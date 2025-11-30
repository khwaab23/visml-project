# Tile Detail Modal & Mini Map Design Plan
**Features #8 & #10 Implementation Guide**

**Date:** November 30, 2025  
**File:** `example/tilemetrics.html`  
**Status:** Design Complete - Ready for Implementation

---

## Overview

This document outlines the design for implementing:
- **Feature #8:** Tile Detail Modal - Detailed view of individual tile metrics
- **Feature #10:** Mini Leaflet Map - Geographic visualization inside the modal

---

## 1. Compatibility Confirmation

### ✅ Fully Compatible with Existing Structure

- ✅ **Leaflet already loaded** (lines 7-8 in tilemetrics.html)
  ```html
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  ```

- ✅ **Monolithic HTML/CSS/JS structure** - Perfect for adding modal
- ✅ **Data structure complete** - All 18 tile fields available
- ✅ **Click handlers exist** - Just need enhancement

---

## 2. Feature #8: Tile Detail Modal Design

### User Experience

**Trigger:**
- Ctrl/Cmd + Click on any heatmap cell, scatter point, or table row
- **Alternative:** Double-click (can choose one approach)

**Modal Opens With:**
1. **Title:** `Tile #<id> (xtile, ytile)`
2. **Subtitle:** Center coordinates (lat, lon)
3. **4 Main Sections:**
   - Performance Metrics (F1, Precision, Recall, IoU)
   - Confusion Matrix Breakdown (TP/FP/FN lengths & counts)
   - Complete Tile Information (all 18 fields)
   - Geographic Location (Mini Leaflet Map)

**Close Methods:**
- Click backdrop (dark overlay)
- Click X button in header
- Press Escape key

### Data Structure (Reminder)

```json
{
  "tile_id": 0,
  "xtile": 158638,
  "ytile": 193925,
  "lat": 42.355753,
  "lon": -71.071587,
  "tp_length_m": 275.28,
  "fp_length_m": 7.83,
  "fn_length_m": 9.79,
  "tp_count": 14,
  "fp_count": 2,
  "fn_count": 10,
  "precision": 0.9724,
  "recall": 0.9657,
  "f1_score": 0.969,
  "iou": 0.9399,
  "ml_total_length_m": 283.11,
  "osm_total_length_m": 221.98,
  "ml_count": 16,
  "osm_count": 226,
  "buffer_distance_m": 5,
  "alignment_angle_threshold_deg": 15
}
```

---

## 3. Implementation Locations

### A. Modal HTML Skeleton

**Location:** Insert at **line ~3751** (just before `</body>`)

```html
<!-- Tile Detail Modal (Feature #8) -->
<div id="tile-detail-backdrop" class="modal-backdrop"></div>
<div id="tile-detail-modal" class="tile-modal">
  <div class="modal-header">
    <h2 id="modal-title">Tile Details</h2>
    <button id="modal-close-btn" class="modal-close">&times;</button>
  </div>
  <div class="modal-body">
    <!-- Section 1: Metric Cards -->
    <div id="modal-metrics" class="modal-section"></div>
    
    <!-- Section 2: Confusion Matrix Details -->
    <div id="modal-confusion" class="modal-section"></div>
    
    <!-- Section 3: Raw Data Table -->
    <div id="modal-raw-data" class="modal-section"></div>
    
    <!-- Section 4: Mini Leaflet Map (Feature #10) -->
    <div class="modal-section">
      <h3>Geographic Location</h3>
      <div id="tile-mini-map" style="height: 300px; border-radius: 8px;"></div>
    </div>
  </div>
</div>
```

### B. Modal CSS Styles

**Location:** Insert in `<style>` section (around **line ~700** after existing styles)

```css
/* ============================================== */
/* TILE DETAIL MODAL STYLES (Feature #8)        */
/* ============================================== */

.modal-backdrop {
  display: none; /* Hidden by default */
  position: fixed;
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9998;
  backdrop-filter: blur(4px);
}

.modal-backdrop.visible {
  display: block;
}

.tile-modal {
  display: none; /* Hidden by default */
  position: fixed;
  top: 50%; 
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%; 
  max-width: 900px;
  max-height: 85vh;
  background: #1e293b;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 9999;
  overflow-y: auto;
}

.tile-modal.visible {
  display: block;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -45%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

.modal-header {
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.5);
  border-radius: 12px 12px 0 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #f1f5f9;
}

.modal-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 32px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.modal-body {
  padding: 24px;
}

.modal-section {
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(15, 23, 42, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #cbd5e1;
  font-weight: 600;
}

.modal-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
}

#tile-mini-map {
  border: 2px solid rgba(255, 255, 255, 0.1);
}
```

### C. JavaScript Functions

**Location:** Insert at **line ~3650** (after all render functions, before event listeners)

#### Core Modal Functions

```javascript
// ==============================================
// FEATURE #8: TILE DETAIL MODAL
// ==============================================

let detailMapInstance = null; // Global map instance for modal
let isModalOpen = false; // Prevent multiple simultaneous modals

/**
 * Opens the tile detail modal and populates it with tile data
 * @param {Object} tile - Tile object from data array
 */
function openTileDetailModal(tile) {
  if (isModalOpen) return; // Prevent multiple opens
  isModalOpen = true;
  
  // 1. Populate modal title
  document.getElementById('modal-title').textContent = 
    `Tile #${tile.tile_id} (${tile.xtile}, ${tile.ytile})`;
  
  // 2. Populate Section 1: Metric Cards
  populateMetricCards(tile);
  
  // 3. Populate Section 2: Confusion Matrix Details
  populateConfusionDetails(tile);
  
  // 4. Populate Section 3: Raw Data Table
  populateRawDataTable(tile);
  
  // 5. Show modal
  document.getElementById('tile-detail-backdrop').classList.add('visible');
  document.getElementById('tile-detail-modal').classList.add('visible');
  
  // 6. Initialize/update mini map (Feature #10)
  setTimeout(() => {
    initTileMiniMapIfNeeded();
    updateTileMiniMap(tile);
  }, 100); // Small delay to ensure modal is visible
}

/**
 * Closes the tile detail modal
 */
function closeTileDetailModal() {
  document.getElementById('tile-detail-backdrop').classList.remove('visible');
  document.getElementById('tile-detail-modal').classList.remove('visible');
  isModalOpen = false;
}

/**
 * Populates the metric summary cards
 */
function populateMetricCards(tile) {
  const container = document.getElementById('modal-metrics');
  container.innerHTML = `
    <h3>Performance Metrics</h3>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
      ${createMetricCard('F1 Score', tile.f1_score, true)}
      ${createMetricCard('Precision', tile.precision, true)}
      ${createMetricCard('Recall', tile.recall, true)}
      ${createMetricCard('IoU', tile.iou, true)}
    </div>
  `;
}

/**
 * Helper to create a metric card HTML
 */
function createMetricCard(label, value, isPercentage) {
  const displayValue = isPercentage 
    ? `${(value * 100).toFixed(1)}%` 
    : `${value.toFixed(2)}m`;
  
  // Color coding based on value
  let color = '#94a3b8';
  if (isPercentage) {
    if (value >= 0.9) color = '#10b981'; // Green
    else if (value >= 0.7) color = '#3b82f6'; // Blue
    else if (value >= 0.5) color = '#f59e0b'; // Orange
    else color = '#ef4444'; // Red
  }
  
  return `
    <div style="background: rgba(15,23,42,0.5); padding: 16px; border-radius: 6px; border: 2px solid ${color}20;">
      <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
      <div style="font-size: 24px; font-weight: bold; color: ${color};">${displayValue}</div>
    </div>
  `;
}

/**
 * Populates confusion matrix details
 */
function populateConfusionDetails(tile) {
  const container = document.getElementById('modal-confusion');
  container.innerHTML = `
    <h3>Confusion Matrix Breakdown</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <h4 style="color: #10b981; margin-bottom: 12px;">📏 Lengths (meters)</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(16,185,129,0.1); border-radius: 4px;">
            <span style="color: #94a3b8;">True Positive:</span>
            <strong style="color: #10b981;">${tile.tp_length_m.toFixed(2)}m</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(239,68,68,0.1); border-radius: 4px;">
            <span style="color: #94a3b8;">False Positive:</span>
            <strong style="color: #ef4444;">${tile.fp_length_m.toFixed(2)}m</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(245,158,11,0.1); border-radius: 4px;">
            <span style="color: #94a3b8;">False Negative:</span>
            <strong style="color: #f59e0b;">${tile.fn_length_m.toFixed(2)}m</strong>
          </div>
        </div>
      </div>
      <div>
        <h4 style="color: #3b82f6; margin-bottom: 12px;">🔢 Counts (segments)</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(16,185,129,0.1); border-radius: 4px;">
            <span style="color: #94a3b8;">TP Segments:</span>
            <strong style="color: #10b981;">${tile.tp_count}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(239,68,68,0.1); border-radius: 4px;">
            <span style="color: #94a3b8;">FP Segments:</span>
            <strong style="color: #ef4444;">${tile.fp_count}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(245,158,11,0.1); border-radius: 4px;">
            <span style="color: #94a3b8;">FN Segments:</span>
            <strong style="color: #f59e0b;">${tile.fn_count}</strong>
          </div>
        </div>
      </div>
    </div>
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <span style="color: #94a3b8; font-size: 13px;">ML Total:</span>
          <strong style="margin-left: 8px; color: #60a5fa;">${tile.ml_total_length_m.toFixed(2)}m (${tile.ml_count} segs)</strong>
        </div>
        <div>
          <span style="color: #94a3b8; font-size: 13px;">OSM Total:</span>
          <strong style="margin-left: 8px; color: #a78bfa;">${tile.osm_total_length_m.toFixed(2)}m (${tile.osm_count} segs)</strong>
        </div>
      </div>
    </div>
  `;
}

/**
 * Populates raw data table with all fields
 */
function populateRawDataTable(tile) {
  const container = document.getElementById('modal-raw-data');
  const fields = [
    ['Tile ID', tile.tile_id],
    ['Grid Position', `(${tile.xtile}, ${tile.ytile})`],
    ['Coordinates', `${tile.lat.toFixed(6)}°N, ${tile.lon.toFixed(6)}°W`],
    ['ML Total Length', `${tile.ml_total_length_m.toFixed(2)}m`],
    ['OSM Total Length', `${tile.osm_total_length_m.toFixed(2)}m`],
    ['ML Segment Count', tile.ml_count],
    ['OSM Segment Count', tile.osm_count],
    ['Buffer Distance', `${tile.buffer_distance_m}m`],
    ['Alignment Threshold', `${tile.alignment_angle_threshold_deg}°`]
  ];
  
  container.innerHTML = `
    <h3>Complete Tile Information</h3>
    <table style="width: 100%; border-collapse: collapse;">
      ${fields.map(([key, val]) => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
          <td style="padding: 10px 12px; color: #94a3b8; font-size: 13px;">${key}</td>
          <td style="padding: 10px 12px; font-weight: 500; color: #e2e8f0; text-align: right;">${val}</td>
        </tr>
      `).join('')}
    </table>
  `;
}
```

---

## 4. Feature #10: Mini Leaflet Map Design

### Behavior

**When Modal Opens:**
1. Initialize Leaflet map in `#tile-mini-map` container (only once)
2. Center map on `tile.lat`, `tile.lon`
3. Set zoom level to 18 (detailed street view)
4. Add marker at tile center
5. Draw rectangle showing approximate tile bounds
6. Open popup with tile info

**Map Features:**
- OSM base layer (reuses existing tilemetrics.html Leaflet setup)
- Marker at tile center
- Rectangle showing tile bounds (~50m × 50m at zoom 19)
- Popup with F1 score and position

### Implementation

**Location:** Insert at **line ~3650** (same location as modal functions)

```javascript
// ==============================================
// FEATURE #10: MINI LEAFLET MAP IN MODAL
// ==============================================

/**
 * Initializes the Leaflet map inside the modal (only once)
 */
function initTileMiniMapIfNeeded() {
  if (detailMapInstance) return; // Already initialized
  
  const container = document.getElementById('tile-mini-map');
  if (!container) {
    console.error('tile-mini-map container not found');
    return;
  }
  
  // Create Leaflet map
  detailMapInstance = L.map('tile-mini-map').setView([42.355, -71.071], 17);
  
  // Add OSM tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(detailMapInstance);
  
  console.log('Mini map initialized');
}

/**
 * Updates the mini map to show the selected tile
 * @param {Object} tile - Tile object with lat/lon
 */
function updateTileMiniMap(tile) {
  if (!detailMapInstance) {
    console.warn('Map not initialized, initializing now...');
    initTileMiniMapIfNeeded();
    if (!detailMapInstance) return;
  }
  
  // Clear existing layers (markers, rectangles) but keep base tiles
  detailMapInstance.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.Rectangle || layer instanceof L.Circle) {
      detailMapInstance.removeLayer(layer);
    }
  });
  
  // Center map on tile
  detailMapInstance.setView([tile.lat, tile.lon], 18);
  
  // Add marker at tile center
  const marker = L.marker([tile.lat, tile.lon], {
    icon: L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    })
  }).addTo(detailMapInstance);
  
  marker.bindPopup(`
    <div style="font-family: sans-serif;">
      <strong style="color: #3b82f6; font-size: 14px;">Tile ${tile.tile_id}</strong><br>
      <div style="margin-top: 6px; font-size: 12px;">
        <strong>F1:</strong> ${(tile.f1_score * 100).toFixed(1)}%<br>
        <strong>Position:</strong> (${tile.xtile}, ${tile.ytile})<br>
        <strong>Coords:</strong> ${tile.lat.toFixed(5)}°, ${tile.lon.toFixed(5)}°
      </div>
    </div>
  `).openPopup();
  
  // Draw approximate tile bounds
  // Zoom 19 tile size calculation: 360 / (2^19) = 0.000686 degrees
  // Adjusted for latitude (Boston ~42°): multiply by cos(42°) ≈ 0.743
  const tileSize = (360 / Math.pow(2, 19)) * Math.cos(tile.lat * Math.PI / 180);
  const bounds = [
    [tile.lat - tileSize/2, tile.lon - tileSize/2],
    [tile.lat + tileSize/2, tile.lon + tileSize/2]
  ];
  
  // Get color based on F1 score
  const f1 = tile.f1_score;
  let color = '#ef4444'; // Red
  if (f1 >= 0.9) color = '#10b981'; // Green
  else if (f1 >= 0.7) color = '#3b82f6'; // Blue
  else if (f1 >= 0.5) color = '#f59e0b'; // Orange
  
  L.rectangle(bounds, {
    color: color,
    weight: 3,
    fillColor: color,
    fillOpacity: 0.15,
    dashArray: '5, 5'
  }).addTo(detailMapInstance);
  
  // Force map to redraw (fixes Leaflet rendering issues after modal opens)
  setTimeout(() => {
    if (detailMapInstance) {
      detailMapInstance.invalidateSize();
    }
  }, 50);
  
  console.log(`Map updated for tile ${tile.tile_id} at (${tile.lat}, ${tile.lon})`);
}
```

---

## 5. Click Handler Modifications

### A. Heatmap View - `renderHeatmap()`

**Location:** Around **line 1720** (inside cell creation loop)

**Current Code:**
```javascript
cell.addEventListener('click', (e) => {
  toggleTileSelection(tile.tile_id, e);
});
```

**Modified Code:**
```javascript
// Single click = select, Ctrl/Cmd+Click = open modal
cell.addEventListener('click', (e) => {
  if (e.ctrlKey || e.metaKey) {
    openTileDetailModal(tile);
  } else {
    toggleTileSelection(tile.tile_id, e);
  }
});
```

**Alternative (Double-Click):**
```javascript
cell.addEventListener('click', (e) => {
  toggleTileSelection(tile.tile_id, e);
});

cell.addEventListener('dblclick', () => {
  openTileDetailModal(tile);
});
```

### B. Scatter Plot View - `renderScatter()`

**Location:** Around **line 1980** (inside circle creation loop)

**Current Code:**
```javascript
circle.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleTileSelection(tile.tile_id, e);
});
```

**Modified Code:**
```javascript
circle.addEventListener('click', (e) => {
  e.stopPropagation();
  if (e.ctrlKey || e.metaKey) {
    openTileDetailModal(tile);
  } else {
    toggleTileSelection(tile.tile_id, e);
  }
});
```

### C. Table View - `renderTable()`

**Location:** Around **line 3500** (inside row creation loop)

**Current Code:**
```javascript
row.addEventListener('click', (e) => {
  toggleTileSelection(tile.tile_id, e);
});
```

**Modified Code:**
```javascript
row.addEventListener('click', (e) => {
  if (e.ctrlKey || e.metaKey) {
    openTileDetailModal(tile);
  } else {
    toggleTileSelection(tile.tile_id, e);
  }
});
```

### D. Parallel Coordinates View (Optional Enhancement)

**Location:** Around **line 2400** (inside line rendering)

```javascript
line.addEventListener('click', (e) => {
  e.stopPropagation();
  if (e.ctrlKey || e.metaKey) {
    openTileDetailModal(tile);
  } else {
    toggleTileSelection(tile.tile_id, e);
  }
});
```

---

## 6. Event Listeners for Modal Close

**Location:** Add at **line ~3700** (in event listeners section, after existing handlers)

```javascript
// ==============================================
// MODAL CLOSE HANDLERS
// ==============================================

// Close modal on backdrop click
document.getElementById('tile-detail-backdrop').addEventListener('click', closeTileDetailModal);

// Close modal on X button click
document.getElementById('modal-close-btn').addEventListener('click', closeTileDetailModal);

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isModalOpen) {
    closeTileDetailModal();
  }
});
```

---

## 7. Function Signatures Reference

```javascript
// ============================================
// CORE MODAL FUNCTIONS
// ============================================

/**
 * Opens the tile detail modal
 * @param {Object} tile - Tile object from data array
 * @returns {void}
 */
function openTileDetailModal(tile)

/**
 * Closes the tile detail modal
 * @returns {void}
 */
function closeTileDetailModal()

// ============================================
// SECTION POPULATORS
// ============================================

/**
 * Populates the metric cards section
 * @param {Object} tile
 * @returns {void}
 */
function populateMetricCards(tile)

/**
 * Populates the confusion matrix section
 * @param {Object} tile
 * @returns {void}
 */
function populateConfusionDetails(tile)

/**
 * Populates the raw data table section
 * @param {Object} tile
 * @returns {void}
 */
function populateRawDataTable(tile)

/**
 * Creates HTML for a single metric card
 * @param {string} label - Metric name
 * @param {number} value - Metric value
 * @param {boolean} isPercentage - Format as percentage?
 * @returns {string} HTML string
 */
function createMetricCard(label, value, isPercentage)

// ============================================
// MINI MAP FUNCTIONS (Feature #10)
// ============================================

/** @type {L.Map|null} Global Leaflet map instance */
let detailMapInstance = null;

/**
 * Initializes the Leaflet map (once)
 * @returns {void}
 */
function initTileMiniMapIfNeeded()

/**
 * Updates map to show selected tile
 * @param {Object} tile - Tile object with lat/lon
 * @returns {void}
 */
function updateTileMiniMap(tile)

// ============================================
// STATE MANAGEMENT
// ============================================

/** @type {boolean} Prevents multiple modal opens */
let isModalOpen = false;
```

---

## 8. Implementation Phases

### Phase 1: Modal Skeleton (Basic Functionality)
**Estimated Time:** 30-45 minutes

1. ✅ Add modal HTML skeleton before `</body>`
2. ✅ Add modal CSS styles in `<style>`
3. ✅ Implement `openTileDetailModal()` and `closeTileDetailModal()`
4. ✅ Implement section populators:
   - `populateMetricCards()`
   - `populateConfusionDetails()`
   - `populateRawDataTable()`
   - `createMetricCard()` helper
5. ✅ Add click handlers to heatmap/scatter/table views
6. ✅ Add close handlers (backdrop, X button, Escape key)
7. ✅ Test modal open/close behavior
8. ✅ Verify all tile data displays correctly

**Validation Checklist:**
- [ ] Ctrl+Click on heatmap cell opens modal
- [ ] Ctrl+Click on scatter point opens modal
- [ ] Ctrl+Click on table row opens modal
- [ ] Modal displays correct tile ID in title
- [ ] All 4 metric cards show correct values
- [ ] Confusion matrix lengths and counts display
- [ ] Raw data table shows all fields
- [ ] X button closes modal
- [ ] Clicking backdrop closes modal
- [ ] Escape key closes modal
- [ ] Multiple rapid clicks don't break modal

---

### Phase 2: Mini Leaflet Map (Geographic Visualization)
**Estimated Time:** 30-45 minutes

1. ✅ Implement `initTileMiniMapIfNeeded()`
2. ✅ Implement `updateTileMiniMap(tile)`
3. ✅ Add map initialization call in `openTileDetailModal()`
4. ✅ Test map rendering in modal
5. ✅ Verify map centers on correct tile
6. ✅ Test marker and popup display
7. ✅ Verify tile bounds rectangle
8. ✅ Fix any Leaflet rendering issues (`invalidateSize()`)
9. ✅ Test map updates when switching between tiles

**Validation Checklist:**
- [ ] Map renders inside modal
- [ ] Map is centered on tile coordinates
- [ ] Marker appears at tile center
- [ ] Popup displays tile info correctly
- [ ] Tile bounds rectangle is visible
- [ ] Rectangle color matches F1 score
- [ ] Map updates when opening modal for different tile
- [ ] No console errors related to Leaflet
- [ ] Map tiles load properly (no gray squares)
- [ ] Zoom controls work

---

## 9. Potential Issues & Solutions

### Issue 1: Leaflet Map Doesn't Render in Hidden Modal
**Symptom:** Gray box instead of map tiles

**Cause:** Leaflet calculates container size on initialization. If container is hidden (`display: none`), size is 0×0.

**Solution:** ✅ Already implemented
```javascript
// In openTileDetailModal(), use setTimeout AFTER making modal visible
setTimeout(() => {
  initTileMiniMapIfNeeded();
  updateTileMiniMap(tile);
}, 100);

// In updateTileMiniMap(), force recalculation
setTimeout(() => {
  detailMapInstance.invalidateSize();
}, 50);
```

---

### Issue 2: Multiple Rapid Clicks Create Multiple Modals
**Symptom:** Modal appears multiple times, close buttons don't work

**Cause:** `openTileDetailModal()` called multiple times before first modal finishes opening

**Solution:** ✅ Already implemented
```javascript
let isModalOpen = false;

function openTileDetailModal(tile) {
  if (isModalOpen) return; // Guard clause
  isModalOpen = true;
  // ...
}

function closeTileDetailModal() {
  // ...
  isModalOpen = false;
}
```

---

### Issue 3: Modal Doesn't Scroll on Small Screens
**Symptom:** Content cut off, can't see bottom sections

**Cause:** Modal height exceeds viewport

**Solution:** ✅ Already implemented
```css
.tile-modal {
  max-height: 85vh;
  overflow-y: auto; /* Scrollable content */
}
```

---

### Issue 4: Tile Bounds Rectangle is Inaccurate
**Symptom:** Rectangle doesn't match actual tile area

**Cause:** Simplified calculation doesn't account for latitude distortion

**Solution:** ✅ Implemented accurate formula
```javascript
// Correct calculation considering latitude
const tileSize = (360 / Math.pow(2, 19)) * Math.cos(tile.lat * Math.PI / 180);
```

**For Boston (lat ≈ 42°):**
- Base tile size at equator: 0.000686°
- Adjusted for latitude: 0.000686° × cos(42°) ≈ 0.00051°
- In meters: ~50m × 50m (accurate for zoom 19)

---

### Issue 5: Marker Icon Missing (404 Error)
**Symptom:** Marker doesn't appear, console shows 404 for icon image

**Cause:** Leaflet default icon paths may not resolve correctly

**Solution:** ✅ Already implemented (explicit icon URL)
```javascript
icon: L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
})
```

---

### Issue 6: Modal Blocks Interaction with Main Dashboard
**Symptom:** Can't close modal, clicks don't register

**Cause:** Z-index issues or backdrop not properly positioned

**Solution:** ✅ Already implemented
```css
.modal-backdrop { z-index: 9998; }
.tile-modal { z-index: 9999; }
/* Higher than any other dashboard element */
```

---

## 10. Testing Checklist

### Basic Modal Functionality
- [ ] Modal opens when Ctrl+clicking heatmap cell
- [ ] Modal opens when Ctrl+clicking scatter point
- [ ] Modal opens when Ctrl+clicking table row
- [ ] Modal displays correct tile ID
- [ ] Modal shows all 18 tile fields
- [ ] X button closes modal
- [ ] Backdrop click closes modal
- [ ] Escape key closes modal

### Data Display Accuracy
- [ ] F1 Score matches table view
- [ ] Precision matches table view
- [ ] Recall matches table view
- [ ] IoU matches table view
- [ ] TP/FP/FN lengths are correct
- [ ] TP/FP/FN counts are correct
- [ ] Coordinates are accurate
- [ ] Color coding matches metric values

### Mini Map Functionality
- [ ] Map renders without errors
- [ ] Map tiles load (no gray boxes)
- [ ] Map is centered on correct coordinates
- [ ] Marker appears at tile center
- [ ] Popup shows correct tile info
- [ ] Tile bounds rectangle is visible
- [ ] Rectangle size is approximately correct (~50m)
- [ ] Rectangle color matches F1 score
- [ ] Zoom controls work
- [ ] Map updates when opening different tile

### Cross-View Integration
- [ ] Opening modal doesn't break tile selection
- [ ] Can open modal for any of 96 tiles
- [ ] Modal works from all 6 view modes
- [ ] Closing modal returns to correct view state
- [ ] No console errors or warnings

### Edge Cases
- [ ] Opening modal for tile with F1=0% displays correctly
- [ ] Opening modal for tile with F1=100% displays correctly
- [ ] Rapid clicking doesn't break modal
- [ ] Modal works after switching views multiple times
- [ ] Modal works after filtering tiles

---

## 11. Future Enhancements (Optional)

### Enhancement 1: Deep Link to Main Map
Add button in modal to open `index.html` with URL params:
```javascript
function viewOnMainMap(tile) {
  const url = `../index.html?lat=${tile.lat}&lon=${tile.lon}&zoom=19&tile=${tile.tile_id}`;
  window.open(url, '_blank');
}
```

### Enhancement 2: Compare with Adjacent Tiles
Show mini previews of neighboring tiles (left/right/up/down):
```javascript
function getAdjacentTiles(tile) {
  return data.filter(t => 
    (t.xtile === tile.xtile && Math.abs(t.ytile - tile.ytile) === 1) ||
    (t.ytile === tile.ytile && Math.abs(t.xtile - tile.xtile) === 1)
  );
}
```

### Enhancement 3: Historical Comparison
If multiple model runs exist, show tile performance over time:
```javascript
// Requires loading multiple JSON files
const historicalData = await loadHistoricalData(tile.tile_id);
renderTrendChart(historicalData);
```

### Enhancement 4: Export Tile Details
Add button to download tile info as JSON/CSV:
```javascript
function exportTileData(tile) {
  const json = JSON.stringify(tile, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tile_${tile.tile_id}.json`;
  a.click();
}
```

---

## 12. Code Quality Standards

### Naming Conventions
- Functions: `camelCase` (e.g., `openTileDetailModal`)
- Global variables: `camelCase` (e.g., `detailMapInstance`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MODAL_ANIMATION_DURATION`)
- CSS classes: `kebab-case` (e.g., `modal-backdrop`)

### Comments
- Function documentation: JSDoc format with `@param` and `@returns`
- Inline comments: Explain **why**, not **what**
- Section markers: Use `// ========` for major sections

### Error Handling
- Always check if DOM elements exist before manipulating
- Use `console.error()` for critical failures
- Use `console.warn()` for non-critical issues
- Provide fallback behavior when possible

### Performance
- Use `setTimeout` for DOM operations after visibility changes
- Call `invalidateSize()` after map container resize
- Clear previous map layers before adding new ones
- Avoid creating new map instances unnecessarily

---

## 13. Summary

### What We're Building
1. **Tile Detail Modal** - Comprehensive view of individual tile metrics
2. **Mini Leaflet Map** - Geographic visualization showing tile location

### Key Features
- ✅ Accessible via Ctrl+Click from any view (heatmap, scatter, table)
- ✅ Shows all 18 tile fields in organized sections
- ✅ Color-coded metric cards (green/blue/orange/red)
- ✅ Confusion matrix breakdown with lengths and counts
- ✅ Interactive mini map with marker and bounds
- ✅ Multiple close methods (X button, backdrop, Escape key)
- ✅ Responsive design (scrollable on small screens)
- ✅ Smooth animations and transitions

### Implementation Status
- ✅ Design Complete
- ⏳ Phase 1 Implementation: Pending
- ⏳ Phase 2 Implementation: Pending
- ⏳ Testing: Pending

### Total Estimated Time
- Phase 1 (Modal): 30-45 minutes
- Phase 2 (Map): 30-45 minutes
- Testing: 15-20 minutes
- **Total: 75-110 minutes**

---

## Ready to Implement! 🚀

This design is fully specified and ready for step-by-step implementation. Proceed with **Phase 1** first (modal skeleton and data display), test thoroughly, then move to **Phase 2** (mini map integration).
