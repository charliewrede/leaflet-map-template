// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  config.js: YOUR MAP'S SETTINGS                         (read this 2nd)  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Everything specific to YOUR map lives in this file. The other files in js/
// are the "engine": they read this file and build the map from it, and you
// should not need to change them.
//
// This file contains almost no logic. It's mostly DATA: lists and settings.
// That makes it the perfect first JavaScript file to read. If you can read
// this one, you know the building blocks every other file uses.
//
// ----------------------------------------------------------------------------
// JAVASCRIPT CRASH COURSE (using this file as the example)
//
//   // a comment              Same as C++. /* ... */ also works.
//
//   const NAME = value;       A variable that can't be reassigned, like
//                             `const auto` in C++. [📖 const and let]
//                             JavaScript has no type names: the type comes
//                             from the value. [📖 Dynamic typing]
//
//   "text"                    A string. 'text' (single quotes) is the same.
//
//   [a, b, c]                 An ARRAY: an ordered list, like std::vector,
//                             but it can mix types. [📖 Array]
//
//   { key: value, ... }       An OBJECT: a bundle of named values, like a
//                             C++ struct you can create on the spot.
//                             Read a value with  obj.key  [📖 Object]
//
//   null                      "Deliberately nothing", similar to nullptr.
//                             [📖 null and undefined]
//
//   export                    Lets other files import this value.
//                             [📖 Module]
//
// You'll see the 📖 tags all through the code. Each one is a word explained
// in GLOSSARY.md (in the project's main folder).
// ----------------------------------------------------------------------------
//
// QUICK START: ADD A LAYER IN TWO STEPS
//
//   1. Put the .geojson file in the Data folder.
//   2. Add one line to LAYERS (section 5):
//
//          { file: "Parks.geojson" },
//
//   Refresh the page. The engine works out the rest:
//     - points, lines or polygons?  -> read from the file
//     - name in the layer list       -> made from the file name ("Parks")
//     - color and point shape        -> picked automatically
//     - popup                        -> lists every property of the feature
//     - layer list and legend entry  -> added automatically
//
//   Add more settings only when you want to override one of those.
// ----------------------------------------------------------------------------
//
// CONTENTS
//   1. Map settings ........ title, starting view, basemap
//   2. Address search ...... Geoapify key and search area
//   3. Score color scale ... the yellow-to-red ramp for "score" layers
//   4. Popups .............. custom popups (optional)
//   5. Layers .............. one entry per layer on the map
//   6. Layer groups ........ display names for groups (optional)
//   7. Layer control order . arrangement of the checkbox list (optional)
//   8. Legend order ........ arrangement of the legend (optional)
//   9. Advanced ............ drawing order (panes)
// ============================================================================

// IMPORT: borrow these helper functions from popups.js so the POPUPS section
// below can use them. Like #include, except you name exactly which pieces you
// want. [📖 Module]
// (Some of these aren't used yet. They're imported so they're ready when you
// write your own popups.)
import {
    field,
    address,
    link,
    decimals,
    percent,
    shareAsPercent,
    thousands,
    titleCase,
    replaceValues,
    ensureHttps
} from "./popups.js";


// ============================================================================
// 1. MAP SETTINGS
// ============================================================================

// The folder the data files live in. "export" makes it visible to the files
// that import it (layers.js does). [📖 Module]
export const DATA_FOLDER = "Data/";

