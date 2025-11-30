// Configuration from the example_256_info.json
const config = {
    bbox: [42.3519474764, 42.3560069067, -71.0719299316, -71.0636901855],
    center: [42.3539772, -71.0678100],
    zoom: 19,
    tileZoom: 19,
    tilesPath: 'tiles-new/static/ma/256_19/',
    networkPath: 'network-new/example-Network-30-11-2025_04_17/example-Network-30-11-2025_04_17',
    polygonsPath: 'polygons-new/example-Polygons-30-11-2025_04_16/example-Polygons-30-11-2025_04_16',
    tileInfo: 'tiles-new/example_256_info.csv'
};

// Initialize the map
const map = L.map('map', {
    center: config.center,
    zoom: 16,  // Start more zoomed out for better context
    maxZoom: 20,
    minZoom: 14  // Allow zooming out further
});

// Add a simple basemap (OSM) for context - shows surrounding area
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    opacity: 0.5  // Semi-transparent to see both basemap and aerial tiles
}).addTo(map);

// Layer groups for organization
const layers = {
    tiles: L.layerGroup().addTo(map),
    network: L.layerGroup().addTo(map),
    polygons: L.layerGroup().addTo(map),
    overpass: L.layerGroup().addTo(map)
};

// Status tracking
let loadStatus = {
    tiles: false,
    network: false,
    polygons: false,
    overpass: false
};

// Update status display
function updateStatus() {
    const statusEl = document.getElementById('layer-status');
    const total = Object.keys(loadStatus).length;
    const loaded = Object.values(loadStatus).filter(v => v).length;
    
    if (loaded === total) {
        statusEl.innerHTML = '<span style="color: green;">✓ All layers loaded</span>';
    } else {
        statusEl.innerHTML = `Loading: ${loaded}/${total} layers`;
    }
}

// Function to load aerial imagery tiles as image overlays
async function loadTiles() {
    try {
        const response = await fetch(config.tileInfo);
        const text = await response.text();
        const lines = text.split('\n').slice(1); // Skip header
        
        let tileCount = 0;
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            const parts = line.split(',');
            if (parts.length < 9) return;
            
            // CSV columns: , idd, zoom, xtile, ytile, topleft_x, topleft_y, bottomright_x, bottomright_y
            const xtile = parts[3];
            const ytile = parts[4];
            const topLeftLon = parseFloat(parts[5]);
            const topLeftLat = parseFloat(parts[6]);
            const bottomRightLon = parseFloat(parts[7]);
            const bottomRightLat = parseFloat(parts[8]);
            
            // Create bounds for the tile
            const bounds = [
                [bottomRightLat, topLeftLon],
                [topLeftLat, bottomRightLon]
            ];
            
            // Add image overlay
            const imageUrl = `${config.tilesPath}${xtile}_${ytile}.jpg`;
            const imageOverlay = L.imageOverlay(imageUrl, bounds, {
                opacity: 0.8,
                interactive: false
            });
            
            imageOverlay.addTo(layers.tiles);
            tileCount++;
        });
        
        console.log(`Loaded ${tileCount} aerial imagery tiles`);
        loadStatus.tiles = true;
        updateStatus();
    } catch (error) {
        console.error('Error loading tiles:', error);
        loadStatus.tiles = 'error';
        updateStatus();
    }
}

// Function to load shapefile using shpjs
async function loadShapefile(basePath, layerGroup, style, onEachFeature) {
    try {
        // shpjs needs the actual file buffers, not just a path
        // Load all required shapefile components
        const shpResponse = await fetch(basePath + '.shp');
        const dbfResponse = await fetch(basePath + '.dbf');
        const prjResponse = await fetch(basePath + '.prj');
        
        if (!shpResponse.ok || !dbfResponse.ok) {
            throw new Error('Failed to load shapefile components');
        }
        
        const shpBuffer = await shpResponse.arrayBuffer();
        const dbfBuffer = await dbfResponse.arrayBuffer();
        const prjText = await prjResponse.text();
        
        // Parse shapefile using shpjs
        const data = await shp.parseShp(shpBuffer, dbfBuffer);
        
        // Add to map
        const layer = L.geoJSON(data, {
            style: style,
            onEachFeature: onEachFeature
        });
        
        layer.addTo(layerGroup);
        
        return layer;
    } catch (error) {
        console.error(`Error loading shapefile ${basePath}:`, error);
        throw error;
    }
}

