// Global state management
const state = {
    currentSample: 'example',
    currentView: 'confusion',
    currentBaseMap: 'satellite',
    currentHeatmapMetric: 'f1_score',
    map: null,
    baseLayers: {},
    confusionLayers: {},
    tileHeatmapLayer: null,
    perTileData: null,
    globalData: null,
    tileImageOverlays: [],
    layerControl: null,
    tileImageExtension: 'jpg'
};

// Sample-specific configuration
const sampleConfig = {
    'boston_common': {
        tilePath: '../boston_common/tiles/static/ma/256_19',
        imageExtension: 'jpg',
        outputPath: '../boston_common_output',
        center: [42.3601, -71.0589],
        name: 'Boston Common'
    },
    'times_square': {
        tilePath: '../times_square/tiles/static/nyc/256_19',
        imageExtension: 'png',
        outputPath: '../times_square_output',
        center: [40.7580, -73.9855],
        name: 'Times Square'
    }
};

// Tile coordinate to lat/lon conversion (Web Mercator)
function tile2lon(x, z) {
    return (x / Math.pow(2, z) * 360 - 180);
}

function tile2lat(y, z) {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

// Initialize the application
async function init() {
    // Read dataset from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const sampleParam = urlParams.get('sample');
    if (sampleParam && sampleConfig[sampleParam]) {
        state.currentSample = sampleParam;
        console.log(`Initialized with dataset from URL: ${sampleParam}`);
    }
    
    initializeMap();
    setupEventListeners();
    await loadData();
}

// Initialize Leaflet map
function initializeMap() {
    const config = sampleConfig[state.currentSample];
    state.map = L.map('map', {
        center: config.center,
        zoom: 17,
        zoomControl: true
    });
    
    // Create base layers
    state.baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });
    
    // OSM layer will be default until satellite images are loaded
    state.baseLayers.osm.addTo(state.map);
}

// Setup event listeners
function setupEventListeners() {
    // Set initial dataset selector value
    document.getElementById('sampleSelect').value = state.currentSample;
    
    document.getElementById('sampleSelect').addEventListener('change', async (e) => {
        state.currentSample = e.target.value;
        
        // Update URL without reload
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('sample', state.currentSample);
        window.history.pushState({}, '', newUrl);
        
        await loadData();
    });
    
    document.getElementById('baseMapSelect').addEventListener('change', (e) => {
        state.currentBaseMap = e.target.value;
        switchBaseMap();
    });
    
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await loadData();
    });
    
    document.getElementById('confusionViewBtn').addEventListener('click', () => {
        switchMapView('confusion');
    });
    
    document.getElementById('heatmapViewBtn').addEventListener('click', () => {
        switchMapView('heatmap');
    });
    
    document.getElementById('heatmapMetricSelect').addEventListener('change', (e) => {
        state.currentHeatmapMetric = e.target.value;
        if (state.currentView === 'heatmap') {
            renderTileHeatmap();
        }
    });
    
    document.getElementById('scatterXSelect').addEventListener('change', () => {
        renderScatterPlot();
    });
    
    document.getElementById('scatterYSelect').addEventListener('change', () => {
        renderScatterPlot();
    });
    
    document.getElementById('dashboardBtn').addEventListener('click', () => {
        // Pass current sample to dashboard via URL parameter
        window.location.href = `../example/tilemetrics.html?sample=${state.currentSample}`;
    });
}