// MAP is an OBJECT [📖 Object]: several named settings bundled together.
// Other files read them with a dot, e.g.  MAP.zoom  or  MAP.basemap.url
// In C++ terms it's like an instance of a struct with these fields:
//     struct MapSettings { std::string title; double center[2]; int zoom; ... };
export const MAP = {

    // Shown in the browser tab.
    title: "My Map",

    // Where the map starts before the data has loaded: [latitude, longitude].
    // An ARRAY [📖 Array] of two numbers. Here: downtown Denver.
    // (Find any place's numbers by right-clicking it in Google Maps.)
    center: [39.7392, -104.9903],

    // Zoom level [📖 Zoom level]: 1 shows the whole world, 18 shows single houses.
    zoom: 11,

    // Once loaded, the map zooms to fit this layer (use its id).
    // Leave it as null [📖 null and undefined] to fit everything that is
    // switched on.
    fitToLayer: null,

    // The background map pictures [📖 Basemap]. An object INSIDE an object.
    // {s}, {z}, {x}, {y} are blanks that Leaflet fills in for every tile
    // [📖 Tile] it downloads.
    basemap: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        // The credit line in the bottom-right corner. "&copy;" is HTML code
        // for the © symbol [📖 HTML entity].
        attribution: "&copy; OpenStreetMap contributors"
    },

    // Popups [📖 Popup] never get wider than this many pixels.
    popupMaxWidth: 350
};


// ============================================================================
// 2. ADDRESS SEARCH
//
// Uses Geoapify (free key at https://myprojects.geoapify.com), a geocoding
// service [📖 Geocoding]: you send it text like "1600 Pennsylvania Ave", and
// it sends back matching addresses with their coordinates.
//
// Set apiKey to "" to remove the search box.
// ============================================================================

export const SEARCH = {

    // Your password-like ID for Geoapify [📖 API key]. Anyone can see it in
    // a public website's code, so in the Geoapify dashboard, limit it to your
    // website's address.
    apiKey: "b6a94e57cd704f0183f26b5b58ad5d78",

    // The grey hint text shown in the empty search box.
    placeholder: "Search address...",

    // Only addresses inside this box are offered: [south, west], [north, east].
    // An array of two arrays: the box's bottom-left and top-right corners.
    // Set to null to allow any address. Results are always nudged toward
    // MAP.center.
    bounds: [
        [39.45, -105.35],
        [40.10, -104.55]
    ],

    outsideBoundsMessage: "Please select an address inside the map area.",

    // How many suggestions to show at most.
    maxResults: 6,

    // Wait this long after the last keystroke before searching (milliseconds).
    // Waiting avoids sending a request for every single letter typed.
    // [📖 Debounce]
    typingDelay: 250,

    // Zoom level used when jumping to a chosen address.
    resultZoom: 16
};


// ============================================================================
// 3. SCORE COLOR SCALE
//
// Used by the "scorePolygons" and "scorePoints" layer types (section 5),
// which color each feature by a 0-1 number in one of its properties.
// A score takes the color of the first step whose "above" value it exceeds,
// checking from the top down.
//
// Example: a score of 0.65 isn't above 0.8, but IS above 0.6, so it gets
// "#F53D00" (Moderate - High).
//
// This is an ARRAY of OBJECTS [📖 Array] [📖 Object], like a
// std::vector<Step> where Step is a struct { double above; string color;
// string label; }.
//
// Colors are written as hex codes [📖 Hex color]: "#RRGGBB", where each pair
// is how much red, green and blue (00 = none, FF = full).
// ============================================================================

export const SCORE_SCALE = [
    { above: 0.8, color: "#F50000", label: "High" },
    { above: 0.6, color: "#F53D00", label: "Moderate - High" },
    { above: 0.4, color: "#F57A00", label: "Moderate" },
    { above: 0.2, color: "#F5B800", label: "Low - Moderate" },
    { above: null, color: "#F5F500", label: "Low" }
];

// Used when a score is missing or is not a number.
export const NO_DATA_COLOR = "#808080";

// In a "scorePolygons" layer, the highest-scoring few get their own color.
// Set count to 0 to turn this off.
export const TOP_SCORES = {
    count: 5,
    color: "#A80000",
    label: "Five Highest Scores"
};


