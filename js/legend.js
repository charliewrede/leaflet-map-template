// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  legend.js: THE LEGEND                                  (read this 7th)  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Builds the legend panel (bottom right) from LEGEND in js/config.js.
// The legend is rebuilt every time a layer is switched on or off, and only
// lists the layers that are currently visible.
//
// HOW IT WORKS
// The whole legend is just one long string of HTML [📖 HTML], made by gluing
// small pieces together: a colored square + "Parks" + a line break, and so
// on. Every time a layer is ticked on or off, update() rebuilds the string
// and puts it inside the legend box with innerHTML [📖 innerHTML]. Rebuilding
// from scratch is simpler than editing the old legend, and fast enough.
//
// The symbols are mostly empty <i> or <span> tags [📖 Tag] that CSS turns
// into colored squares, circles and lines (css/styles.css section 6).
//
// CONTENTS
//   1. Symbols ............ small pieces of HTML for each kind of symbol
//   2. One layer's entry .. layerEntry()
//   3. The whole legend ... addLegend()
// ============================================================================

import {
    LAYERS,
    LEGEND,
    LEGEND_TITLE,
    SCORE_SCALE,
    TOP_SCORES
} from "./config.js";

import { symbolHtml } from "./layers.js";
import { groupName, automaticOrder } from "./controls.js";


// Look up a layer's settings by its id.
// .find returns the first matching item, or undefined [📖 Array methods].
const layerConfig = id => LAYERS.find(config => config.id === id);

// The ids of the layers that belong to a group, in LAYERS order.
// filter keeps the group's layers, then map swaps each one for its id.
// In C++ you'd write a loop with an if and a push_back.
const groupLayerIds = group =>
    LAYERS.filter(config => config.group === group).map(config => config.id);


// ============================================================================
// 1. SYMBOLS
//
// Each one is a tiny function that returns a string of HTML
// [📖 Arrow function]. The style="..." part sets CSS right on the tag
// [📖 Inline style], which is how each symbol gets its own color.
// ============================================================================

// Colored square, e.g. one census tract color.
const squareSymbol = color =>
    '<i style="background:' + color + '"></i>';

// Colored circle with an outline, e.g. one school color.
const circleSymbol = (color, style) =>
    '<i class="circle-symbol" style="' +
    'background:' + color + ';' +
    'border:' + style.weight + 'px solid ' + style.color +
    '"></i>';

// Short horizontal line, for boundaries.
const lineSymbol = (color, width) =>
    '<i class="line-symbol" style="' +
    'border-color:' + color + ';' +
    'border-top-width:' + width + 'px' +
    '"></i>';

// Filled, outlined square, for polygon layers such as parks.
const polygonSymbol = style =>
    '<i style="' +
    'background:' + style.fillColor + ';' +
    'border:' + style.weight + 'px solid ' + style.color + ';' +
    'opacity:' + style.fillOpacity + ';' +
    '"></i>';

// White circle holding a letter, for ranked layers.
const letterSymbol = (color, letter) =>
    '<span class="ranked-legend" style="color:' + color + '">' +
    '<span class="legend-letter">' + letter + '</span>' +
    '</span>';

// The score colors from low to high, one per line.
// (SCORE_SCALE is stored high to low, so it is reversed here.)
//
// [...SCORE_SCALE] makes a COPY of the array first [📖 Spread syntax],
// because .reverse() flips an array in place, and we don't want to flip the
// original that the colors are looked up in.
// "symbol" is a function passed in (squareSymbol or circleSymbol), so this one
// function can draw either kind of scale [📖 Function as a value].
const scoreScaleLines = symbol =>
    [...SCORE_SCALE]
        .reverse()
        .map(step => symbol(step.color) + step.label + '<br>')
        .join("");


// ============================================================================
// 2. ONE LAYER'S ENTRY
// ============================================================================

