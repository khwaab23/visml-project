# visML - Pedestrian Path Detection Visualization & Analytics

A comprehensive visualization and analytics system for evaluating ML-detected pedestrian paths against OpenStreetMap ground truth data.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎯 Overview

**visML** provides two integrated interfaces for analyzing pedestrian path detection quality:

1. **Interactive Map Visualization** - Compare ML predictions with OSM ground truth on satellite imagery
2. **Analytics Dashboard** - Explore per-tile metrics through multiple visualization views

The system supports multiple datasets and provides detailed confusion matrix analysis using polygon-based geometric comparison.

## 📊 Features

### Map Visualization (`visualization/`)
- **Side-by-side comparison** of ML predictions vs OSM ground truth
- **Satellite imagery overlay** with detected path networks
- **Interactive confusion matrix layers** (True Positives, False Positives, False Negatives)
- **Tile-level heatmaps** for F1, Precision, Recall, IoU metrics
- **Multi-dataset support** with dropdown selector

### Analytics Dashboard (`example/tilemetrics.html`)
- **Overview Grid** - Spatial visualization of all tiles with F1 score coloring
- **Scatter Plot** - Explore relationships between any two metrics
- **Parallel Coordinates** - Compare F1, Precision, Recall, IoU across tiles
- **Statistics View** - Box plots showing metric distributions
- **Error Buckets** - Tiles grouped by performance ranges
- **Tile Table** - Sortable table with all metrics and filtering
- **Interactive Selection** - Click tiles to highlight across all views
- **Keyboard Navigation** - Arrow keys to navigate between adjacent tiles

## 🗂️ Project Structure

```
visml-project/
├── visualization/              # Map-based visualization interface
│   ├── index.html             # Main map page
│   └── app.js                 # Map logic and data loading
├── example/                   # Dashboard interface
│   └── tilemetrics.html       # Analytics dashboard
├── polygon_based_analysis.ipynb  # Jupyter notebook for analysis
├── example/                   # Example dataset (Boston Common area, 96 tiles)
│   ├── tiles/                 # Satellite imagery tiles
│   ├── network/               # ML-detected path shapefiles
│   └── polygons/              # ML-detected area shapefiles
├── polygon_analysis_output/   # Analysis results for example dataset
├── boston_common/             # Full Boston Common dataset (144 tiles)
├── boston_common_output/      # Results for Boston Common
├── times_square/              # Times Square NYC dataset (64 tiles)
└── times_square_output/       # Results for Times Square
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Modern web browser (Chrome, Firefox, Edge)
- Required Python packages: `geopandas`, `shapely`, `rtree`, `requests`, `fiona`, `pyproj`

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/austinhuang0131/visml-project.git
cd visml-project
```

2. **Install Python dependencies**
```bash
pip install geopandas shapely rtree requests fiona pyproj
```

3. **Start local web server**
```bash
python -m http.server 8000
```

4. **Open in browser**
```
http://localhost:8000/visualization/
```

## 📖 Usage

### Running the Map Visualization

1. Navigate to `http://localhost:8000/visualization/`
2. Select dataset from dropdown (Example, Boston Common, or Times Square)
3. Toggle between base maps (Satellite or OpenStreetMap)
4. Switch views:
   - **Confusion Matrix View**: Shows TP/FP/FN layers
   - **Tile Heatmap View**: Color-coded tiles by selected metric
5. Click "Open Dashboard" to explore detailed analytics

### Running the Analytics Dashboard

1. From map view, click "Open Dashboard" (preserves dataset selection)
2. Or navigate directly: `http://localhost:8000/example/tilemetrics.html?sample=boston_common`
3. Use sidebar to switch between views
4. Filter tiles by F1 score threshold using slider
5. Click tiles to select/deselect for detailed inspection
6. Press Enter on selected tile to open detail modal
7. Use arrow keys to navigate between adjacent tiles

### Running the Analysis Notebook

1. Open `polygon_based_analysis.ipynb` in Jupyter or VS Code
2. Update `location_name` variable (e.g., `'example'`, `'boston_common'`, `'times_square'`)
3. Run all cells to:
   - Load ML predictions and OSM ground truth
   - Calculate confusion matrix using 5m buffer tolerance
   - Generate per-tile and global metrics
   - Export results to `{location_name}_output/` folder

