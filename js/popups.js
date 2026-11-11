// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  popups.js: BUILDS THE TEXT INSIDE POPUPS               (read this 5th)  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A popup [📖 Popup] is the little window that opens when you click a
// feature. Every custom popup on the map is described in js/config.js as a
// short list of rows, for example:
//
//     [
//         field("Library Name", "LIBRARY_NA"),
//         address(["ADDRESS_LI", "CITY", "STATE", "ZIP"])
//     ]
//
// This file turns such a list into the popup's HTML [📖 HTML]. A layer
// without a popup list gets an automatic one instead (see js/layers.js).
//
// HOW IT WORKS, IN TWO STAGES
//   1. In config.js, field(), address() and link() only make small DESCRIPTION
//      objects, like {type: "field", label: "Library Name", source: "LIBRARY_NA"}.
//      Nothing is built yet, because no feature has been clicked yet.
//   2. Later, createPopupBuilder() (section 4) reads those descriptions and,
//      for each feature, looks up the real values and writes the HTML.
//
// Separating "describe" from "build" like this is what lets config.js stay a
// simple list of settings.
//
// CONTENTS
//   1. Row helpers ......... field(), address(), link()   (used in config.js)
//   2. "Show" rules ........ when is a value worth displaying?
//   3. Value formatters .... decimals(), percent(), titleCase(), ...
//   4. Popup builder ....... createPopupBuilder()         (used in layers.js)
// ============================================================================


// ============================================================================
// 1. ROW HELPERS
// ============================================================================

// One "Label: value" line.
//
//   label    text shown in bold before the value
//   source   property name in the GeoJSON [📖 GeoJSON], OR a function that
//            receives all of the feature's properties and returns the value
//   options  show:   "truthy" (default), "defined", "filled", or a function
//            format: function that turns the raw value into display text
//            suffix: text added after the value, e.g. " acres"
//
// "options = {}" is a default parameter [📖 Default parameter]: if no options
// are passed, it's an empty object.
//
// The returned object uses two shortcuts:
//   - "label" alone means  label: label  (key and variable share a name)
//     [📖 Object]
//   - "...options" copies every key from options into the result
//     [📖 Spread syntax]
// So field("Size", "ACRES", { suffix: " acres" }) returns
//   { type: "field", label: "Size", source: "ACRES", suffix: " acres" }
export function field(label, source, options = {}) {
    return { type: "field", label, source, ...options };
}

// One "Address: street, city, state zip" line.
// City, state and zip are each added only when they have a value.
//
// [street, city, state, zip] in the parameter list unpacks the array that's
// passed in straight into four variables [📖 Destructuring].
export function address([street, city, state, zip], options = {}) {
    return { type: "address", street, city, state, zip, ...options };
}

// One "Website: clickable link" line.
//
//   source   property name holding the web address
//   text     the words the user clicks on
//   options  show: as above
//            url:  function that cleans up the address before it is used
export function link(source, text, options = {}) {
    return { type: "link", source, text, ...options };
}


// ============================================================================
// 2. "SHOW" RULES
//
// A row is skipped when its value is missing. The layers do not all agree on
// what "missing" means, so each row can choose one of three rules.
//
// SHOW_RULES is an object whose values are small functions
// [📖 Function as a value]. SHOW_RULES.defined(0) asks "does 0 count as a
// value under the 'defined' rule?" and gets back true.
// ============================================================================

const SHOW_RULES = {

    // Skips null, undefined, "", 0 and false [📖 Truthy and falsy].
    truthy: value => Boolean(value),

    // Skips only null and undefined, so a real 0 is still shown.
    // [📖 null and undefined] [📖 Strict equality]
    defined: value => value !== null && value !== undefined,

    // Skips null, undefined and "".
    filled: value => value !== null && value !== undefined && value !== ""
};

// Should this value be shown, under this rule?
// The rule can be a name ("defined") or your own function. typeof tells the
// two apart [📖 typeof]. SHOW_RULES[rule] looks up the rule by name.
function shouldShow(rule = "truthy", value) {
    return typeof rule === "function"
        ? rule(value)
        : SHOW_RULES[rule](value);
}


