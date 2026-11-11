// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  controls.js: LAYER LIST + SHOW/HIDE SWITCHES           (read this 6th)  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The layer checkbox list (top left) and the two small "Layers" / "Legend"
// switches that show or hide a panel. In Leaflet, any box that sits in a
// corner of the map is called a control [📖 Control].
//
// THIS FILE IS WHERE JAVASCRIPT MEETS THE PAGE
// Everything you see on a web page is an element [📖 Element]: a box created
// from an HTML tag. JavaScript can create elements, find them, and change
// them while the page is open. The page as a tree of elements that code can
// change is called the DOM [📖 DOM]. You'll see:
//   document.querySelector(".x")   find the first element with CSS class "x"
//   element.innerHTML = "..."      replace what's inside an element
//   element.style.top = "10px"     change one of its CSS settings
//   element.addEventListener(...)  run code when something happens to it
//
// CONTENTS
//   1. Layer control ......... addLayerControl()
//   2. Show / hide switches .. addPanelSwitch()
//   3. Switch positions ...... positionPanelSwitches()
// ============================================================================

import {
    LAYERS,
    GROUPS,
    LAYER_CONTROL_ORDER
} from "./config.js";


// ============================================================================
// 1. LAYER CONTROL
// ============================================================================

// A group's display name: from GROUPS in config.js, or the group setting itself.
//
// This is an arrow function [📖 Arrow function] stored in a const. It's
// exactly the same as writing:
//     export function groupName(group) { return GROUPS[group] || group; }
// "GROUPS[group] || group" means: the renamed name if there is one, otherwise
// the group's own name [📖 Truthy and falsy].
export const groupName = group => GROUPS[group] || group;

// The default order for the layer list and legend: LAYERS order, with each
// group placed where its first layer appears.
//   -> ["parks", "libraries", { group: "Food Access" }, ...]
//
// The result mixes strings (single layers) and objects (groups) in one array.
// JavaScript arrays can hold anything [📖 Array] [📖 Dynamic typing].
export function automaticOrder() {

    const order = [];

    // A Set [📖 Set] holds each value at most once, like std::set. Used here
    // to remember which groups have already been added.
    const groupsSeen = new Set();

    LAYERS.forEach(config => {

        // Not in a group: add the layer's id, then skip to the next layer.
        if (!config.group) {
            order.push(config.id);
            return;
        }

        // The first layer of a group adds the whole group; later ones don't.
        if (!groupsSeen.has(config.group)) {
            groupsSeen.add(config.group);
            order.push({ group: config.group });
        }
    });

    return order;
}

// Adds the checkbox list, arranged as LAYER_CONTROL_ORDER describes.
// Returns the panel's HTML element [📖 Element].
//
//   map     the Leaflet map
//   layers  every finished layer, by id (from layers.js createLayers)
export function addLayerControl(map, layers) {

    // The layer-list plugin wants a TREE of plain objects: each one is a
    // checkbox (label + layer) or a group (label + children). These two small
    // functions make one of each.

    // One checkbox
    // Note the ( ) around { }: an arrow function that returns an object
    // literal needs them. Otherwise JavaScript would read { as the start of a
    // code block [📖 Arrow function].
    const layerNode = config => ({
        label: config.label,
        layer: layers[config.id]
    });

    // One collapsible group with a "select all" checkbox
    const groupNode = group => ({
        label: groupName(group),
        selectAllCheckbox: "Toggle all " + groupName(group),
        collapsed: true,
        children: LAYERS
            .filter(config => config.group === group)
            .map(layerNode)
    });

    // Entries for layers that failed to load are skipped
    //
    // Use the order from config.js, or the automatic one if it's null.
    // Each entry becomes a node; entries whose layer is missing become null,
    // and .filter(Boolean) throws away every null at the end
    // [📖 Array methods] [📖 Truthy and falsy].
    const overlayTree = (LAYER_CONTROL_ORDER || automaticOrder())
        .map(entry => {

            if (entry.group) {
                const node = groupNode(entry.group);
                return node.children.length ? node : null;
            }

            const config = LAYERS.find(layer => layer.id === entry);
            return config ? layerNode(config) : null;
        })
        .filter(Boolean);

    // "null" = there are no alternative basemaps to choose between
    // L.control.layers.tree comes from the plugin loaded in index.html.
    const control = L.control.layers.tree(null, overlayTree, {
        position: "topleft",
        collapsed: false,
        closedSymbol: "+",
        openedSymbol: "−",
        labelIsSelector: "both"
    });

    control.addTo(map);

    // The control's outer box on the page, so the switches can hide/show it.
    const container = control.getContainer();

    // Scrolling inside the list should not zoom the map
    // [📖 Event propagation]
    L.DomEvent.disableScrollPropagation(container);

    return container;
}


