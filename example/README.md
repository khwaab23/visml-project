# Pedestrian Path Detection Visualization

## Project Overview

This project visualizes the output of a Machine Learning algorithm that detects pedestrian paths from aerial imagery. The visualization is built using **Leaflet.js** and displays three main components:

1. **Aerial Imagery Tiles** - The source satellite/aerial images used for detection
2. **Network (Paths)** - Detected pedestrian paths rendered as blue lines
3. **Polygons (Areas)** - Detected pedestrian areas rendered as red shaded regions
4. **OSM Ground Truth** - OpenStreetMap pedestrian paths from Overpass API (green lines)
5. **Confusion Matrix Analysis** - Compare ML predictions with ground truth

## What I Did

### 1. Created an Interactive Web Map (`index.html`)
- Built a full-screen Leaflet map interface
- Added an information panel showing project metadata
- Created a legend to explain the different layers
- Included layer controls for toggling visibility
- Added status indicators for data loading

### 2. Developed the Application Logic (`app.js`)
- **Tile Loading**: Reads the CSV file (`example_256_info.csv`) containing tile metadata and positions each aerial image as an overlay at its correct geographic location
- **Shapefile Loading**: Uses the `shpjs` library to load shapefiles directly in the browser without Python
  - Loads the network shapefile (detected paths) with blue styling
  - Loads the polygon shapefile (detected areas) with red/pink styling
- **Overpass API Integration**: Fetches OpenStreetMap ground truth data
  - Queries for: footways, pedestrian highways, paths, steps, and sidewalks
  - Distinguishes different types with color coding (solid green for pedestrian ways, dashed for sidewalks)
  - Displays OSM metadata in popups (name, surface, width, etc.)
- **Interactive Features**: 
  - Click on paths or polygons to see their attributes in popups
  - Toggle layers on/off using the layer control
  - Zoom and pan to explore the data
- **Auto-fitting**: Automatically zooms to show all detected features

### 3. Created Analysis Module (`analysis.js`)
- **Confusion Matrix Computation**: Compares ML-detected paths with OSM ground truth
  - Uses buffer-based matching (5m tolerance by default)
  - Calculates True Positives (TP), False Positives (FP), False Negatives (FN)
  - Computes precision, recall, F1 score, and IoU metrics
- **Geospatial Analysis**: Leverages Turf.js for geometric operations
  - Buffer creation around line geometries
  - Intersection calculations
  - Area and length measurements
- **Visual Comparison Overlay**: Optionally renders TP/FP/FN as colored overlays
  - Green: True Positives (correctly detected paths)
  - Orange: False Positives (ML detected but not in OSM)
  - Red: False Negatives (in OSM but not detected by ML)
- **Results Display**: Shows detailed metrics in a dedicated panel
### 4. Configuration
- Extracted coordinates and metadata from `example_256_info.json`
- Center point: [42.3539772, -71.0678100] (Boston, MA area)
- Zoom level: 19 (very detailed view)
- Tile system uses standard Web Mercator projection
- Overpass API queries within the exact bounding box of the study area

## File Structure

```
example/
├── index.html              # Main HTML page with map container
├── app.js                  # Application logic and data loading
├── analysis.js             # Confusion matrix and overlap analysis
├── README.md              # This documentation
├── structure.json         # Project metadata
├── network/               # Detected paths (shapefiles)
│   └── example-Network-24-10-2025_23_19/
├── polygons/              # Detected areas (shapefiles)
│   └── example-Polygons-24-10-2025_23_18/
└── tiles/                 # Aerial imagery
    ├── example_256_info.csv    # Tile positioning data
    ├── example_256_info.json   # Project configuration
    └── static/ma/256_19/       # Actual image tiles (96 tiles)
```

## How to Run

### Option 1: Simple Local Server
Since the project loads local files, you need to run a local web server:

```bash
# Navigate to the example directory
cd /Users/austinhuang/Downloads/visml/example

# Python 3
python3 -m http.server 8000

# OR Python 2
python -m SimpleHTTPServer 8000

# OR Node.js (if you have npx)
npx http-server -p 8000

# OR PHP
php -S localhost:8000
```

Then open your browser to: `http://localhost:8000`

### Option 2: VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Technologies Used

- **Leaflet.js 1.9.4** - Core mapping library
- **shpjs** - Shapefile parser that works in the browser
- **Turf.js 6.5.0** - Geospatial analysis and geometric operations
- **Overpass API** - Query OpenStreetMap ground truth data
- **Vanilla JavaScript** - No frameworks, pure ES6+ JavaScript
- **HTML5/CSS3** - Modern web standards

## Features

### Visual Elements
- **Blue lines** (weight: 4px): Detected pedestrian path networks
- **Red/pink polygons** (30% opacity): Detected pedestrian areas
- **Green lines** (various styles): OSM ground truth pedestrian infrastructure
  - Solid green: Pedestrian ways and footpaths
  - Dashed light green: Sidewalks
  - Different styles for steps and other path types
- **Aerial imagery tiles**: Original satellite imagery at 80% opacity