// Load data
async function loadData() {
    try {
        const sample = state.currentSample;
        const config = sampleConfig[sample];
        
        if (!config) {
            console.error(`No configuration found for sample: ${sample}`);
            return;
        }
        
        // Show loading state
        document.getElementById('statsGrid').innerHTML = `<div class="loading">Loading ${config.name} data...</div>`;
        
        // Update tile image extension
        state.tileImageExtension = config.imageExtension;
        
        // Load global metrics
        console.log(`Loading global metrics from: ${config.outputPath}/confusion_matrix_global_polygon_based.json`);
        const globalResponse = await fetch(`${config.outputPath}/confusion_matrix_global_polygon_based.json`);
        if (!globalResponse.ok) throw new Error(`Failed to load global metrics: ${globalResponse.status}`);
        state.globalData = await globalResponse.json();
        
        // Load per-tile metrics
        console.log(`Loading per-tile metrics from: ${config.outputPath}/confusion_matrix_per_tile_polygon_based.json`);
        const perTileResponse = await fetch(`${config.outputPath}/confusion_matrix_per_tile_polygon_based.json`);
        if (!perTileResponse.ok) throw new Error(`Failed to load per-tile metrics: ${perTileResponse.status}`);
        state.perTileData = await perTileResponse.json();
        
        console.log(`Loaded ${state.perTileData.length} tiles`);
        
        // Load GeoJSON files
        console.log(`Loading GeoJSON files from: ${config.outputPath}`);
        const [tpData, fpData, fnData, mlPolygonsData, osmData] = await Promise.all([
            fetch(`${config.outputPath}/true_positives_polygon_based.geojson`).then(r => {
                if (!r.ok) throw new Error(`Failed to load TP data: ${r.status}`);
                return r.json();
            }),
            fetch(`${config.outputPath}/false_positives_polygon_based.geojson`).then(r => {
                if (!r.ok) throw new Error(`Failed to load FP data: ${r.status}`);
                return r.json();
            }),
            fetch(`${config.outputPath}/false_negatives_polygon_based.geojson`).then(r => {
                if (!r.ok) throw new Error(`Failed to load FN data: ${r.status}`);
                return r.json();
            }),
            fetch(`${config.outputPath}/ml_polygons.geojson`).then(r => {
                if (!r.ok) throw new Error(`Failed to load ML polygons: ${r.status}`);
                return r.json();
            }),
            fetch(`${config.outputPath}/osm_ground_truth.geojson`).then(r => {
                if (!r.ok) throw new Error(`Failed to load OSM data: ${r.status}`);
                return r.json();
            })
        ]);
        
        // Store GeoJSON data
        state.geojsonData = {
            tp: tpData,
            fp: fpData,
            fn: fnData,
            mlPolygons: mlPolygonsData,
            osm: osmData
        };
        
        // Update UI
        renderGlobalStats();
        await loadSatelliteImagery();
        
        // Render based on current view
        if (state.currentView === 'confusion') {
            renderConfusionLayers();
        } else {
            renderTileHeatmap();
        }
        
        renderScatterPlot();
        
        // Fit map to data bounds
        fitMapToBounds();
        
        console.log('Data loading completed successfully');
        
    } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        document.getElementById('statsGrid').innerHTML = 
            `<div class="loading" style="color: #e74c3c;">Error loading data: ${error.message}<br>Please check console for details.</div>`;
    }
}

// Load satellite imagery tiles
async function loadSatelliteImagery() {
    const sample = state.currentSample;
    const config = sampleConfig[sample];
    
    if (!config) {
        console.error(`No configuration found for sample: ${sample}`);
        return;
    }
    
    // Remove existing satellite layer if present
    if (state.baseLayers.satellite) {
        state.map.removeLayer(state.baseLayers.satellite);
        state.tileImageOverlays.forEach(overlay => state.map.removeLayer(overlay));
        state.tileImageOverlays = [];
    }
    
    // Create layer group for satellite tiles
    state.baseLayers.satellite = L.layerGroup();
    
    const tilePath = config.tilePath;
    state.tileImageExtension = config.imageExtension;
    
    // Load each tile as an image overlay
    for (const tile of state.perTileData) {
        const xtile = tile.xtile;
        const ytile = tile.ytile;
        const zoom = 19;
        
        // Calculate bounds for this tile
        const topLeftLat = tile2lat(ytile, zoom);
        const topLeftLon = tile2lon(xtile, zoom);
        const bottomRightLat = tile2lat(ytile + 1, zoom);
        const bottomRightLon = tile2lon(xtile + 1, zoom);
        
        const bounds = [
            [bottomRightLat, topLeftLon],
            [topLeftLat, bottomRightLon]
        ];
        
        const imageUrl = `${tilePath}/${xtile}_${ytile}.${state.tileImageExtension}`;
        
        const overlay = L.imageOverlay(imageUrl, bounds, {
            opacity: 1.0,
            interactive: false
        });
        
        state.tileImageOverlays.push(overlay);
        state.baseLayers.satellite.addLayer(overlay);
    }
    
    // Switch to satellite if that's the current selection
    if (state.currentBaseMap === 'satellite') {
        switchBaseMap();
    }
}