// Load network (paths)
async function loadNetwork() {
    try {
        const networkStyle = {
            color: '#0066ff',
            weight: 4,
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'
        };
        
        const onEachFeature = (feature, layer) => {
            if (feature.properties) {
                let popupContent = '<strong>Detected Path</strong><br>';
                for (const [key, value] of Object.entries(feature.properties)) {
                    popupContent += `${key}: ${value}<br>`;
                }
                layer.bindPopup(popupContent);
            }
        };
        
        await loadShapefile(config.networkPath, layers.network, networkStyle, onEachFeature);
        console.log('Network (paths) loaded successfully');
        loadStatus.network = true;
        updateStatus();
    } catch (error) {
        console.error('Error loading network:', error);
        loadStatus.network = 'error';
        updateStatus();
    }
}

// Load polygons (areas)
async function loadPolygons() {
    try {
        const polygonStyle = {
            color: '#cc0000',
            weight: 2,
            fillColor: '#ff6464',
            fillOpacity: 0.3,
            opacity: 0.8
        };
        
        const onEachFeature = (feature, layer) => {
            if (feature.properties) {
                let popupContent = '<strong>Detected Area</strong><br>';
                for (const [key, value] of Object.entries(feature.properties)) {
                    popupContent += `${key}: ${value}<br>`;
                }
                layer.bindPopup(popupContent);
            }
        };
        
        await loadShapefile(config.polygonsPath, layers.polygons, polygonStyle, onEachFeature);
        console.log('Polygons (areas) loaded successfully');
        loadStatus.polygons = true;
        updateStatus();
    } catch (error) {
        console.error('Error loading polygons:', error);
        loadStatus.polygons = 'error';
        updateStatus();
    }
}

