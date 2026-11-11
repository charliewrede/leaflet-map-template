// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  layers.js: LOADS THE DATA AND DRAWS THE LAYERS         (read this 4th)  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Loads the GeoJSON files [📖 GeoJSON] and turns every entry of LAYERS
// (js/config.js) into a Leaflet layer [📖 Layer]. Any setting a layer leaves
// out is filled in here. This is the "automatic" part of the template.
//
// THE BIG PICTURE, IN 3 STAGES
//   1. prepareLayers()   before downloading: give every layer an id + label
//   2. loadLayerData()   download every file at the same time, then fill in
//                        the settings that depend on the data (type, color)
//   3. createLayers()    turn each file into shapes Leaflet can draw
//
// NEW JAVASCRIPT YOU'LL MEET IN THIS FILE (all explained in GLOSSARY.md)
//   condition ? a : b      pick a or b          [📖 Ternary operator]
//   a || b                 "a, or b if a is empty" [📖 Truthy and falsy]
//   { ...obj, key: v }     copy an object, then change one key [📖 Spread syntax]
//   /pattern/g             a text-search pattern [📖 Regular expression]
//   fetch(url)             download a file      [📖 fetch]
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
// (No "export" here, so these are private to this file, like "static" globals
// in a C++ .cpp file [📖 Module].)
const AUTO_COLORS = [
    "#1F78B4", "#E31A1C", "#33A02C", "#FF7F00", "#6A3D9A",
    "#00A6A6", "#C51B7D", "#B15928", "#7570B3", "#D95F02"
];

const AUTO_SHAPES = [
    "circle", "square", "diamond", "triangle", "star", "hexagon", "cross", "drop"
];

// Older type names still work. An object used as a lookup table, like
// std::map<string, string>: TYPE_ALIASES["riskPoints"] gives "scorePoints".
const TYPE_ALIASES = {
    riskPolygons: "scorePolygons",
    riskPoints: "scorePoints"
};

// Where each type is drawn (see PANES in config.js) [📖 Pane].
const DEFAULT_PANES = {
    scorePolygons: "scorePane",
    outline: "outlinePane",
    polygons: "polygonPane",
    scorePoints: "pointPane",
    symbolPoints: "pointPane",
    rankedPoints: "rankedPane"
};