// ============================================================================
// 4. POPUPS (optional)
//
// A popup [📖 Popup] is the little window that opens when you click
// something on the map.
//
// A layer WITHOUT a popup setting gets an automatic popup listing all of its
// properties [📖 GeoJSON]. Write one here only when you want nicer labels,
// fewer rows, or formatted numbers. Each popup is a list of rows, shown top
// to bottom; a row is skipped when the feature has no value for it.
//
//   field("Label", "PROPERTY")                       Label: value
//   field("Size", "ACRES", { format: decimals(1),    Size: 12.3 acres
//                            suffix: " acres" })
//   address(["STREET", "CITY", "STATE", "ZIP"])      Address: 1 Main St, ...
//   link("WEBSITE", "Visit website")                 Website: Visit website
//
// field(), address() and link() are FUNCTIONS imported from popups.js. They
// don't build anything yet. They just return a small object describing the
// row, and popups.js turns those descriptions into text later.
//
// Formatters: decimals(n), percent, shareAsPercent, thousands, titleCase,
// replaceValues({...}), ensureHttps. See js/popups.js for details.
//
// HOW TO FIND PROPERTY NAMES: open your .geojson file in VS Code and look
// inside any "properties": { ... } block, or drag the file onto geojson.io.
// ============================================================================

export const POPUPS = {

    // One popup design named "examplePlace". It's used by the
    // "Example Places" layer below as  popup: POPUPS.examplePlace
    examplePlace: [
        field("Place", "name"),
        field("Category", "category"),

        // The third argument is an object of extra options:
        //   show: "defined"   -> show the row even when the value is 0
        //   format: thousands -> 1200000 becomes "1,200,000"
        // Note: "thousands" is passed WITHOUT () because we're handing over
        // the function itself for popups.js to call later
        // [📖 Function as a value].
        field("Visitors per Year", "visitors", { show: "defined", format: thousands })
    ]
};


// ============================================================================
// 5. LAYERS
//
// A layer [📖 Layer] is one set of things drawn on the map, usually one
// GeoJSON file, e.g. "all the parks". Each one gets a checkbox in the layer
// list.
//
// One entry per layer. Only "file" is required. Layers listed here appear
// in this order in the layer list and the legend.
//
// COMMON SETTINGS
//   file        GeoJSON file in the Data folder
//   label       name in the layer list and legend  (default: from file name)
//   visible     false = start switched off          (default: true)
//   color       main color                          (default: automatic)
//   shape       point shape: circle, square, diamond, triangle, star,
//               hexagon, cross, drop, book          (default: automatic)
//   group       put the layer in a collapsible group, e.g. "Food Access"
//   popup       a popup from section 4, e.g. POPUPS.examplePlace
//   popupText   fixed popup text instead, e.g. "<strong>Boundary</strong>"
//   labelField  property holding a name to write inside each polygon
//               (shown from zoom 13; fitted so labels never overlap)
//
// LAYER TYPES (set "type" only to override the automatic choice)
//   "symbolPoints"   one colored shape per point          (default: points)
//   "polygons"       filled polygons in one style         (default: polygons)
//   "outline"        outlines / lines only                (default: lines)
//   "scorePolygons"  polygons colored by a 0-1 score  -> needs scoreField
//   "scorePoints"    circles colored by a 0-1 score   -> needs scoreField
//   "rankedPoints"   numbered markers for the top few -> needs sourceLayer
//                    and rankField (see the commented example below)
//
// EXTRA SETTINGS
//   id              short name used by fitToLayer, sourceLayer and the
//                   optional orders in sections 7-8  (default: file name)
//   style           Leaflet drawing options, e.g. { weight: 3, fillOpacity: 0.4 }
//   scoreField      property holding the 0-1 score (score types)
//   legendCaption   heading above the color scale (score types)
//   legendLabel     legend text, when it should differ from "label"
//   legendLineWidth line thickness in the legend (outline type)
//   hover           false = no highlight when the mouse is over it
//   pane            drawing layer from section 9 (default: by type)
//
// WHY YOU CAN LEAVE SETTINGS OUT: in JavaScript, reading a key an object
// doesn't have gives "undefined" instead of an error [📖 null and undefined].
// layers.js checks for that and fills in a default.
//
// Watch the commas: every entry in a list needs a comma after it (a trailing
// comma after the last one is fine). A missing comma is the #1 reason a map
// suddenly shows nothing. Open the browser console to see the error
// [📖 Console].
// ============================================================================