// Returns the legend HTML for one layer.
//
//   placement  "line"      an ordinary line                     (default)
//              "ownLine"   wrapped in its own block
//              "indented"  indented under a group sub-heading
//
// placement = "line" is a default parameter [📖 Default parameter].
function layerEntry(config, placement = "line") {

    const label = config.legendLabel || config.label;

    // A different picture for each layer type. Every case "return"s, so no
    // "break" is needed.
    switch (config.type) {

        // Caption, colored squares, then the "highest scores" color
        case "scorePolygons":
            return (
                config.legendCaption + '<br>' +
                scoreScaleLines(squareSymbol) +
                (TOP_SCORES.count > 0
                    ? squareSymbol(TOP_SCORES.color) + TOP_SCORES.label + '<br>'
                    : '')
            );

        // Caption, then colored circles
        // color => circleSymbol(...) makes a one-argument version of
        // circleSymbol, so scoreScaleLines can call it with just a color.
        case "scorePoints":
            return (
                config.legendCaption + '<br>' +
                scoreScaleLines(color => circleSymbol(color, config.style))
            );

        case "rankedPoints":
            return letterSymbol(config.color, config.legendLetter) + label + '<br>';

        case "outline":
            return lineSymbol(config.style.color, config.legendLineWidth) + label + '<br>';

        case "polygons":
            return polygonSymbol(config.style) + label + '<br>';

        // The { } after the case gives it its own scope, so "const content"
        // can be declared inside it. Same rule as C++.
        case "symbolPoints": {

            const content =
                symbolHtml("point-legend-symbol", config.color, config.shape, "span") +
                label;

            if (placement === "indented") {
                return '<div style="padding-left:14px;">' + content + '</div>';
            }

            if (placement === "ownLine") {
                return '<div style="clear:both; display:flow-root;">' + content + '</div>';
            }

            return content + '<br>';
        }
    }
}


// ============================================================================
// 3. THE WHOLE LEGEND
// ============================================================================

// Adds the (empty) legend panel to the map.
//
// Returns:
//   container   the panel's HTML element
//   update      function that rebuilds the legend's contents
//
// itemHtml and update are functions defined INSIDE addLegend. They can use
// addLegend's variables (map, layers, container) even after addLegend has
// finished running. That's a closure [📖 Closure]. It's how update() still
// knows which box to fill when main.js calls it much later.
export function addLegend(map, layers) {

    const legend = L.control({ position: "bottomright" });

    // A one-line onAdd: create an empty <div> with classes "info" and
    // "legend" [📖 Class (CSS)] and hand it to Leaflet.
    legend.onAdd = () => L.DomUtil.create("div", "info legend");
    legend.addTo(map);

    const container = legend.getContainer();

    // Scrolling inside the legend should not zoom the map
    // [📖 Event propagation]
    L.DomEvent.disableScrollPropagation(container);

    // Is this layer switched on right now?
    const isVisible = id => map.hasLayer(layers[id]);

    // HTML for one item of a legend section (see LEGEND in config.js).
    function itemHtml(item) {

        // ---- A group: sub-heading, then its visible layers indented --------
        if (item.group) {

            const visibleIds = groupLayerIds(item.group).filter(isVisible);

            if (visibleIds.length === 0) {
                return "";
            }

            return (
                '<div style="' +
                'font-weight:bold;' +
                'margin-top:6px;' +
                'margin-bottom:2px;' +
                'padding-left:4px;' +
                '">' +
                groupName(item.group) +
                '</div>' +
                visibleIds
                    .map(id => layerEntry(layerConfig(id), "indented"))
                    .join("")
            );
        }

        // ---- A single layer -------------------------------------------------
        // An item is either a plain id string ("parks") or an object
        // ({ layer: "parks", ownLine: true }). This line handles both:
        // a string has no .layer, so it falls back to the item itself
        // [📖 Truthy and falsy].
        const id = item.layer || item;

        if (!isVisible(id)) {
            return "";
        }

        return layerEntry(layerConfig(id), item.ownLine ? "ownLine" : "line");
    }

    function update() {

        // Use the sections from config.js, or one automatic section.
        const sections = LEGEND || [
            { title: LEGEND_TITLE, items: automaticOrder() }
        ];

        // Build every section's HTML, then put it all in the box at once.
        container.innerHTML = sections
            .map(section => {

                const body = section.items.map(itemHtml).join("");

                // A section with nothing visible is left out completely
                if (body === "") {
                    return "";
                }

                return (
                    '<div class="legend-section">' + section.title + '</div>' +
                    body
                );
            })
            .join("");
    }

    // Hand back both the box and the update function, bundled in one object
    // [📖 Object].
    return { container, update };
}