// "Grocery_Stores.geojson" -> "Grocery Stores"
//
// Each .replace(pattern, replacement) returns a NEW string with matches
// swapped out (strings can't be changed in place in JavaScript). The patterns
// between slashes are regular expressions [📖 Regular expression]:
//   /\?.*$/          a "?" and everything after it ("file.geojson?v=2")
//   /\.(geo)?json$/i ".geojson" or ".json" at the end, any capitals
//   /[-_]+/g         every run of dashes/underscores -> a space
//   /\b\w/g          the first letter of each word, so it can be capitalized
// The last .replace takes a FUNCTION instead of text: it's called for every
// match and returns the replacement [📖 Function as a value].
function labelFromFile(file) {
    return file
        .replace(/\?.*$/, "")
        .replace(/\.(geo)?json$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

// "Grocery_Stores.geojson" -> "groceryStores"   (a "camelCase" id)
//
// Step by step: make the label ("Grocery Stores"), remove anything that isn't
// a letter, digit or space, split it into words [📖 Array methods], drop empty
// words, then lowercase the first word and capitalize the rest, and glue them
// back together.
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
//
// Note that this CHANGES the objects inside LAYERS directly. Objects in
// JavaScript are shared, not copied [📖 Reference], a bit like every
// variable being a pointer. So every other file that reads LAYERS sees these
// filled-in values too.
export function prepareLayers() {

    // forEach can also hand over each item's position (index), here used to
    // number layers that have no file name.
    LAYERS.forEach((config, index) => {

        // "!config.id" is true when id is missing or empty
        // [📖 Truthy and falsy].
        if (!config.id) {
            // The ternary operator: condition ? valueIfTrue : valueIfFalse
            // [📖 Ternary operator]. Same as in C++.
            config.id = config.file ? idFromFile(config.file) : "layer" + (index + 1);
        }

        if (!config.label) {
            config.label = config.file ? labelFromFile(config.file) : config.id;
        }

        // Only "undefined" (left out entirely) becomes true. An explicit
        // "visible: false" is kept [📖 null and undefined].
        if (config.visible === undefined) {
            config.visible = true;
        }

        if (TYPE_ALIASES[config.type]) {
            config.type = TYPE_ALIASES[config.type];
        }
    });
}

// What kind of shapes does this file hold? Reads the first feature
// [📖 GeoJSON].
function geometryKind(data) {

    // "data.features || []" means: use data.features, or an empty list if it's
    // missing [📖 Truthy and falsy]. .find returns the first item that passes
    // the test, or undefined if none does [📖 Array methods].
    const feature = (data.features || []).find(f => f && f.geometry);
    const type = feature ? feature.geometry.type : "";

    // .includes checks whether one string contains another, so "Point" also
    // matches "MultiPoint".
    if (type.includes("Point")) return "point";
    if (type.includes("LineString")) return "line";
    return "polygon";
}

// Fills in the settings that depend on the data: type, color, shape, style.
//
//   config  one entry from LAYERS
//   data    that layer's GeoJSON
//   index   its position in LAYERS (used to pick the next automatic color)
function applyDataDefaults(config, data, index) {

    // % is remainder, like C++. After the 10th color it wraps back to the 1st.
    const autoColor = AUTO_COLORS[index % AUTO_COLORS.length];

    if (!config.type) {
        // A neat trick: build an object on the spot and immediately look up
        // one key in it. Reads like a mini switch statement.
        config.type = {
            point: "symbolPoints",
            line: "outline",
            polygon: "polygons"
        }[geometryKind(data)];
    }

    // Keep the pane the user chose, or else use the default for this type.
    config.pane = config.pane || DEFAULT_PANES[config.type];

    // switch works just like C++, except it can compare strings.
    switch (config.type) {

        case "symbolPoints":
            config.color = config.color || autoColor;
            config.shape = config.shape || AUTO_SHAPES[index % AUTO_SHAPES.length];
            break;

        case "polygons":
            config.color = config.color || autoColor;

            // Build the drawing style. "...config.style" copies in whatever
            // style settings the user wrote [📖 Spread syntax]. Because it
            // comes LAST, the user's values replace the defaults above it.
            // (Spreading undefined is allowed and simply adds nothing.)
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

            // Default filter: a function that says "yes" to every feature.
            config.filter = config.filter || (() => true);
            config.legendLetter = config.legendLetter || config.label.charAt(0).toUpperCase();
            break;
    }
}


// ============================================================================
// 2. LOADING THE DATA
// ============================================================================

// Downloads one GeoJSON file from the Data folder.
//
// fetch() [📖 fetch] asks the web server for a file and immediately returns a
// promise [📖 Promise]. .then() runs once the server answers.
// "return" passes the promise back, so whoever called loadGeoJSON can attach
// their own .then() to get the finished data.
function loadGeoJSON(file) {

    return fetch(DATA_FOLDER + file).then(response => {

        // response.ok is false for errors like 404 ("not found").
        if (!response.ok) {
            // "throw" works like C++: it stops here and jumps to the nearest
            // .catch() (or try/catch).
            throw new Error(
                response.status === 404
                    ? "file not found in the Data folder"
                    : "server answered " + response.status
            );
        }

        // Turn the file's text into JavaScript objects and arrays
        // [📖 JSON]. This is ALSO a promise, because reading a big file takes
        // time. If the text isn't valid JSON, .catch() replaces the
        // confusing built-in error with a clear one.
        return response.json().catch(() => {
            throw new Error("not valid GeoJSON");
        });
    });
}

// Removes a layer from LAYERS, so the rest of the map carries on without it.
// indexOf finds its position; splice(position, 1) removes 1 item there, like
// vector.erase() in C++.
function dropLayer(config) {
    LAYERS.splice(LAYERS.indexOf(config), 1);
}

// Downloads every file named in LAYERS, all at the same time.
//
// Returns (as a promise):
//   data      the GeoJSON keyed by layer id:  { parks: {...}, ... }
//   problems  one message per layer that could not be used
//
// A layer whose file fails is left off the map; the others still load.
export function loadLayerData() {

    // Only layers with a file to download (ranked layers borrow another's).
    const layersWithFiles = LAYERS.filter(config => config.file);

    // .map turns the list of layers into a list of download promises, one per
    // file, all started at once [📖 Array methods].
    // Promise.allSettled waits until EVERY download has either succeeded or
    // failed, then hands over one result per file, in the same order
    // [📖 Promise].
    return Promise
        .allSettled(layersWithFiles.map(config => loadGeoJSON(config.file)))
        .then(results => {

            const data = {};
            const problems = [];

            results.forEach((result, index) => {

                const config = layersWithFiles[index];

                // Success: store the GeoJSON under the layer's id, then
                // "return" skips to the next result (like "continue" in a
                // C++ loop).
                if (result.status === "fulfilled") {
                    data[config.id] = result.value;
                    return;
                }

                // Failure: note why, and take the layer off the list.
                // .push adds to the end of an array, like push_back.
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

            // Now that the data is here, fill in the data-dependent defaults.
            LAYERS.forEach((config, index) =>
                applyDataDefaults(config, data[config.sourceLayer || config.id], index)
            );

            // { data, problems } is shorthand for { data: data, problems: problems }
            // [📖 Object].
            return { data, problems };
        });
}


// ============================================================================
// 3. COLORS
// ============================================================================

// Returns the color for a 0-1 score (see SCORE_SCALE in config.js).
// "export" so legend.js could use it too [📖 Module].
export function scoreColor(score) {

    // isNaN = "is Not a Number" [📖 NaN]. Catches text like "N/A".
    if (score === null || score === undefined || score === "" || isNaN(score)) {
        return NO_DATA_COLOR;
    }

    // Walk down the scale and return the color of the first step the score is
    // above. The last step has above: null, so it catches everything left.
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
//   color     fill color
//   shape     "star", "diamond", ... (css/styles.css section 7 draws them)
//   tag       which HTML tag to use. tag = "div" is a DEFAULT PARAMETER
//             [📖 Default parameter], same idea as in C++.
//
// The result is a string of HTML [📖 HTML] such as:
//   <div class="point-marker-shape point-shape-star" style="--marker-color:#E31A1C;"></div>
// "--marker-color" is a CSS variable [📖 CSS variable]: the CSS reads it to
// know which color to paint.
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

// Makes property values safe to place inside popup HTML [📖 Escaping].
// Without this, a value containing "<script>" would be run as code.
// String(value) converts numbers etc. to text first.
function escapeText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// "PARK_TYPE" -> "Park Type",  "schoolName" -> "School Name"
// ([a-z])([A-Z]) finds a lowercase letter followed by a capital, and "$1 $2"
// puts a space between them [📖 Regular expression].
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

    // Object.entries turns { name: "Union Station", category: "Transit" }
    // into [["name", "Union Station"], ["category", "Transit"]], a list of
    // [key, value] pairs we can filter and map [📖 Array methods].
    // ([key, value]) => ... unpacks each pair [📖 Destructuring].
    const rows = Object.entries(properties)
        .filter(([key, value]) =>
            value !== null &&
            value !== undefined &&
            value !== "" &&
            // typeof tells you a value's type as a string [📖 typeof].
            // Skip nested objects/lists; they don't display nicely.
            typeof value !== "object" &&
            key !== "isTopScore"
        )
        .map(([key, value]) => {

            // .test() asks "does this text match the pattern?". Here: does
            // it start with http:// or https:// ?
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
//
// This is a function that RETURNS a function [📖 Function as a value].
// The returned function remembers "buildPopup" even after popupBinder has
// finished. That memory is called a closure [📖 Closure]. Leaflet calls the
// returned function once for every feature in the file.
function popupBinder(config) {

    // Start with the automatic popup...
    let buildPopup = automaticPopup;

    // ...and swap it for the custom one if the layer has one.
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
//
// They all use L.geoJSON(data, options), Leaflet's tool that draws a
// GeoJSON file. The options object can include three hooks [📖 Callback]
// that Leaflet calls for EACH feature:
//   style(feature)                  -> colors/line widths for a line or area
//   pointToLayer(feature, latlng)   -> what to draw for a point
//   onEachFeature(feature, layer)   -> anything extra, e.g. attach a popup
// ============================================================================

// ---- "scorePolygons": polygons colored by a 0-1 score ----------------------

function createScorePolygons(config, data) {

    // Flag the highest-scoring polygons so they get their own color.
    // This must happen before the layer is created.
    //
    // Read this chain top to bottom [📖 Method chaining]:
    //   keep features with a numeric score -> sort highest first ->
    //   take the first TOP_SCORES.count -> mark each one.
    // The sort function returns (b - a): a positive result puts b first, so
    // bigger scores come first [📖 Array methods].
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

        // Called once per polygon. Returns its style: the layer's style, but
        // with this polygon's own fill color [📖 Spread syntax].
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
            //
            // "a && b" gives b only if a exists, else a. A safe way to read
            // a value that might not exist [📖 Truthy and falsy].
            const name = feature.properties && feature.properties[config.labelField];

            if (config.labelField && name) {

                // A tooltip [📖 Tooltip] is a small text box attached to a
                // shape. "permanent: true" keeps it always showing, which
                // turns it into a label.
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

        // Draw each point as a circle [📖 Marker] colored by its score.
        // latlng is the point's position [📖 LatLng].
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

    // A counter that pointToLayer below can change, because it's in the
    // surrounding function [📖 Closure].
    let rank = 0;

    // Wrap the chosen features back into GeoJSON's FeatureCollection shape
    // so L.geoJSON can draw them.
    return L.geoJSON({ type: "FeatureCollection", features: topFeatures }, {
        pane: config.pane,
        pointToLayer: function (feature, latlng) {

            rank += 1;

            // A divIcon [📖 Marker] is a marker drawn with HTML and CSS
            // instead of a picture: here, a circle with the rank number inside.
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
    // iconSize is the box size in pixels; iconAnchor is which pixel sits
    // exactly on the location (the middle, so the shape is centered).
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
// The values are the FUNCTIONS themselves, not results (no parentheses), so
// BUILDERS["polygons"] IS createPolygons, and can be called later
// [📖 Function as a value]. Like a std::map from strings to function
// pointers in C++.
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

        // Look up the right builder for this type and call it in one go.
        layers[config.id] = BUILDERS[config.type](config, layerData);

        // !== means "not equal" [📖 Strict equality]. So: unless hover was
        // explicitly turned off...
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
//
// Instead of asking "which class is this shape?", the code checks which
// METHODS it has: if it has setRadius, it's a circle; if it has setStyle,
// it's a line or area; and so on. This is called "duck typing": if it quacks
// like a duck, treat it as a duck. [📖 Dynamic typing]
// ============================================================================

function addHoverResponse(layerGroup) {

    // eachLayer is Leaflet's forEach: it runs the function for every shape in
    // the layer.
    layerGroup.eachLayer(function (layer) {

        // ---- Circle markers (score points): grow slightly ------------------
        // typeof x === "function" checks that the method exists [📖 typeof].
        if (
            typeof layer.setRadius === "function" &&
            typeof layer.getRadius === "function"
        ) {
            // Remember the original size, so mouseout can restore it
            // [📖 Closure].
            const originalRadius = layer.getRadius();
            const originalWeight = layer.options.weight;

            // "this" [📖 this] is the shape the mouse is over.
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

                // Draw it above its neighbors so the thick outline isn't hidden.
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
        // These are HTML elements [📖 DOM], so they're enlarged with CSS's
        // "transform: scale()" [📖 Inline style].
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