## 📏 Methodology

### Confusion Matrix Calculation

The system uses **polygon-based geometric comparison** with a **5-meter buffer tolerance**:

1. **Buffer ML predictions and OSM ground truth** by 5m to account for GPS/annotation error
2. **Calculate intersections** to identify True Positives (areas where both agree)
3. **Extract False Positives** (ML detected but not in OSM)
4. **Extract False Negatives** (OSM paths missed by ML)
5. **Compute metrics**:
   - Precision = TP / (TP + FP)
   - Recall = TP / (TP + FN)
   - F1 Score = 2 × (Precision × Recall) / (Precision + Recall)
   - IoU = TP / (TP + FP + FN)

### Data Sources

- **ML Predictions**: Shapefiles in `network/` and `polygons/` folders
- **Ground Truth**: OpenStreetMap data queried via Overpass API
  - Highway types: `footway`, `pedestrian`, `path`, `steps`, `sidewalk`, `cycleway`
- **Tile Imagery**: Aerial imagery at zoom level 19 (256×256 pixels)

## 🎨 Datasets

### Example (Boston Common Area)
- **Location**: Boston Common, MA
- **Tiles**: 96
- **Image Format**: JPG
- **Coverage**: Partial Boston Common area

### Boston Common
- **Location**: Boston Common, MA
- **Tiles**: 144
- **Image Format**: JPG
- **Coverage**: Full Boston Common park

### Times Square
- **Location**: Times Square, NYC
- **Tiles**: 64
- **Image Format**: PNG
- **Coverage**: Times Square pedestrian plazas

## 🔧 Configuration

### Adding New Datasets

1. **Prepare data structure**:
```
your_dataset/
├── tiles/
│   └── static/
│       └── {region}/
│           └── 256_19/
│               ├── {x}_{y}.jpg
│               └── ...
├── network/
│   └── {dataset}-Network-{timestamp}/
│       ├── *.shp
│       ├── *.dbf
│       ├── *.prj
│       └── *.shx
└── polygons/
    └── {dataset}-Polygons-{timestamp}/
        └── (same as network)
```

2. **Run analysis notebook** with `location_name = 'your_dataset'`

3. **Add configuration** to `visualization/app.js`:
```javascript
'your_dataset': {
    tilePath: '../your_dataset/tiles/static/{region}/256_19',
    imageExtension: 'jpg',
    outputPath: '../your_dataset_output',
    center: [latitude, longitude],
    name: 'Your Dataset Name'
}
```

4. **Add option** to dropdown in `visualization/index.html`

## 📊 Output Files

Analysis results are saved in `{dataset}_output/`:

- `confusion_matrix_global_polygon_based.json` - Overall metrics
- `confusion_matrix_per_tile_polygon_based.json` - Per-tile metrics
- `true_positives_polygon_based.geojson` - TP geometries
- `false_positives_polygon_based.geojson` - FP geometries
- `false_negatives_polygon_based.geojson` - FN geometries
- `ml_polygons.geojson` - ML predictions
- `osm_ground_truth.geojson` - OSM ground truth
- `true_positives_osm_polygon_based.geojson` - OSM portions that matched

## 🎮 Keyboard Shortcuts (Dashboard)

| Key | Action |
|-----|--------|
| Arrow Keys | Navigate between adjacent tiles (when one tile selected) |
| Enter | Open detail modal for selected tile |
| Escape | Close modal |
| Ctrl+Click (Parallel Coords) | Open tile detail modal |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- Austin Huang ([@austinhuang0131](https://github.com/austinhuang0131))
- Khwaab Thareja (https://github.com/khwaab23)

## 🙏 Acknowledgments

- OpenStreetMap contributors for ground truth data
- Overpass API for OSM data access
- Leaflet.js for map visualization
- Plotly.js for interactive charts

## 📧 Contact

For questions or issues, please open an issue on GitHub.

---

**Note**: This project uses a 5-meter buffer tolerance for geometric comparison, which is intentional to account for GPS positioning error and annotation variability. Results marked as "approximate" in the browser-based analysis indicate that the comparison was capped at 1,000 feature pairs for performance reasons.