// Switch between base maps
function switchBaseMap() {
    // Remove all base layers
    Object.values(state.baseLayers).forEach(layer => {
        if (state.map.hasLayer(layer)) {
            state.map.removeLayer(layer);
        }
    });
    
    // Add selected base layer
    if (state.currentBaseMap === 'satellite' && state.baseLayers.satellite) {
        state.baseLayers.satellite.addTo(state.map);
    } else {
        state.baseLayers.osm.addTo(state.map);
    }
}

// Switch between map views
function switchMapView(view) {
    state.currentView = view;
    
    // Update button states
    document.getElementById('confusionViewBtn').classList.toggle('active', view === 'confusion');
    document.getElementById('heatmapViewBtn').classList.toggle('active', view === 'heatmap');
    
    // Show/hide metric selector for heatmap
    document.getElementById('heatmapMetricSelect').style.display = 
        view === 'heatmap' ? 'block' : 'none';
    
    // Show/hide color scale
    document.getElementById('colorScale').style.display = 
        view === 'heatmap' ? 'block' : 'none';
    
    // Clear existing layers
    clearConfusionLayers();
    clearTileHeatmap();
    
    // Render appropriate view
    if (view === 'confusion') {
        renderConfusionLayers();
    } else {
        renderTileHeatmap();
    }
}

// Render confusion matrix layers
function renderConfusionLayers() {
    // Remove existing layer control if present
    if (state.layerControl) {
        state.map.removeControl(state.layerControl);
    }
    
    // Clear existing layers
    clearConfusionLayers();
    
    if (!state.geojsonData) return;
    
    // Create layers
    state.confusionLayers.tp = L.geoJSON(state.geojsonData.tp, {
        style: {
            color: '#27ae60',
            weight: 3,
            opacity: 0.8
        },
        onEachFeature: (feature, layer) => {
            layer.bindPopup('<b>True Positive</b><br>ML prediction matches OSM ground truth');
        }
    });
    
    state.confusionLayers.fp = L.geoJSON(state.geojsonData.fp, {
        style: {
            color: '#e67e22',
            weight: 3,
            opacity: 0.8
        },
        onEachFeature: (feature, layer) => {
            layer.bindPopup('<b>False Positive</b><br>ML prediction with no OSM match');
        }
    });
    
    state.confusionLayers.fn = L.geoJSON(state.geojsonData.fn, {
        style: {
            color: '#e74c3c',
            weight: 3,
            opacity: 0.8
        },
        onEachFeature: (feature, layer) => {
            layer.bindPopup('<b>False Negative</b><br>OSM path outside ML polygons');
        }
    });
    
    state.confusionLayers.mlPolygons = L.geoJSON(state.geojsonData.mlPolygons, {
        style: {
            color: '#3498db',
            weight: 1,
            fillColor: '#3498db',
            fillOpacity: 0.1
        },
        onEachFeature: (feature, layer) => {
            layer.bindPopup('<b>ML Polygon</b><br>Detected pedestrian area');
        }
    });
    
    state.confusionLayers.osm = L.geoJSON(state.geojsonData.osm, {
        style: {
            color: '#95a5a6',
            weight: 2,
            opacity: 0.5
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            const popup = `<b>OSM Ground Truth</b><br>
                Highway: ${props.highway || 'N/A'}<br>
                Name: ${props.name || 'N/A'}`;
            layer.bindPopup(popup);
        }
    });
    
    // Create overlay layers object for layer control
    const overlays = {
        'True Positives': state.confusionLayers.tp,
        'False Positives': state.confusionLayers.fp,
        'False Negatives': state.confusionLayers.fn,
        'ML Polygons': state.confusionLayers.mlPolygons,
        'OSM Ground Truth': state.confusionLayers.osm
    };
    
    // Add all layers by default
    Object.values(state.confusionLayers).forEach(layer => layer.addTo(state.map));
    
    // Add layer control
    state.layerControl = L.control.layers(null, overlays, { collapsed: false }).addTo(state.map);
}