// ============================================================================
// 2. SHOW / HIDE SWITCHES
// ============================================================================

// Adds a small labelled switch that shows or hides one panel.
//
//   label      the word next to the switch ("Layers" or "Legend")
//   position   the map corner the panel sits in
//   className  CSS class [📖 Class (CSS)] used to find and position the switch
//   panel      the HTML element to show or hide
//
// main.js passes ONE object with these four keys; the { } in the parameter
// list unpacks it into four separate variables [📖 Destructuring].
export function addPanelSwitch(map, { label, position, className, panel }) {

    // "position: position" could also be written as just "position"
    // [📖 Object].
    const control = L.control({ position: position });

    // Leaflet calls onAdd when the control is put on the map [📖 Callback].
    // Whatever element it returns becomes the control's box.
    control.onAdd = function () {

        // Create a <div> with two CSS classes (separated by a space).
        const container = L.DomUtil.create(
            "div",
            "control-toggle-switch " + className
        );

        // Fill it with HTML: the word, then a checkbox that CSS restyles to
        // look like a sliding iPhone-style switch (css/styles.css section 5).
        // "checked" makes it start switched on.
        container.innerHTML =
            '<span>' + label + '</span>' +
            '<label class="toggle-switch">' +
            '<input type="checkbox" checked>' +
            '<span class="toggle-slider"></span>' +
            '</label>';

        // Clicking or scrolling on the switch should not move the map
        // [📖 Event propagation]
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        // Find the checkbox we just created inside the container. "input" is
        // a CSS selector [📖 Selector] meaning "the first <input> element".
        const checkbox = container.querySelector("input");

        // Every time the checkbox is flipped, run this function
        // [📖 Event listener].
        checkbox.addEventListener("change", function () {

            // true when switched on.
            const show = checkbox.checked;

            // Hide or show the panel by changing its CSS [📖 Inline style].
            // All three are needed: invisible, fully see-through, and not
            // catching clicks while hidden.
            panel.style.visibility = show ? "visible" : "hidden";
            panel.style.opacity = show ? "1" : "0";
            panel.style.pointerEvents = show ? "auto" : "none";
        });

        return container;
    };

    control.addTo(map);
}


// ============================================================================
// 3. SWITCH POSITIONS
//
// Each switch floats just above its panel. The legend changes height as
// layers are switched on and off, so the positions are recalculated often.
//
// Screen positions are measured in pixels from the top-left corner of the
// browser window. CSS lengths are strings with units, which is why the code
// adds + "px" to each number.
// ============================================================================

export function positionPanelSwitches(layerPanel, legendPanel) {

    const gap = 4;

    // ---- "Layers" switch: above the top-left corner of the layer list ------

    // Find the switch by its class. The "." means "class" [📖 Selector].
    // "document" is the whole page [📖 DOM].
    const layerSwitch = document.querySelector(".layer-toggle-fixed");

    // Only if both exist (querySelector gives null when nothing matches).
    if (layerSwitch && layerPanel) {

        // offsetHeight = the element's height in pixels, as drawn right now.
        const switchHeight = layerSwitch.offsetHeight;

        // Push the layer list down to leave room for the switch
        layerPanel.style.marginTop = (switchHeight + gap + 10) + "px";

        // getBoundingClientRect() gives the element's exact on-screen box:
        // { top, left, right, bottom, width, height } in pixels.
        const panelBox = layerPanel.getBoundingClientRect();

        layerSwitch.style.top = (panelBox.top - switchHeight - 10) + "px";
        layerSwitch.style.left = panelBox.left + "px";
        layerSwitch.style.right = "auto";
    }

    // ---- "Legend" switch: above the top-right corner of the legend ---------

    const legendSwitch = document.querySelector(".legend-toggle-fixed");

    if (legendSwitch && legendPanel) {

        const panelBox = legendPanel.getBoundingClientRect();
        const switchHeight = legendSwitch.offsetHeight;

        legendSwitch.style.top = (panelBox.top - switchHeight - gap) + "px";

        // "right" is measured from the window's right edge, so subtract.
        legendSwitch.style.right = (window.innerWidth - panelBox.right) + "px";
        legendSwitch.style.left = "auto";
    }
}