// Load OpenStreetMap ground truth data via Overpass API
async function loadOverpassData() {
    try {
        // Build Overpass QL query for pedestrian paths
        // Includes: footway, pedestrian highways, sidewalks, and paths
        const bbox = config.bbox; // [minLat, maxLat, minLon, maxLon]
        const overpassQuery = `
[out:json][timeout:25];
(
  // Footways and pedestrian ways
  way["highway"="footway"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  way["highway"="pedestrian"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  way["highway"="path"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  way["highway"="steps"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  
  // Sidewalks (tagged as separate ways)
  way["footway"="sidewalk"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  
  // Roads with sidewalk tags
  way["sidewalk"="both"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  way["sidewalk"="left"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  way["sidewalk"="right"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
  way["sidewalk"="yes"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
);
out geom;
`;

        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const response = await fetch(overpassUrl, {
            method: 'POST',
            body: 'data=' + encodeURIComponent(overpassQuery)
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }

        const osmData = await response.json();
        console.log(`Received ${osmData.elements.length} OSM elements`);

        // Convert Overpass JSON to GeoJSON
        const geojson = osmToGeoJSON(osmData);

        // Style based on highway type
        const getStyle = (feature) => {
            const props = feature.properties;
            const highway = props.highway;
            const footway = props.footway;
            const sidewalk = props.sidewalk;
            
            // Different styles for different types
            if (highway === 'pedestrian') {
                return { color: '#00cc00', weight: 4, opacity: 0.7 };
            } else if (highway === 'footway' && footway === 'sidewalk') {
                return { color: '#66ff66', weight: 2, opacity: 0.6, dashArray: '5, 5' };
            } else if (sidewalk) {
                return { color: '#99ff99', weight: 2, opacity: 0.6, dashArray: '3, 3' };
            } else if (highway === 'steps') {
                return { color: '#00aa00', weight: 3, opacity: 0.7, dashArray: '2, 4' };
            } else {
                return { color: '#00dd00', weight: 3, opacity: 0.7 };
            }
        };

        const onEachFeature = (feature, layer) => {
            if (feature.properties) {
                let popupContent = '<strong>OSM Ground Truth</strong><br>';
                popupContent += `<strong>Type:</strong> ${feature.properties.highway || 'N/A'}<br>`;
                
                if (feature.properties.name) {
                    popupContent += `<strong>Name:</strong> ${feature.properties.name}<br>`;
                }
                if (feature.properties.footway) {
                    popupContent += `<strong>Footway:</strong> ${feature.properties.footway}<br>`;
                }
                if (feature.properties.sidewalk) {
                    popupContent += `<strong>Sidewalk:</strong> ${feature.properties.sidewalk}<br>`;
                }
                if (feature.properties.surface) {
                    popupContent += `<strong>Surface:</strong> ${feature.properties.surface}<br>`;
                }
                if (feature.properties.width) {
                    popupContent += `<strong>Width:</strong> ${feature.properties.width}<br>`;
                }
                
                popupContent += `<strong>OSM ID:</strong> ${feature.properties.id || feature.id}<br>`;
                layer.bindPopup(popupContent);
            }
        };

        // Add to map
        const layer = L.geoJSON(geojson, {
            style: getStyle,
            onEachFeature: onEachFeature
        });

        layer.addTo(layers.overpass);

        console.log('Overpass ground truth data loaded successfully');
        loadStatus.overpass = true;
        updateStatus();
    } catch (error) {
        console.error('Error loading Overpass data:', error);
        loadStatus.overpass = 'error';
        updateStatus();
    }
}

// Convert Overpass JSON to GeoJSON
function osmToGeoJSON(osmData) {
    const features = [];
    
    osmData.elements.forEach(element => {
        if (element.type === 'way' && element.geometry) {
            const coordinates = element.geometry.map(node => [node.lon, node.lat]);
            
            features.push({
                type: 'Feature',
                id: element.id,
                properties: element.tags || {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            });
        }
    });
    
    return {
        type: 'FeatureCollection',
        features: features
    };
}

// Add layer control
const overlays = {
    'Aerial Imagery Tiles': layers.tiles,
    'Detected Paths (Network)': layers.network,
    'Detected Areas (Polygons)': layers.polygons,
    'OSM Ground Truth (Overpass)': layers.overpass
};

L.control.layers(null, overlays, { collapsed: false }).addTo(map);

// Add scale
L.control.scale({ imperial: true, metric: true }).addTo(map);

// Initialize - load all data
async function init() {
    document.getElementById('loading').style.display = 'block';
    
    try {
        // Load tiles first (background layer)
        await loadTiles();
        
        // Then load vector layers
        await Promise.all([
            loadNetwork(),
            loadPolygons(),
            loadOverpassData()
        ]);
        
        // Fit map to the detected features
        const allLayers = [...layers.network.getLayers(), ...layers.polygons.getLayers()];
        if (allLayers.length > 0) {
            const group = L.featureGroup(allLayers);
            map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    } catch (error) {
        console.error('Initialization error:', error);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Start the application
init();

// Add click event to show coordinates (useful for debugging)
map.on('click', function(e) {
    console.log('Clicked at:', e.latlng);
});

// Analysis functionality
let comparisonLayer = null;

function runAnalysis() {
    console.log('Running confusion matrix analysis...');
    
    // Disable button and show loading
    const btn = document.getElementById('analyze-btn');
    btn.disabled = true;
    btn.textContent = 'Computing...';
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            // Get features from layers
            const mlFeatures = AnalysisModule.layerToTurfGeometries(layers.network);
            const osmFeatures = AnalysisModule.layerToTurfGeometries(layers.overpass);
            
            console.log('ML features extracted:', mlFeatures.length);
            console.log('OSM features extracted:', osmFeatures.length);
            
            if (mlFeatures.length === 0 || osmFeatures.length === 0) {
                alert('Both ML network and OSM ground truth layers must be loaded and contain valid geometries!');
                btn.disabled = false;
                btn.textContent = 'Compute Confusion Matrix';
                return;
            }
            
            // Compute confusion matrix
            const results = AnalysisModule.computeConfusionMatrix(mlFeatures, osmFeatures);
            
            if (!results) {
                alert('Analysis failed - check console for errors');
                btn.disabled = false;
                btn.textContent = 'Compute Confusion Matrix';
                return;
            }
            
            // Display results
            AnalysisModule.displayResults(results);
            
            btn.textContent = 'Re-compute Analysis';
            btn.disabled = false;
            
            // Skip visual overlay generation as it's too slow
            console.log('Visual overlay generation skipped (too computationally expensive)');
            
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Analysis failed: ' + error.message);
            btn.disabled = false;
            btn.textContent = 'Compute Confusion Matrix';
        }
    }, 100);
}

// Enable analysis button when all data is loaded
document.getElementById('analyze-btn').addEventListener('click', runAnalysis);

// Check if analysis can be run
function checkAnalysisReady() {
    if (loadStatus.network === true && loadStatus.overpass === true) {
        document.getElementById('analyze-btn').disabled = false;
        document.getElementById('analyze-btn').title = 'Click to compute confusion matrix';
    }
}

// Add to updateStatus function
const originalUpdateStatus = updateStatus;
updateStatus = function() {
    originalUpdateStatus();
    checkAnalysisReady();
};