// Clear confusion layers
function clearConfusionLayers() {
    Object.values(state.confusionLayers).forEach(layer => {
        if (layer && state.map.hasLayer(layer)) {
            state.map.removeLayer(layer);
        }
    });
    state.confusionLayers = {};
}

// Render tile heatmap
function renderTileHeatmap() {
    clearTileHeatmap();
    
    if (!state.perTileData) return;
    
    // Filter out tiles with no data for heatmap
    const tilesWithData = state.perTileData.filter(tile => 
        tile.osm_count > 0 || tile.ml_network_count > 0
    );
    
    const metric = state.currentHeatmapMetric;
    
    // Get metric values and calculate min/max
    const values = tilesWithData.map(t => t[metric]).filter(v => v != null && !isNaN(v));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Update color scale
    document.getElementById('scaleMin').textContent = minValue.toFixed(3);
    document.getElementById('scaleMax').textContent = maxValue.toFixed(3);
    
    // Create color scale function
    const getColor = (value) => {
        if (value == null || isNaN(value)) return '#cccccc';
        
        const normalized = (value - minValue) / (maxValue - minValue);
        
        // Red -> Yellow -> Green color scale
        if (normalized < 0.5) {
            const r = 215;
            const g = Math.floor(115 + (224 - 115) * (normalized * 2));
            const b = Math.floor(39 + (139 - 39) * (normalized * 2));
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            const r = Math.floor(254 - (254 - 26) * ((normalized - 0.5) * 2));
            const g = Math.floor(224 - (224 - 152) * ((normalized - 0.5) * 2));
            const b = Math.floor(139 - (139 - 80) * ((normalized - 0.5) * 2));
            return `rgb(${r}, ${g}, ${b})`;
        }
    };
    
    // Create GeoJSON features for tiles with data only
    const tileFeatures = tilesWithData.map(tile => {
        const xtile = tile.xtile;
        const ytile = tile.ytile;
        const zoom = 19;
        
        const topLeftLat = tile2lat(ytile, zoom);
        const topLeftLon = tile2lon(xtile, zoom);
        const bottomRightLat = tile2lat(ytile + 1, zoom);
        const bottomRightLon = tile2lon(xtile + 1, zoom);
        
        return {
            type: 'Feature',
            properties: tile,
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [topLeftLon, topLeftLat],
                    [bottomRightLon, topLeftLat],
                    [bottomRightLon, bottomRightLat],
                    [topLeftLon, bottomRightLat],
                    [topLeftLon, topLeftLat]
                ]]
            }
        };
    });
    
    // Create layer
    state.tileHeatmapLayer = L.geoJSON({
        type: 'FeatureCollection',
        features: tileFeatures
    }, {
        style: (feature) => {
            const value = feature.properties[metric];
            return {
                fillColor: getColor(value),
                fillOpacity: 0.6,
                color: '#333',
                weight: 1,
                opacity: 0.8
            };
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            const tileConfig = sampleConfig[state.currentSample];
            const imageUrl = `${tileConfig.tilePath}/${props.xtile}_${props.ytile}.${tileConfig.imageExtension}`;
            
            // Add click handler to show modal
            layer.on('click', function() {
                showTileDetailsModal(props, imageUrl);
            });
            
            layer.on('mouseover', function() {
                this.setStyle({ weight: 3, opacity: 1 });
            });
            
            layer.on('mouseout', function() {
                this.setStyle({ weight: 1, opacity: 0.8 });
            });
        }
    });
    
    state.tileHeatmapLayer.addTo(state.map);
}

