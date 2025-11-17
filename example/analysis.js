/**
 * Analysis module for computing confusion matrix and overlap metrics
 * between ML-detected paths and OSM ground truth
 */

// Buffer distance for matching (in meters)
const BUFFER_DISTANCE = 5; // 5 meters tolerance

/**
 * Convert a Leaflet layer to Turf.js geometries
 */
function layerToTurfGeometries(layerGroup) {
    const geometries = [];
    
    layerGroup.eachLayer(layer => {
        if (layer.feature && layer.feature.geometry) {
            geometries.push(layer.feature);
        } else if (layer.toGeoJSON) {
            const geojson = layer.toGeoJSON();
            // Only add if it has valid geometry
            if (geojson && geojson.geometry && geojson.geometry.type) {
                geometries.push(geojson);
            } else if (geojson && geojson.type === 'FeatureCollection' && geojson.features) {
                // Handle FeatureCollection
                geojson.features.forEach(feature => {
                    if (feature.geometry && feature.geometry.type) {
                        geometries.push(feature);
                    }
                });
            }
        }
    });
    
    return geometries;
}

/**
 * Calculate total length of LineString features in meters
 */
function calculateTotalLength(features) {
    let totalLength = 0;
    
    features.forEach(feature => {
        if (!feature || !feature.geometry || !feature.geometry.type) {
            console.warn('Skipping feature without geometry:', feature);
            return;
        }
        
        try {
            if (feature.geometry.type === 'LineString') {
                totalLength += turf.length(feature, { units: 'meters' });
            } else if (feature.geometry.type === 'MultiLineString') {
                feature.geometry.coordinates.forEach(coords => {
                    const line = turf.lineString(coords);
                    totalLength += turf.length(line, { units: 'meters' });
                });
            }
        } catch (e) {
            console.warn('Error calculating length for feature:', e, feature);
        }
    });
    
    return totalLength;
}

/**
 * Buffer geometries by a certain distance
 */
function bufferGeometries(features, distance) {
    return features.map(feature => {
        if (!feature || !feature.geometry || !feature.geometry.type) {
            console.warn('Skipping feature without geometry');
            return null;
        }
        
        try {
            return turf.buffer(feature, distance, { units: 'meters' });
        } catch (e) {
            console.warn('Could not buffer feature:', e, feature);
            return null;
        }
    }).filter(f => f !== null);
}

/**
 * Calculate intersection between two sets of buffered geometries
 * Optimized version with progress feedback
 */
function calculateIntersection(featuresA, featuresB, bufferDist) {
    console.log('Buffering ML features...');
    const bufferedA = bufferGeometries(featuresA, bufferDist);
    console.log(`Buffered ${bufferedA.length} ML features`);
    
    console.log('Buffering OSM features...');
    const bufferedB = bufferGeometries(featuresB, bufferDist);
    console.log(`Buffered ${bufferedB.length} OSM features`);
    
    let intersectionArea = 0;
    let totalAreaA = 0;
    let totalAreaB = 0;
    
    // Calculate total areas
    bufferedA.forEach(feature => {
        try {
            totalAreaA += turf.area(feature);
        } catch (e) {
            console.warn('Error calculating area:', e);
        }
    });
    
    bufferedB.forEach(feature => {
        try {
            totalAreaB += turf.area(feature);
        } catch (e) {
            console.warn('Error calculating area:', e);
        }
    });
    
    console.log(`Total areas - ML: ${totalAreaA.toFixed(2)}m², OSM: ${totalAreaB.toFixed(2)}m²`);
    
    // Calculate intersections with progress logging
    // Limit to prevent browser freeze
    const maxComparisons = 1000;
    let comparisons = 0;
    let skipped = 0;
    
    for (let i = 0; i < bufferedA.length && comparisons < maxComparisons; i++) {
        for (let j = 0; j < bufferedB.length && comparisons < maxComparisons; j++) {
            comparisons++;
            
            if (comparisons % 100 === 0) {
                console.log(`Processing intersection ${comparisons}...`);
            }
            
            try {
                const intersection = turf.intersect(bufferedA[i], bufferedB[j]);
                if (intersection) {
                    intersectionArea += turf.area(intersection);
                }
            } catch (e) {
                skipped++;
                // Intersection failed, skip
            }
        }
    }
    
    if (comparisons >= maxComparisons) {
        console.warn(`Reached comparison limit (${maxComparisons}). Results may be approximate.`);
    }
    
    console.log(`Completed ${comparisons} comparisons, skipped ${skipped} failed intersections`);
    console.log(`Intersection area: ${intersectionArea.toFixed(2)}m²`);
    
    return {
        intersectionArea,
        totalAreaA,
        totalAreaB,
        comparisons,
        approximate: comparisons >= maxComparisons
    };
}

