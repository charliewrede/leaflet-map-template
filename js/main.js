// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  main.js: THE STARTING POINT                            (read this 3rd)  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// This is the closest thing to int main() in C++. index.html loads this file,
// and the code runs from top to bottom. It contains no details of its own: it
// calls functions from the other files, in order, to build the map.
//
//   config.js ..... what is on this map (layers, colors, popups, legend)
//   layers.js ..... loads the data and draws the layers
//   popups.js ..... builds popup text
//   labels.js ..... places the area name labels
//   controls.js ... layer checkbox list and the show / hide switches
//   legend.js ..... the legend
//   search.js ..... the address search box
//
// STEPS
//   1. Create the map and basemap
//   2. Add the address search box
//   3. Create the panes (drawing order)
//   4. Load the data, then:
//        a. build the layers
//        b. set up area name labels
//        c. show the starting layers and zoom to the data
//        d. add the layer control, the legend and their switches
//        e. keep the legend up to date
//
// ONE BIG DIFFERENCE FROM C++: WAITING
// A C++ program runs straight through. A web page often has to WAIT: for a
// file to download, for the user to click, for a timer. JavaScript never
// stops and waits. Instead you hand it a function and say "call this when
// it's ready". That function is called a callback [📖 Callback]. You'll see
// that pattern three ways in this file:
//     - .then(function)          "when the download finishes"  [📖 Promise]
//     - map.on("event", function) "whenever this happens"      [📖 Event]
//     - setTimeout(function, ms)  "after this many milliseconds"
//
// "L" is the Leaflet library [📖 Leaflet]. index.html loaded it before this
// file, and every Leaflet tool hangs off it: L.map, L.tileLayer, L.control...
// [📖 Global variable]
// ============================================================================

// Pull in the settings and the functions this file needs from the others
// [📖 Module]. The { } list names exactly which exported pieces to bring in.
import { MAP, PANES, LAYERS } from "./config.js";

import { prepareLayers, loadLayerData, createLayers } from "./layers.js";
import { setUpAreaLabels } from "./labels.js";
import { addLayerControl, addPanelSwitch, positionPanelSwitches } from "./controls.js";
import { addLegend } from "./legend.js";
import { addAddressSearch } from "./search.js";


// ============================================================================
// 1. CREATE THE MAP AND BASEMAP
// ============================================================================

// "document" is the web page itself [📖 DOM]. Setting its title changes the
// text in the browser tab.
document.title = MAP.title;

// Create the map inside the <div id="map"> box from index.html, centered and
// zoomed as config.js says.
//
// .setView(...) is called on the result of L.map(...). Calling one method
// after another like this is method chaining [📖 Method chaining].
// L.map() returns the map object, and setView() returns it again, so "map"
// ends up holding the map.
const map = L.map("map").setView(MAP.center, MAP.zoom);

// Keep popup widths readable. This changes the default for ALL popups.
// { maxWidth: ... } is an object literal [📖 Object] created right inside
// the call, a common way to pass named options in JavaScript.
L.Popup.mergeOptions({ maxWidth: MAP.popupMaxWidth });

// Add the background map pictures [📖 Basemap] [📖 Tile].
L.tileLayer(MAP.basemap.url, {
    attribution: MAP.basemap.attribution
}).addTo(map);