// Create tile popup content
function createTilePopup(props, imageUrl) {
    return `
        <div class="tile-popup">
            <h4>Tile ${props.tile_id}</h4>
            <img src="${imageUrl}" alt="Tile imagery" onerror="this.style.display='none'">
            
            <div style="background: #f8f9fa; padding: 8px; margin: 5px 0; border-radius: 4px;">
                <b>Location</b>
                <div class="metric-row">
                    <span class="metric-label">Position:</span>
                    <span class="metric-value">(${props.xtile}, ${props.ytile})</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Center:</span>
                    <span class="metric-value">(${props.lat.toFixed(6)}, ${props.lon.toFixed(6)})</span>
                </div>
            </div>
            
            <div style="background: #e8f5e9; padding: 8px; margin: 5px 0; border-radius: 4px;">
                <b>Performance</b>
                <div class="metric-row">
                    <span class="metric-label">F1 Score:</span>
                    <span class="metric-value">${props.f1_score.toFixed(3)}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Precision:</span>
                    <span class="metric-value">${props.precision.toFixed(3)}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Recall:</span>
                    <span class="metric-value">${props.recall.toFixed(3)}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">IoU:</span>
                    <span class="metric-value">${props.iou.toFixed(3)}</span>
                </div>
            </div>
            
            <div style="background: #fff3e0; padding: 8px; margin: 5px 0; border-radius: 4px;">
                <b>Detections</b>
                <div class="metric-row">
                    <span class="metric-label">ML Network:</span>
                    <span class="metric-value">${props.ml_network_count}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">ML Polygons:</span>
                    <span class="metric-value">${props.ml_polygon_count}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">OSM Paths:</span>
                    <span class="metric-value">${props.osm_count}</span>
                </div>
            </div>
            
            <div style="background: #e1f5fe; padding: 8px; margin: 5px 0; border-radius: 4px;">
                <b>Lengths (m)</b>
                <div class="metric-row">
                    <span class="metric-label">TP:</span>
                    <span class="metric-value">${props.tp_length_m.toFixed(1)}m</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">FP:</span>
                    <span class="metric-value">${props.fp_length_m.toFixed(1)}m</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">FN:</span>
                    <span class="metric-value">${props.fn_length_m.toFixed(1)}m</span>
                </div>
            </div>
        </div>
    `;
}

// Clear tile heatmap
function clearTileHeatmap() {
    if (state.tileHeatmapLayer) {
        state.map.removeLayer(state.tileHeatmapLayer);
        state.tileHeatmapLayer = null;
    }
}

// Render global statistics
function renderGlobalStats() {
    if (!state.globalData) return;
    
    const data = state.globalData;
    
    const statsHTML = `
        <div class="stat-card">
            <h3>F1 Score</h3>
            <div class="value">${(data.f1_score * 100).toFixed(2)}%</div>
            <div class="subvalue">Harmonic mean of precision and recall</div>
        </div>
        
        <div class="stat-card">
            <h3>Precision</h3>
            <div class="value">${(data.precision * 100).toFixed(2)}%</div>
            <div class="subvalue">TP / (TP + FP)</div>
        </div>
        
        <div class="stat-card">
            <h3>Recall</h3>
            <div class="value">${(data.recall * 100).toFixed(2)}%</div>
            <div class="subvalue">TP / (TP + FN)</div>
        </div>
        
        <div class="stat-card">
            <h3>IoU</h3>
            <div class="value">${(data.iou * 100).toFixed(2)}%</div>
            <div class="subvalue">Intersection over Union</div>
        </div>
        
        <div class="stat-card">
            <h3>True Positives</h3>
            <div class="value">${data.tp_length_m.toFixed(0)}m</div>
            <div class="subvalue">${data.tp_count} segments</div>
        </div>
        
        <div class="stat-card">
            <h3>False Positives</h3>
            <div class="value">${data.fp_length_m.toFixed(0)}m</div>
            <div class="subvalue">${data.fp_count} segments</div>
        </div>
        
        <div class="stat-card">
            <h3>False Negatives</h3>
            <div class="value">${data.fn_length_m.toFixed(0)}m</div>
            <div class="subvalue">${data.fn_count} segments</div>
        </div>
        
        <div class="stat-card">
            <h3>ML Network Total</h3>
            <div class="value">${data.ml_total_length_m.toFixed(0)}m</div>
            <div class="subvalue">${data.ml_in_polygon_length_m.toFixed(0)}m in polygons</div>
        </div>
        
        <div class="stat-card">
            <h3>OSM Network Total</h3>
            <div class="value">${data.osm_total_length_m.toFixed(0)}m</div>
            <div class="subvalue">${data.osm_in_polygon_length_m.toFixed(0)}m in polygons</div>
        </div>
        
        <div class="stat-card">
            <h3>ML Polygons</h3>
            <div class="value">${data.polygon_count}</div>
            <div class="subvalue">${data.polygon_area_sqm.toFixed(0)} m²</div>
        </div>
        
        <div class="stat-card">
            <h3>Buffer Distance</h3>
            <div class="value">${data.buffer_distance_m}m</div>
            <div class="subvalue">Matching tolerance</div>
        </div>
        
        <div class="stat-card">
            <h3>Method</h3>
            <div class="value" style="font-size: 14px;">Polygon-based</div>
            <div class="subvalue">Segmented validation</div>
        </div>
    `;
    
    document.getElementById('statsGrid').innerHTML = statsHTML;
}