/**
 * Compute confusion matrix metrics
 * TP: ML detected & OSM exists (intersection)
 * FP: ML detected & OSM doesn't exist
 * FN: OSM exists & ML didn't detect
 */
function computeConfusionMatrix(mlFeatures, osmFeatures) {
    console.log('Computing confusion matrix...');
    console.log(`ML features: ${mlFeatures.length}`);
    console.log(`OSM features: ${osmFeatures.length}`);
    
    // Filter out any invalid features
    mlFeatures = mlFeatures.filter(f => f && f.geometry && f.geometry.type);
    osmFeatures = osmFeatures.filter(f => f && f.geometry && f.geometry.type);
    
    console.log(`Valid ML features: ${mlFeatures.length}`);
    console.log(`Valid OSM features: ${osmFeatures.length}`);
    
    if (mlFeatures.length === 0 || osmFeatures.length === 0) {
        alert('No valid LineString features found in one or both layers!');
        return null;
    }
    
    const mlLength = calculateTotalLength(mlFeatures);
    const osmLength = calculateTotalLength(osmFeatures);
    
    console.log(`ML total length: ${mlLength.toFixed(2)}m`);
    console.log(`OSM total length: ${osmLength.toFixed(2)}m`);
    
    // Calculate intersection using buffer method
    const intersection = calculateIntersection(mlFeatures, osmFeatures, BUFFER_DISTANCE);
    
    // Approximate lengths from areas (area / buffer_distance)
    const intersectionLength = intersection.intersectionArea / BUFFER_DISTANCE;
    
    // True Positives: ML detected paths that match OSM (intersection)
    const TP = intersectionLength;
    
    // False Positives: ML detected paths that don't match OSM
    const FP = Math.max(0, mlLength - intersectionLength);
    
    // False Negatives: OSM paths that ML didn't detect
    const FN = Math.max(0, osmLength - intersectionLength);
    
    // True Negatives: Not applicable for this problem (would be "no path" areas)
    // We'll estimate TN as 0 or a very large number representing empty space
    
    // Metrics
    const precision = TP / (TP + FP);
    const recall = TP / (TP + FN);
    const f1Score = 2 * (precision * recall) / (precision + recall);
    const iou = TP / (TP + FP + FN); // Intersection over Union
    
    const result = {
        // Raw values
        TP: TP.toFixed(2),
        FP: FP.toFixed(2),
        FN: FN.toFixed(2),
        mlLength: mlLength.toFixed(2),
        osmLength: osmLength.toFixed(2),
        
        // Metrics
        precision: (precision * 100).toFixed(2),
        recall: (recall * 100).toFixed(2),
        f1Score: (f1Score * 100).toFixed(2),
        iou: (iou * 100).toFixed(2),
        
        // Additional info
        bufferDistance: BUFFER_DISTANCE,
        approximate: intersection.approximate || false,
        comparisons: intersection.comparisons || 0
    };
    
    console.log('Analysis complete:', result);
    return result;
}

/**
 * Generate a visual overlay showing TP, FP, FN areas
 */