### Interactive Controls
- **Analysis Button** (top left): Click to compute confusion matrix once data loads
- **Layer Control** (top right): Toggle layers on/off
- **Scale Bar** (bottom left): Shows map scale in meters/feet
- **Zoom Controls** (top left): Zoom in/out buttons
- **Info Panel** (top right): Project information and loading status
- **Results Panel** (top left): Appears after analysis showing metrics
- **Legend** (bottom right): Explains what each layer represents

### User Interactions
- **Click** on paths or polygons to see attributes
- **Drag** to pan the map
- **Scroll** or use +/- buttons to zoom
- **Toggle layers** using the layer control
- **Run analysis** to compute overlap and confusion matrix

## Data Details

- **Total Tiles**: 96 aerial imagery tiles (12x8 grid)
- **Tile Size**: 256x256 pixels per tile
- **Coverage Area**: ~0.8km × 0.5km in Boston, MA
- **Coordinate System**: WGS84 (EPSG:4326)
- **Detection Date**: October 24, 2025
- **Image Source**: Massachusetts 2021 Orthoimagery
- **Ground Truth**: OpenStreetMap data via Overpass API
  - Includes: highway=footway, pedestrian, path, steps
  - Includes: footway=sidewalk
  - Includes: sidewalk tags (both, left, right, yes)

## Confusion Matrix Metrics

The analysis compares ML-detected paths with OSM ground truth using a buffer-based approach:

### Method
1. **Buffer Creation**: Both ML and OSM line geometries are buffered by 5 meters (configurable)
2. **Intersection**: Calculate overlapping areas between buffered geometries
3. **Classification**:
   - **True Positives (TP)**: ML detected paths that overlap with OSM paths
   - **False Positives (FP)**: ML detected paths with no OSM equivalent
   - **False Negatives (FN)**: OSM paths that ML failed to detect

### Metrics
- **Precision**: TP / (TP + FP) - What percentage of ML detections are correct?
- **Recall**: TP / (TP + FN) - What percentage of real paths were detected?
- **F1 Score**: Harmonic mean of precision and recall
- **IoU**: Intersection over Union - Overall overlap measure

### Interpretation
- High **Precision** (>80%): ML model doesn't hallucinate many false paths
- High **Recall** (>80%): ML model finds most of the actual paths
- High **F1/IoU** (>70%): Good overall performance

### Considerations
- OSM may be incomplete (not all paths mapped)
- ML may detect informal/desire paths not in OSM
- Buffer distance affects sensitivity (5m is reasonable for path width)
- Temporal mismatches between imagery date and OSM data

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

**Note**: Requires a web server due to CORS restrictions on local file loading.

## Potential Enhancements

If you want to extend this project:

1. ~~**Add search functionality** to find specific streets~~ ✓ Added OSM data
2. **Export detected paths** to different formats (GeoJSON, KML)
3. ~~**Compare with other datasets** (e.g., OpenStreetMap paths)~~ ✓ Implemented
4. **Add measurement tools** to measure path lengths
5. **Time-series comparison** if you have multiple detection runs
6. **Filter by attributes** if the shapefiles contain classification data
7. **3D visualization** using Leaflet plugins or Mapbox GL
8. **Adjustable buffer distance** for sensitivity analysis
9. **Export confusion matrix results** to CSV/JSON
10. **Batch processing** for multiple study areas
11. **Path width estimation** from polygon data
12. **Network connectivity analysis** (dead ends, islands)
13. **Heatmap visualization** of detection confidence

## Troubleshooting

**If layers don't load:**
- Check browser console for errors (F12)
- Ensure you're running a web server (not opening file:// directly)
- Verify all file paths are correct
- Check that shapefile bundles include .shp, .shx, .dbf, and .prj files

**If tiles appear in wrong location:**
- The tile positioning is based on the CSV file - coordinates are already configured
- Check browser console for 404 errors on missing tiles

**Performance issues:**
- With 96 tiles, the page may take a few seconds to load
- Overpass API queries may take 5-10 seconds depending on area size
- Confusion matrix computation can be slow for large datasets (>100 features)
- Consider reducing tile opacity or hiding them while viewing vectors
- Modern browsers should handle this fine

**Analysis not working:**
- Ensure both ML Network and OSM Ground Truth layers are loaded
- Check that layers contain LineString geometries
- Large datasets (>100 features each) may take longer to process
- Check browser console for Turf.js errors

## Usage Tips

1. **Load the page** - Wait for all 4 layers to load (tiles, network, polygons, OSM)
2. **Explore the data** - Use layer control to toggle visibility, click features for info
3. **Run analysis** - Click "Compute Confusion Matrix" button once both network layers are loaded
4. **Review results** - Check the Results Panel (top left) for detailed metrics
5. **Visual comparison** - The analysis may add a TP/FP/FN overlay layer (if dataset is small enough)
6. **Adjust view** - Turn off tiles to see vector data more clearly
7. **Compare visually** - Toggle between ML and OSM layers to spot differences

## Credits

- ML Algorithm: tile2net (pedestrian path detection)
- Mapping Library: Leaflet.js
- Shapefile Parser: shpjs by Calvin Metcalf
- Aerial Imagery: Massachusetts 2021 Orthoimagery