// Shows a message box on the map (top right), e.g. a file that failed.
//
//   title  the bold first line
//   lines  an array [📖 Array] of strings, one per line
//
// A "function" in JavaScript is like a C++ function, but with no return type
// or parameter types written [📖 Dynamic typing].
function showProblems(title, lines) {

    // A Leaflet control [📖 Control] is a box that sits in a corner of the
    // map. L.control() makes an empty one.
    const box = L.control({ position: "topright" });

    // We decide what goes inside by giving the control an "onAdd" function.
    // Leaflet calls it when the box is added to the map [📖 Callback].
    // Assigning a function to an object's property like this is how
    // JavaScript does what C++ would do by overriding a virtual method.
    box.onAdd = function () {

        // Create a new <div> [📖 div] with the CSS class "map-error"
        // [📖 Class (CSS)], which css/styles.css section 15 makes red.
        const container = L.DomUtil.create("div", "map-error");

        // innerHTML [📖 innerHTML] sets what's inside the box, written as
        // HTML. "+" glues strings together, like std::string's +.
        //
        // lines.map(...) turns each line into a cleaned-up line
        // [📖 Array methods]. The arrow  line => ...  is a tiny function
        // [📖 Arrow function]. The .replace swaps "<" for "&lt;" so text
        // can't be mistaken for HTML tags [📖 Escaping].
        // .join("<br>") glues the lines into one string, with a line break
        // between each.
        container.innerHTML =
            "<strong>" + title + "</strong><br>" +
            lines.map(line => String(line).replace(/</g, "&lt;")).join("<br>");

        // Clicking the message shouldn't also click the map underneath
        // [📖 Event propagation].
        L.DomEvent.disableClickPropagation(container);
        return container;
    };

    box.addTo(map);
}


// ============================================================================
// 2. ADD THE ADDRESS SEARCH BOX
// The details live in js/search.js.
// ============================================================================

addAddressSearch(map);


// ============================================================================
// 3. CREATE THE PANES
// A higher zIndex is drawn on top of a lower one. [📖 Pane] [📖 z-index]
// ============================================================================

// .forEach runs the function once for every item in the array: a for-each
// loop [📖 Array methods]. The C++ version would be:
//     for (const auto& pane : PANES) { ... }
// "pane => { ... }" is an arrow function [📖 Arrow function] that receives
// one item at a time.
PANES.forEach(pane => {

    const element = map.createPane(pane.name);

    // .style changes an element's CSS directly from JavaScript
    // [📖 Inline style].
    element.style.zIndex = pane.zIndex;

    // Lets mouse clicks pass through to whatever is underneath
    if (pane.clickThrough) {
        element.style.pointerEvents = "none";
    }
});


// ============================================================================
// 4. LOAD THE DATA, THEN BUILD EVERYTHING THAT DEPENDS ON IT
// ============================================================================

// "location" is the page's own web address. If it starts with "file:", the
// page was double-clicked instead of served [📖 Web server], and the browser
// will refuse to load the data files. Warn about it.
// (=== means "equal". JavaScript uses three = signs [📖 Strict equality].)
if (location.protocol === "file:") {
    showProblems("The map data can't load", [
        "This page was opened straight from disk.",
        "Open it through a web server instead, e.g. VS Code \"Live Server\"."
    ]);
}

// Fill in the defaults that don't need the data (ids, labels, ...).
prepareLayers();

