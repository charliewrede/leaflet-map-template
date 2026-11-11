// ============================================================================
// LAYERS
//
// Loads the GeoJSON files and turns every entry of LAYERS (js/config.js)
// into a Leaflet layer. Any setting a layer leaves out is filled in here.
//
// CONTENTS
//   1. Default settings ..... prepareLayers(), applyDataDefaults()
//   2. Loading the data ..... loadLayerData()
//   3. Colors ............... scoreColor()
//   4. Symbols .............. symbolHtml()
//   5. Popups ............... popupBinder(), automatic popups
//   6. Layer builders ....... one function per layer "type"
//   7. Building all layers .. createLayers()
//   8. Hover highlight ...... addHoverResponse()
// ============================================================================

import {
    DATA_FOLDER,
    LAYERS,
    POPUP_PANE,
    SCORE_SCALE,
    NO_DATA_COLOR,
    TOP_SCORES
} from "./config.js";

import { createPopupBuilder } from "./popups.js";


// ============================================================================
// 1. DEFAULT SETTINGS
// ============================================================================

// Colors and shapes handed out, in turn, to layers that don't choose one.
const AUTO_COLORS = [
    "#1F78B4", "#E31A1C", "#33A02C", "#FF7F00", "#6A3D9A",
    "#00A6A6", "#C51B7D", "#B15928", "#7570B3", "#D95F02"
];

const AUTO_SHAPES = [
    "circle", "square", "diamond", "triangle", "star", "hexagon", "cross", "drop"
];

// Older type names still work.
const TYPE_ALIASES = {
    riskPolygons: "scorePolygons",
    riskPoints: "scorePoints"
};

// Where each type is drawn (see PANES in config.js).
const DEFAULT_PANES = {
    scorePolygons: "scorePane",
    outline: "outlinePane",
    polygons: "polygonPane",
    scorePoints: "pointPane",
    symbolPoints: "pointPane",
    rankedPoints: "rankedPane"
};