// ============================================================================
// 3. VALUE FORMATTERS
// Each one returns a function, ready to be used as a row's "format" option.
//
// Look closely at decimals: it's  places => value => ...  Two arrows! It's a
// function that MAKES a function [📖 Function as a value] [📖 Closure]:
//     decimals(3)          -> a new function that rounds to 3 places
//     decimals(3)(0.83456) -> "0.835"
// The others (percent, thousands, ...) need no setting, so they are the
// formatting function directly.
// ============================================================================

// 0.83456 -> "0.835"
// Number(value) converts text like "0.83456" into a number first.
export const decimals = places => value => Number(value).toFixed(places);

// 12.345 -> "12.3%"   (the value is already a percentage)
export const percent = value => Number(value).toFixed(1) + "%";

// 0.12345 -> "12.3%"  (the value is a share between 0 and 1)
export const shareAsPercent = value => (Number(value) * 100).toFixed(1) + "%";

// 12345 -> "12,345"
// toLocaleString formats numbers the way the viewer's country writes them.
export const thousands = value => Number(value).toLocaleString();

// "123 MAIN ST" -> "123 Main St"
// \b\w finds the first letter of each word [📖 Regular expression].
export const titleCase = value =>
    String(value)
        .toLowerCase()
        .replace(/\b\w/g, letter => letter.toUpperCase());

// Swaps specific values for friendlier ones and leaves everything else alone.
// replaceValues({ MEDICARE: "Medicare" }) turns "MEDICARE" into "Medicare".
//
// hasOwnProperty asks "does this object have this exact key?". It's written
// in this long form because it's the safe way to ask about any object.
export const replaceValues = replacements => value =>
    Object.prototype.hasOwnProperty.call(replacements, value)
        ? replacements[value]
        : value;

// "www.site.org" -> "https://www.site.org"
export const ensureHttps = url =>
    url.startsWith("http://") || url.startsWith("https://")
        ? url
        : "https://" + url;


// ============================================================================
// 4. POPUP BUILDER
// ============================================================================

const NO_INFORMATION = "<strong>No information available</strong>";

// Reads a row's value from a feature's properties.
// "source" is either a property name (look it up) or a function (call it).
function readValue(source, properties) {
    return typeof source === "function"
        ? source(properties)
        : properties[source];
}

// Turns ONE row into HTML. Returns "" when the row should be skipped.
//
// <strong> makes text bold, <br> is a line break, <a href="..."> is a
// clickable link [📖 Tag].
function renderRow(row, properties) {

    // Address rows store their first column in "street" instead of "source",
    // so use whichever one exists [📖 Truthy and falsy].
    const value = readValue(row.source || row.street, properties);

    if (!shouldShow(row.show, value)) {
        return "";
    }

    // ---- Address: street, city, state zip ----------------------------------
    if (row.type === "address") {

        let text = value;

        const city = properties[row.city];
        const state = properties[row.state];
        const zip = properties[row.zip];

        // "+=" appends to the string, like in C++.
        if (shouldShow(row.show, city)) text += ", " + city;
        if (shouldShow(row.show, state)) text += ", " + state;
        if (shouldShow(row.show, zip)) text += " " + zip;

        return "<strong>Address:</strong> " + text + "<br>";
    }

    // ---- Website link -------------------------------------------------------
    if (row.type === "link") {

        const url = row.url ? row.url(value) : value;

        // target="_blank" opens the link in a new tab, and rel="noopener..."
        // stops that new tab from controlling this one (a safety habit).
        return (
            '<strong>Website:</strong> ' +
            '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
            row.text +
            '</a><br>'
        );
    }

    // ---- Ordinary "Label: value" line ---------------------------------------
    const text = row.format ? row.format(value) : value;

    return (
        "<strong>" + row.label + ":</strong> " +
        text +
        (row.suffix || "") +
        "<br>"
    );
}

// Turns a list of rows into a function that builds a popup for any feature.
//
//     const buildLibraryPopup = createPopupBuilder(POPUPS.library);
//     layer.bindPopup(buildLibraryPopup(feature));
//
// The returned function remembers "rows" [📖 Closure], so it can be called
// for feature after feature without passing the rows again.
export function createPopupBuilder(rows) {

    return function (feature) {

        const properties = feature.properties;

        if (!properties) {
            return NO_INFORMATION;
        }

        // Build every row's HTML and glue them together [📖 Array methods].
        return (
            "<div>" +
            rows.map(row => renderRow(row, properties)).join("") +
            "</div>"
        );
    };
}