// Start downloading every data file. Downloads take time, so loadLayerData()
// doesn't return the data. It returns a PROMISE [📖 Promise], an IOU that
// says "I'll have the data later".
//
// .then(function) says "when the data arrives, run this". Everything that
// needs the data therefore lives INSIDE this function, and the code below
// the whole .then(...) block would run BEFORE the data arrives.
loadLayerData()

    // The promise hands over one object { data, problems }. Writing
    // { data, problems } in the parameter list unpacks it into two variables
    // in one go [📖 Destructuring].
    .then(function ({ data, problems }) {

        // .length is the array's size, like .size() in C++.
        if (problems.length > 0) {
            showProblems("Some layers could not be loaded", problems);

            // Writes to the browser's developer console [📖 Console].
            console.warn("Layers left off the map:", problems);
        }

        // Nothing loaded at all? Stop here. A bare "return;" ends the
        // function early, just like in C++.
        if (LAYERS.length === 0) {
            return;
        }

        // ---- a. Build the layers -------------------------------------------
        // "layers" holds every finished layer by id, e.g. layers.parks
        // (an object used like a std::map<string, Layer> [📖 Object]).

        const layers = createLayers(data);

        // ---- b. Set up area name labels ------------------------------------

        // "let" (instead of const) because we may replace it below
        // [📖 const and let].
        // "() => {}" is a function that does nothing, used as a safe
        // placeholder so calling updateLabels() later never crashes.
        let updateLabels = () => {};

        // .filter keeps only the items that pass the test
        // [📖 Array methods]: here, layers that have a labelField setting.
        // The result is then looped over with .forEach.
        LAYERS
            .filter(config => config.labelField)
            .forEach(config => {
                updateLabels = setUpAreaLabels(
                    map,
                    layers[config.id],
                    layers,
                    config.labelField
                );
            });

        // ---- c. Show the starting layers and zoom to the data --------------

        // Add every layer whose "visible" setting is true to the map.
        // layers[config.id] uses square brackets to look up a key stored in
        // a variable [📖 Object].
        LAYERS
            .filter(config => config.visible)
            .forEach(config => layers[config.id].addTo(map));

        // Bounds [📖 Bounds] = the smallest rectangle around some shapes.
        // Start with an empty rectangle and grow it to fit the data.
        const dataBounds = L.latLngBounds([]);

        // && means AND, || means OR, ! means NOT, same as C++.
        // A missing setting counts as false here [📖 Truthy and falsy].
        if (MAP.fitToLayer && layers[MAP.fitToLayer]) {
            dataBounds.extend(layers[MAP.fitToLayer].getBounds());
        } else {
            LAYERS
                .filter(config => config.visible)
                .forEach(config => {
                    const bounds = layers[config.id].getBounds();
                    if (bounds.isValid()) {
                        dataBounds.extend(bounds);
                    }
                });
        }

        if (dataBounds.isValid()) {
            map.fitBounds(dataBounds);
        }

        // Place the labels 100 milliseconds from now, giving the map a moment
        // to finish zooming first. setTimeout(function, delay) runs a function
        // later without pausing anything else [📖 Callback].
        setTimeout(updateLabels, 100);

        // ---- d. Add the layer control, the legend and their switches -------

        const layerPanel = addLayerControl(map, layers);

        // The second argument is an object of named settings. JavaScript has
        // no named parameters, so passing an object is the usual substitute.
        addPanelSwitch(map, {
            label: "Layers",
            position: "topleft",
            className: "layer-toggle-fixed",
            panel: layerPanel
        });

        // addLegend returns an object with two things inside: the legend's box
        // ("container") and a function to redraw it ("update").
        const legend = addLegend(map, layers);

        addPanelSwitch(map, {
            label: "Legend",
            position: "bottomright",
            className: "legend-toggle-fixed",
            panel: legend.container
        });

        // A small function stored in a variable, to call whenever the switches
        // need re-positioning [📖 Arrow function] [📖 Function as a value].
        const positionSwitches = () =>
            positionPanelSwitches(layerPanel, legend.container);

        // "window" is the browser window. Whenever it's resized, re-position.
        // [📖 Event] [📖 Event listener]
        window.addEventListener("resize", positionSwitches);

        // ---- e. Keep the legend up to date ---------------------------------

        legend.update();
        positionSwitches();

        // map.on("event", function) = "every time this happens on the map,
        // run this function" [📖 Event listener].
        // "overlayadd" fires when a layer is ticked on in the layer list.
        map.on("overlayadd", function () {
            legend.update();
            positionSwitches();
        });

        // ...and "overlayremove" when one is ticked off.
        map.on("overlayremove", function () {
            legend.update();
            positionSwitches();
        });
    })

    // .catch(function) runs if anything inside .then() crashed: like
    // try { ... } catch (std::exception& error) { ... } in C++ [📖 Promise].
    // Without this, a crash would just leave a blank map with no explanation.
    .catch(function (error) {
        console.error("ERROR BUILDING THE MAP:", error);
        showProblems("The map could not be built", [error.message]);
    });
