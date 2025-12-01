# Tile2Net Visualization - Main Map View

This is the main visualization interface for exploring the Tile2Net evaluation results. It provides an interactive map-based interface with confusion matrix layers and tile-level heatmaps.

## Features

- **Interactive Map View**
  - Confusion Matrix Mode: View True Positives (green), False Positives (orange), False Negatives (red), ML Polygons (blue), and OSM Ground Truth (gray)
  - Tile Heatmap Mode: Visualize tiles colored by various metrics (F1 Score, Precision, Recall, IoU, TP/FP/FN lengths)
  
- **Scatter Plot Analysis**
  - Compare different metrics across tiles
  - Click on points to see detailed tile information
  
- **Global Statistics Dashboard**
  - Overall performance metrics
  - Aggregated confusion matrix results
  
- **Base Map Options**
  - Satellite imagery (from tiles)
  - OpenStreetMap

## Setup

### 1. File Structure
The visualization expects the following structure:
```
visml-project/
├── visualization/
│   ├── index.html
│   └── app.js
├── polygon_analysis_output/
│   ├── confusion_matrix_global_polygon_based.json
│   ├── confusion_matrix_per_tile_polygon_based.json
│   ├── true_positives_polygon_based.geojson
│   ├── false_positives_polygon_based.geojson
│   ├── false_negatives_polygon_based.geojson
│   ├── ml_polygons.geojson
│   └── osm_ground_truth.geojson
└── example/
    ├── tilemetrics.html (dashboard)
    └── tiles/
        └── static/
            └── ma/
                └── 256_19/
                    └── {xtile}_{ytile}.jpg
```

### 2. Running the Visualization

Start a local web server from the project root:

```bash
# Using Python 3
python -m http.server 8000

# Or using Python 2
python -m SimpleHTTPServer 8000

# Or using Node.js
npx http-server -p 8000
```

Then navigate to: `http://localhost:8000/visualization/`

### 3. Data Requirements

The visualization requires:
- **Per-tile metrics JSON** with tile coordinates, performance metrics, and detection counts
- **Global metrics JSON** with aggregated confusion matrix results
- **GeoJSON files** for true positives, false positives, false negatives, ML polygons, and OSM ground truth
- **Tile imagery** in the expected directory structure

## Navigation

- **"Open Dashboard" button**: Links to the detailed tile metrics dashboard (`example/tilemetrics.html`)
- **Dashboard → "Back to Map" link**: Returns to this visualization page

## Configuration

To adapt the visualization for a different dataset, modify the `config` object in `app.js`:

```javascript
const config = {
    tilePath: '../example/tiles/static/ma/256_19',  // Path to tile imagery
    imageExtension: 'jpg',                          // Image file extension
    outputPath: '../polygon_analysis_output'        // Path to analysis output
};
```

## Browser Compatibility

- Modern browsers with ES6 support
- Tested on Chrome, Firefox, Edge, Safari

## Dependencies

All dependencies are loaded via CDN:
- Leaflet 1.9.4 (map rendering)
- Plotly.js 2.27.0 (scatter plots)

## Notes

- The visualization automatically loads data on page load
- Tiles without any detections are filtered out from the heatmap and scatter plot views
- Click on tiles in heatmap mode or points in scatter plot to see detailed information
- Layer control in confusion matrix mode allows toggling individual layers