function generateComparisonOverlay(mlFeatures, osmFeatures) {
    const bufferedML = bufferGeometries(mlFeatures, BUFFER_DISTANCE);
    const bufferedOSM = bufferGeometries(osmFeatures, BUFFER_DISTANCE);
    
    const overlayLayers = {
        truePositives: [],
        falsePositives: [],
        falseNegatives: []
    };
    
    // Find True Positives (intersections)
    bufferedML.forEach((mlFeature, i) => {
        let hasIntersection = false;
        
        bufferedOSM.forEach(osmFeature => {
            try {
                const intersection = turf.intersect(mlFeature, osmFeature);
                if (intersection) {
                    overlayLayers.truePositives.push(intersection);
                    hasIntersection = true;
                }
            } catch (e) {
                // Skip
            }
        });
        
        // If no intersection, it's a false positive
        if (!hasIntersection) {
            overlayLayers.falsePositives.push(mlFeatures[i]);
        }
    });
    
    // Find False Negatives (OSM paths not detected)
    bufferedOSM.forEach((osmFeature, i) => {
        let hasIntersection = false;
        
        bufferedML.forEach(mlFeature => {
            try {
                const intersection = turf.intersect(osmFeature, mlFeature);
                if (intersection) {
                    hasIntersection = true;
                }
            } catch (e) {
                // Skip
            }
        });
        
        if (!hasIntersection) {
            overlayLayers.falseNegatives.push(osmFeatures[i]);
        }
    });
    
    return overlayLayers;
}

/**
 * Display confusion matrix results in UI
 */
function displayResults(results) {
    const approximateWarning = results.approximate ? 
        `<div style="background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
            <strong>⚠️ Approximate Results</strong><br>
            <small>Analysis limited to ${results.comparisons} comparisons to prevent browser freeze.</small>
        </div>` : '';
    
    const resultHTML = `
        <div style="max-height: 400px; overflow-y: auto;">
            <h4 style="margin-top: 0;">Confusion Matrix Analysis</h4>
            
            ${approximateWarning}
            
            <div style="background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px;">
                <strong>Buffer Distance:</strong> ${results.bufferDistance}m<br>
                <small>Comparisons: ${results.comparisons}</small>
            </div>
            
            <div style="background: #e8f5e9; padding: 10px; margin: 10px 0; border-radius: 5px;">
                <strong>True Positives (TP):</strong> ${results.TP}m<br>
                <small>ML detected paths matching OSM ground truth</small>
            </div>
            
            <div style="background: #ffebee; padding: 10px; margin: 10px 0; border-radius: 5px;">
                <strong>False Positives (FP):</strong> ${results.FP}m<br>
                <small>ML detected paths not in OSM</small>
            </div>
            
            <div style="background: #fff3e0; padding: 10px; margin: 10px 0; border-radius: 5px;">
                <strong>False Negatives (FN):</strong> ${results.FN}m<br>
                <small>OSM paths not detected by ML</small>
            </div>
            
            <hr>
            
            <div style="padding: 10px; margin: 10px 0;">
                <strong>Precision:</strong> ${results.precision}%<br>
                <small>TP / (TP + FP) - How many detected paths are correct</small>
            </div>
            
            <div style="padding: 10px; margin: 10px 0;">
                <strong>Recall:</strong> ${results.recall}%<br>
                <small>TP / (TP + FN) - How many real paths were detected</small>
            </div>
            
            <div style="padding: 10px; margin: 10px 0;">
                <strong>F1 Score:</strong> ${results.f1Score}%<br>
                <small>Harmonic mean of precision and recall</small>
            </div>
            
            <div style="padding: 10px; margin: 10px 0;">
                <strong>IoU:</strong> ${results.iou}%<br>
                <small>Intersection over Union</small>
            </div>
            
            <hr>
            
            <div style="font-size: 0.9em; color: #666;">
                <strong>Total ML Length:</strong> ${results.mlLength}m<br>
                <strong>Total OSM Length:</strong> ${results.osmLength}m
            </div>
        </div>
    `;
    
    // Update or create results panel
    let resultsPanel = document.getElementById('results-panel');
    if (!resultsPanel) {
        resultsPanel = document.createElement('div');
        resultsPanel.id = 'results-panel';
        resultsPanel.className = 'info-panel';
        resultsPanel.style.top = '10px';
        resultsPanel.style.left = '10px';
        resultsPanel.style.right = 'auto';
        resultsPanel.style.maxWidth = '350px';
        document.body.appendChild(resultsPanel);
    }
    
    resultsPanel.innerHTML = resultHTML;
}

// Export functions
window.AnalysisModule = {
    computeConfusionMatrix,
    generateComparisonOverlay,
    displayResults,
    layerToTurfGeometries,
    BUFFER_DISTANCE
};