// Render scatter plot
function renderScatterPlot() {
    if (!state.perTileData) return;
    
    // Filter out tiles with no data for scatter plot
    const tilesWithData = state.perTileData.filter(tile => 
        tile.osm_count > 0 || tile.ml_network_count > 0
    );
    
    const xMetric = document.getElementById('scatterXSelect').value;
    const yMetric = document.getElementById('scatterYSelect').value;
    
    const xValues = tilesWithData.map(t => t[xMetric]);
    const yValues = tilesWithData.map(t => t[yMetric]);
    
    // Get tile image paths
    const scatterConfig = sampleConfig[state.currentSample];
    const imageUrls = tilesWithData.map(t => 
        `${scatterConfig.tilePath}/${t.xtile}_${t.ytile}.${scatterConfig.imageExtension}`
    );
    
    // Create hover text
    const hoverText = tilesWithData.map((t, i) => 
        `Tile ${t.tile_id}<br>` +
        `${xMetric}: ${xValues[i].toFixed(2)}<br>` +
        `${yMetric}: ${yValues[i].toFixed(3)}<br>` +
        `F1: ${t.f1_score.toFixed(3)}<br>` +
        `Click for details`
    );
    
    const trace = {
        x: xValues,
        y: yValues,
        mode: 'markers',
        type: 'scatter',
        text: hoverText,
        hoverinfo: 'text',
        marker: {
            size: 8,
            color: tilesWithData.map(t => t.f1_score),
            colorscale: [
                [0, '#d73027'],
                [0.5, '#fee08b'],
                [1, '#1a9850']
            ],
            showscale: true,
            colorbar: {
                title: 'F1 Score',
                thickness: 15,
                len: 0.7
            },
            line: {
                color: '#333',
                width: 1
            }
        },
        customdata: tilesWithData.map((t, i) => ({
            tile: t,
            imageUrl: imageUrls[i]
        }))
    };
    
    const layout = {
        xaxis: {
            title: formatMetricLabel(xMetric),
            gridcolor: '#e0e0e0'
        },
        yaxis: {
            title: formatMetricLabel(yMetric),
            gridcolor: '#e0e0e0'
        },
        hovermode: 'closest',
        margin: { t: 20, r: 20, b: 60, l: 60 },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: 'white'
    };
    
    const plotConfig = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };
    
    Plotly.newPlot('scatterPlot', [trace], layout, plotConfig);
    
    // Add click handler
    document.getElementById('scatterPlot').on('plotly_click', function(data) {
        const point = data.points[0];
        const customData = point.customdata;
        
        showTileDetailsModal(customData.tile, customData.imageUrl);
    });
}

// Format metric labels for display
function formatMetricLabel(metric) {
    const labels = {
        'f1_score': 'F1 Score',
        'precision': 'Precision',
        'recall': 'Recall',
        'iou': 'IoU',
        'tp_length_m': 'True Positive Length (m)',
        'fp_length_m': 'False Positive Length (m)',
        'fn_length_m': 'False Negative Length (m)'
    };
    
    return labels[metric] || metric;
}

// Show tile details modal (popup)
function showTileDetailsModal(tile, imageUrl) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = createTilePopup(tile, imageUrl);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
        margin-top: 15px;
        padding: 10px 20px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
    `;
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    document.body.appendChild(modal);
}

// Fit map to data bounds
function fitMapToBounds() {
    if (!state.perTileData || state.perTileData.length === 0) return;
    
    const lats = state.perTileData.map(t => t.lat);
    const lons = state.perTileData.map(t => t.lon);
    
    const bounds = [
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)]
    ];
    
    state.map.fitBounds(bounds, { padding: [50, 50] });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