export const LAYERS = [

    // An outline layer with a name written inside each area
    {
        file: "example-areas.geojson",
        label: "Example Areas",
        type: "outline",
        labelField: "name"
    },

    // A point layer with a custom popup (everything else automatic)
    {
        file: "example-places.geojson",
        label: "Example Places",
        popup: POPUPS.examplePlace
    }

    // ---- More examples (remove the // to use) -------------------------------
    //
    // Simplest possible layer:
    // { file: "Libraries.geojson" },
    //
    // Points with a chosen look, inside a collapsible group:
    // { file: "Grocery_Stores.geojson", color: "#7CB342", shape: "diamond", group: "Food Access" },
    //
    // Polygons colored by a 0-1 score:
    // { id: "tracts", file: "Census_Tracts.geojson", type: "scorePolygons",
    //   scoreField: "SVI", legendCaption: "Social Vulnerability Index (SVI) Score" },
    //
    // Numbered markers for the 5 highest-scoring points of another layer:
    // { id: "schools", file: "Schools.geojson", type: "scorePoints", scoreField: "SRI_score" },
    // { label: "Top 5 Schools", type: "rankedPoints", sourceLayer: "schools",
    //   rankField: "SRI_score", count: 5, legendLetter: "T", color: "#000000" },
];


// ============================================================================
// 6. LAYER GROUPS (optional)
//
// A layer joins a group with its "group" setting. The group's name in the
// layer list is the group setting itself, unless you give it a different
// display name here:   { foodAccess: "Food Access" }
//
// {} is an empty object: no renames yet.
// ============================================================================

export const GROUPS = {};


// ============================================================================
// 7. LAYER CONTROL ORDER (optional)
//
// The "layer control" [📖 Control] is the checkbox list in the top-left
// corner.
//
// null = same order as LAYERS, with each group placed where its first layer
// appears. To arrange it yourself, list layer ids and { group: ... } entries:
//
//     ["tracts", "schools", { group: "Food Access" }]
// ============================================================================

export const LAYER_CONTROL_ORDER = null;


// ============================================================================
// 8. LEGEND ORDER (optional)
//
// null = one section, in the same order as the layer list. To arrange it
// yourself, give a list of titled sections. A section, and each line in it,
// appears only while the matching layer is switched on.
//
//     [
//         { title: "Census Tracts", items: ["tracts"] },
//         { title: "Resources", items: [
//             "libraries",                       one line for a layer
//             { layer: "parks", ownLine: true }, same, in its own block
//             { group: "Food Access" }           sub-heading + its layers
//         ] }
//     ]
// ============================================================================

// The heading of the automatic legend.
export const LEGEND_TITLE = "Map Layers";

export const LEGEND = null;


// ============================================================================
// 9. ADVANCED: DRAWING ORDER (PANES)
//
// A pane [📖 Pane] is a see-through sheet that layers are drawn on. The
// sheets are stacked, and a higher zIndex [📖 z-index] is drawn on top.
// That's why points always sit above areas, and popups above everything.
//
// Each layer type has a default pane (see DEFAULT_PANES in js/layers.js);
// set a layer's "pane" to move it.
//
// clickThrough: true means mouse clicks pass straight through this sheet to
// whatever is underneath. The labels use it so they never block a click.
// ============================================================================

export const PANES = [
    { name: "scorePane",    zIndex: 300 },
    { name: "outlinePane",  zIndex: 500 },
    { name: "polygonPane",  zIndex: 600 },
    { name: "boundaryPane", zIndex: 700 },
    { name: "pointPane",    zIndex: 800 },
    { name: "labelPane",    zIndex: 900, clickThrough: true },
    { name: "rankedPane",   zIndex: 1000 },
    { name: "popupTopPane", zIndex: 1200 }
];

// Every popup opens in this pane so that it sits above all map layers.
export const POPUP_PANE = "popupTopPane";