// "Grocery_Stores.geojson" -> "Grocery Stores"
function labelFromFile(file) {
    return file
        .replace(/\?.*$/, "")
        .replace(/\.(geo)?json$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

// "Grocery_Stores.geojson" -> "groceryStores"
function idFromFile(file) {
    return labelFromFile(file)
        .replace(/[^A-Za-z0-9 ]/g, "")
        .split(" ")
        .filter(Boolean)
        .map((word, index) =>
            index === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join("");
}

// Fills in the settings that don't need the data: id, label, visibility.
// Runs once, before anything is loaded.
export function prepareLayers() {

    LAYERS.forEach((config, index) => {

        if (!config.id) {
            config.id = config.file ? idFromFile(config.file) : "layer" + (index + 1);
        }

        if (!config.label) {
            config.label = config.file ? labelFromFile(config.file) : config.id;
        }

        if (config.visible === undefined) {
            config.visible = true;
        }

        if (TYPE_ALIASES[config.type]) {
            config.type = TYPE_ALIASES[config.type];
        }
    });
}

// What kind of shapes does this file hold? Reads the first feature.
function geometryKind(data) {

    const feature = (data.features || []).find(f => f && f.geometry);
    const type = feature ? feature.geometry.type : "";

    if (type.includes("Point")) return "point";
    if (type.includes("LineString")) return "line";
    return "polygon";
}

// Fills in the settings that depend on the data: type, color, shape, style.
function applyDataDefaults(config, data, index) {

    const autoColor = AUTO_COLORS[index % AUTO_COLORS.length];

    if (!config.type) {
        config.type = {
            point: "symbolPoints",
            line: "outline",
            polygon: "polygons"
        }[geometryKind(data)];
    }

    config.pane = config.pane || DEFAULT_PANES[config.type];

    switch (config.type) {

        case "symbolPoints":
            config.color = config.color || autoColor;
            config.shape = config.shape || AUTO_SHAPES[index % AUTO_SHAPES.length];
            break;

        case "polygons":
            config.color = config.color || autoColor;
            config.style = {
                color: config.color,
                weight: 2,
                opacity: 1,
                fillColor: config.color,
                fillOpacity: 0.45,
                ...config.style
            };
            break;

        case "outline":
            config.color = config.color || "#000000";
            config.style = {
                color: config.color,
                weight: 2,
                opacity: 1,
                fill: false,
                ...config.style
            };
            config.legendLineWidth = config.legendLineWidth || Math.min(config.style.weight, 3);
            break;

        case "scorePolygons":
            config.style = { weight: 0.25, opacity: 1, color: "#000000", fillOpacity: 0.8, ...config.style };
            config.legendCaption = config.legendCaption || config.label;
            break;

        case "scorePoints":
            config.style = { radius: 6, color: "#000000", weight: 1, fillOpacity: 1, ...config.style };
            config.legendCaption = config.legendCaption || config.label;
            break;

        case "rankedPoints":
            config.color = config.color || "#000000";
            config.count = config.count || 5;
            config.filter = config.filter || (() => true);
            config.legendLetter = config.legendLetter || config.label.charAt(0).toUpperCase();
            break;
    }
}


// ============================================================================
// 2. LOADING THE DATA
// ============================================================================

// Downloads one GeoJSON file from the Data folder.
function loadGeoJSON(file) {

    return fetch(DATA_FOLDER + file).then(response => {

        if (!response.ok) {
            throw new Error(
                response.status === 404
                    ? "file not found in the Data folder"
                    : "server answered " + response.status
            );
        }

        return response.json().catch(() => {
            throw new Error("not valid GeoJSON");
        });
    });
}

// Removes a layer from LAYERS, so the rest of the map carries on without it.
function dropLayer(config) {
    LAYERS.splice(LAYERS.indexOf(config), 1);
}

// Downloads every file named in LAYERS, all at the same time.
//
// Returns:
//   data      the GeoJSON keyed by layer id:  { parks: {...}, ... }
//   problems  one message per layer that could not be used
//
// A layer whose file fails is left off the map; the others still load.
export function loadLayerData() {

    const layersWithFiles = LAYERS.filter(config => config.file);

    return Promise
        .allSettled(layersWithFiles.map(config => loadGeoJSON(config.file)))
        .then(results => {

            const data = {};
            const problems = [];

            results.forEach((result, index) => {

                const config = layersWithFiles[index];

                if (result.status === "fulfilled") {
                    data[config.id] = result.value;
                    return;
                }

                problems.push(config.file + ": " + result.reason.message);
                dropLayer(config);
            });

            // Layers that borrow another layer's data need that layer
            LAYERS
                .filter(config => !config.file)
                .forEach(config => {
                    if (!data[config.sourceLayer]) {
                        problems.push(
                            config.label + ': needs sourceLayer "' +
                            config.sourceLayer + '", which did not load'
                        );
                        dropLayer(config);
                    }
                });

            LAYERS.forEach((config, index) =>
                applyDataDefaults(config, data[config.sourceLayer || config.id], index)
            );

            return { data, problems };
        });
}


// ============================================================================
// 3. COLORS
// ============================================================================

// Returns the color for a 0-1 score (see SCORE_SCALE in config.js).
export function scoreColor(score) {

    if (score === null || score === undefined || score === "" || isNaN(score)) {
        return NO_DATA_COLOR;
    }

    return SCORE_SCALE
        .find(step => step.above === null || Number(score) > step.above)
        .color;
}


// ============================================================================
// 4. SYMBOLS
// ============================================================================

// HTML for one colored shape. Used for the map markers here and for the
// legend in js/legend.js, so the two always match.
//
//   cssClass  "point-marker-shape" (map) or
//             "point-legend-symbol" (legend)
export function symbolHtml(cssClass, color, shape, tag = "div") {

    return (
        '<' + tag + ' class="' + cssClass + ' point-shape-' + shape + '" ' +
        'style="--marker-color:' + color + ';">' +
        '</' + tag + '>'
    );
}


// ============================================================================
// 5. POPUPS
// ============================================================================

// Makes property values safe to place inside popup HTML.
function escapeText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// "PARK_TYPE" -> "Park Type",  "schoolName" -> "School Name"
function readableName(key) {
    return key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_]+/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

// Automatic popup: one line per property that has a value.
// Web addresses become clickable links.
function automaticPopup(feature) {

    const properties = feature.properties || {};

    const rows = Object.entries(properties)
        .filter(([key, value]) =>
            value !== null &&
            value !== undefined &&
            value !== "" &&
            typeof value !== "object" &&
            key !== "isTopScore"
        )
        .map(([key, value]) => {

            const text = /^https?:\/\//i.test(String(value))
                ? '<a href="' + escapeText(value) + '" target="_blank" rel="noopener noreferrer">Open link</a>'
                : escapeText(value);

            return "<strong>" + escapeText(readableName(key)) + ":</strong> " + text + "<br>";
        });

    return rows.length
        ? "<div>" + rows.join("") + "</div>"
        : "<strong>No information available</strong>";
}

// Attaches the layer's popup to each feature.
function popupBinder(config) {

    let buildPopup = automaticPopup;

    if (config.popup) {
        buildPopup = createPopupBuilder(config.popup);
    } else if (config.popupText) {
        buildPopup = () => config.popupText;
    }

    return function (feature, layer) {
        layer.bindPopup(buildPopup(feature), { pane: POPUP_PANE });
    };
}


// ============================================================================
// 6. LAYER BUILDERS
//
// Each builder receives a layer's settings (its entry in LAYERS) and its
// GeoJSON data, and returns a Leaflet layer.
// ============================================================================

// ---- "scorePolygons": polygons colored by a 0-1 score ----------------------

function createScorePolygons(config, data) {

    // Flag the highest-scoring polygons so they get their own color.
    // This must happen before the layer is created.
    data.features
        .filter(feature => !isNaN(Number(feature.properties[config.scoreField])))
        .sort((a, b) =>
            Number(b.properties[config.scoreField]) -
            Number(a.properties[config.scoreField])
        )
        .slice(0, TOP_SCORES.count)
        .forEach(feature => {
            feature.properties.isTopScore = true;
        });

    return L.geoJSON(data, {
        pane: config.pane,
        style: feature => ({
            ...config.style,
            fillColor: feature.properties.isTopScore
                ? TOP_SCORES.color
                : scoreColor(feature.properties[config.scoreField])
        }),
        onEachFeature: popupBinder(config)
    });
}

// ---- "outline" and "polygons": one fixed style -----------------------------

function createPolygons(config, data) {

    const bindPopup = popupBinder(config);

    return L.geoJSON(data, {
        pane: config.pane,
        style: config.style,
        onEachFeature: function (feature, layer) {

            bindPopup(feature, layer);

            // Optional name label. It starts invisible; js/labels.js decides
            // where it fits and then fades it in.
            const name = feature.properties && feature.properties[config.labelField];

            if (config.labelField && name) {
                layer.bindTooltip(String(name), {
                    permanent: true,
                    direction: "center",
                    className: "area-label",
                    pane: "labelPane",
                    opacity: 0,
                    interactive: false
                });
            }
        }
    });
}

// ---- "scorePoints": circles colored by a 0-1 score -------------------------

function createScorePoints(config, data) {

    return L.geoJSON(data, {
        pane: config.pane,
        pointToLayer: (feature, latlng) =>
            L.circleMarker(latlng, {
                pane: config.pane,
                ...config.style,
                fillColor: scoreColor(feature.properties[config.scoreField])
            }),
        onEachFeature: popupBinder(config)
    });
}

// ---- "rankedPoints": numbered markers for the top few ----------------------

function createRankedPoints(config, sourceData) {

    // Keep the features that qualify, highest score first, and cut the list
    // to the requested length.
    const topFeatures = sourceData.features
        .filter(config.filter)
        .filter(feature => !isNaN(Number(feature.properties[config.rankField])))
        .sort((a, b) =>
            Number(b.properties[config.rankField]) -
            Number(a.properties[config.rankField])
        )
        .slice(0, config.count);

    let rank = 0;

    return L.geoJSON({ type: "FeatureCollection", features: topFeatures }, {
        pane: config.pane,
        pointToLayer: function (feature, latlng) {

            rank += 1;

            return L.marker(latlng, {
                pane: config.pane,
                icon: L.divIcon({
                    className: "",
                    html:
                        '<div class="ranked-marker">' +
                        '<span class="rank-number" style="color:' + config.color + '">' + rank + '</span>' +
                        '</div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9],
                    popupAnchor: [0, -11]
                })
            });
        },
        onEachFeature: popupBinder(config)
    });
}

// ---- "symbolPoints": one colored shape per point ---------------------------

function createSymbolPoints(config, data) {

    // Every point in a layer looks the same, so one icon is shared by all.
    const icon = L.divIcon({
        className: "point-div-icon",
        html: symbolHtml("point-marker-shape", config.color, config.shape),
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
    });

    return L.geoJSON(data, {
        pane: config.pane,
        pointToLayer: (feature, latlng) =>
            L.marker(latlng, { pane: config.pane, icon: icon }),
        onEachFeature: popupBinder(config)
    });
}

// Which builder handles which layer type.
const BUILDERS = {
    scorePolygons: createScorePolygons,
    outline: createPolygons,
    polygons: createPolygons,
    scorePoints: createScorePoints,
    rankedPoints: createRankedPoints,
    symbolPoints: createSymbolPoints
};


// ============================================================================
// 7. BUILDING ALL LAYERS
// ============================================================================

// Builds every layer in LAYERS.
// Returns them keyed by id:  { parks: <layer>, libraries: <layer>, ... }
export function createLayers(data) {

    const layers = {};

    LAYERS.forEach(config => {

        // Most layers use their own file. "rankedPoints" layers borrow the
        // data of another layer (config.sourceLayer).
        const layerData = data[config.sourceLayer || config.id];

        layers[config.id] = BUILDERS[config.type](config, layerData);

        if (config.hover !== false) {
            addHoverResponse(layers[config.id]);
        }
    });

    return layers;
}


// ============================================================================
// 8. HOVER HIGHLIGHT
//
// Makes each feature react when the mouse moves over it. What "react" means
// depends on how the feature is drawn.
// ============================================================================

function addHoverResponse(layerGroup) {

    layerGroup.eachLayer(function (layer) {

        // ---- Circle markers (score points): grow slightly ------------------
        if (
            typeof layer.setRadius === "function" &&
            typeof layer.getRadius === "function"
        ) {
            const originalRadius = layer.getRadius();
            const originalWeight = layer.options.weight;

            layer.on("mouseover", function () {
                this.setRadius(originalRadius + 2);
                this.setStyle({ weight: originalWeight + 1 });
            });

            layer.on("mouseout", function () {
                this.setRadius(originalRadius);
                this.setStyle({ weight: originalWeight });
            });

            return;
        }

        // ---- Polygons and lines: thicker outline, brought to front ---------
        if (typeof layer.setStyle === "function" && layer.options) {

            const originalWeight = layer.options.weight;
            const originalFillOpacity = layer.options.fillOpacity;

            layer.on("mouseover", function () {

                this.setStyle({
                    weight: Math.max(Number(originalWeight) || 1, 1) + 2,
                    fillOpacity:
                        originalFillOpacity !== undefined
                            ? Math.min(Number(originalFillOpacity), 1)
                            : undefined
                });

                if (this.bringToFront) {
                    this.bringToFront();
                }
            });

            layer.on("mouseout", function () {
                this.setStyle({
                    weight: originalWeight,
                    fillOpacity: originalFillOpacity
                });
            });

            return;
        }

        // ---- Symbol and numbered markers: scale up 15% ---------------------
        if (typeof layer.getElement === "function") {

            layer.on("mouseover", function () {

                const element = this.getElement();

                if (element) {
                    element.style.transformOrigin = "center center";
                    element.style.transform += " scale(1.15)";
                    element.style.transition = "transform 0.12s ease";
                }
            });

            layer.on("mouseout", function () {

                const element = this.getElement();

                if (element) {
                    element.style.transform =
                        element.style.transform.replace(" scale(1.15)", "");
                }
            });
        }
    });
}
