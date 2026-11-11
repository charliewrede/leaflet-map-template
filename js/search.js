// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  search.js: THE ADDRESS SEARCH BOX                      (read this 9th)  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The search box (top right). As the user types, suggestions are fetched
// from the Geoapify geocoding service [📖 Geocoding]. Clicking a suggestion
// drops a pin and zooms the map to it. Settings are in SEARCH in
// js/config.js.
//
// WHAT HAPPENS WHEN YOU TYPE "1600 Penn"
//   1. Each keystroke restarts a 250 ms timer [📖 Debounce].
//   2. When you pause, we build a web address (URL) [📖 URL] containing your
//      text and our API key [📖 API key], and fetch() it [📖 fetch].
//   3. Geoapify answers with JSON [📖 JSON]: a list of matching addresses
//      with their coordinates.
//   4. We turn each match into a clickable row under the box.
//   5. Clicking a row drops a marker and zooms there.
//   If you type again before the answer arrives, the old request is cancelled
//   so a slow, outdated answer can't overwrite a newer one.
//
// CONTENTS
//   1. Helpers ............. escapeText(), statusHtml()
//   2. The search box ...... addAddressSearch()
//        a. asking Geoapify for suggestions
//        b. listing the suggestions
//        c. jumping to the chosen address
//        d. the box itself
// ============================================================================

import { MAP, SEARCH, POPUP_PANE } from "./config.js";


// ============================================================================
// 1. HELPERS
// ============================================================================

// Makes text from the internet safe to place inside popup HTML.
// Any < or > in an address would otherwise be read as an HTML tag
// [📖 Escaping].
function escapeText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// A grey message line inside the suggestions list.
const statusHtml = message =>
    '<div class="address-search-status">' + message + '</div>';


// ============================================================================
// 2. THE SEARCH BOX
//
// Everything below lives INSIDE addAddressSearch. The variables declared at
// its top (resultMarker, typingTimer, ...) are shared by all the inner
// functions, and they stay alive as long as the page is open [📖 Closure].
// It works like private member variables of a C++ class, with the inner
// functions as its methods.
// ============================================================================

export function addAddressSearch(map) {

    // No key = no search box
    if (!SEARCH.apiKey) {
        return;
    }

    // null bounds = accept any address
    // [📖 Bounds] [📖 Ternary operator]
    const searchBounds = SEARCH.bounds ? L.latLngBounds(SEARCH.bounds) : null;

    // Geoapify wants longitude first: "rect:west,south,east,north"
    //
    // encodeURIComponent makes text safe to put inside a web address, e.g. a
    // space becomes %20 [📖 URL].
    const filter = searchBounds
        ? "&filter=" + encodeURIComponent(
            "rect:" + [
                searchBounds.getWest(),
                searchBounds.getSouth(),
                searchBounds.getEast(),
                searchBounds.getNorth()
            ].join(","))
        : "";

    // MAP.center is [lat, lng], so [1] is longitude and [0] is latitude.
    const bias = "&bias=" + encodeURIComponent(
        "proximity:" + MAP.center[1] + "," + MAP.center[0]
    );

    // "let" because these change over time [📖 const and let].
    let resultMarker = null;     // the pin for the chosen address
    let typingTimer = null;      // waits for the user to stop typing
    let activeRequest = null;    // lets an out-of-date request be cancelled

    // ---- a. Asking Geoapify for suggestions --------------------------------

    function search(searchText, resultsContainer, input) {

        // Cancel the previous request if the user kept typing
        if (activeRequest) {
            activeRequest.abort();
        }

        // An AbortController is a "cancel button" for one fetch.
        // "new" creates an object from a class, like C++ (but you never
        // delete it: JavaScript frees memory automatically
        // [📖 Garbage collection]).
        activeRequest = new AbortController();

        resultsContainer.innerHTML = statusHtml("Searching...");

        // display = "block" makes the hidden suggestions list visible
        // [📖 Inline style].
        resultsContainer.style.display = "block";

        // The full question we send to Geoapify, as one web address
        // [📖 URL]. Everything after "?" is a list of name=value settings
        // separated by "&".
        const url =
            "https://api.geoapify.com/v1/geocode/autocomplete" +
            "?text=" + encodeURIComponent(searchText) +
            "&format=json" +
            "&limit=" + SEARCH.maxResults +
            filter +
            bias +
            "&lang=en" +
            "&apiKey=" + encodeURIComponent(SEARCH.apiKey);

        // Send the request [📖 fetch]. The chain below runs step by step as
        // each part finishes [📖 Promise]:
        //   .then  -> the server answered: check it, read the JSON
        //   .then  -> the JSON is read: show the results
        //   .catch -> something went wrong anywhere above
        fetch(url, { signal: activeRequest.signal })
            .then(response => {

                if (!response.ok) {
                    throw new Error("Geoapify request failed.");
                }

                return response.json();
            })
            .then(data => {
                // "data.results || []": use an empty list if there are none
                // [📖 Truthy and falsy].
                showResults(data.results || [], resultsContainer, input);
            })
            .catch(error => {

                // A cancelled request is expected, not an error
                if (error.name === "AbortError") {
                    return;
                }

                console.error("Address search error:", error);

                resultsContainer.innerHTML =
                    statusHtml("Unable to load address results.");
            });
    }

    // ---- b. Listing the suggestions ----------------------------------------

    function showResults(results, resultsContainer, input) {

        // Clear the old list.
        resultsContainer.innerHTML = "";

        if (results.length === 0) {
            resultsContainer.innerHTML = statusHtml("No nearby addresses found.");
            resultsContainer.style.display = "block";
            return;
        }

        results.forEach(result => {

            // Number("39.75") -> 39.75. Gives NaN [📖 NaN] if it isn't a number.
            const latitude = Number(result.lat);
            const longitude = Number(result.lon);

            // Skip suggestions without usable coordinates
            if (isNaN(latitude) || isNaN(longitude)) {
                return;
            }

            // A new <div> row, placed inside the results list (the third
            // argument says where to put it).
            const item = L.DomUtil.create(
                "div",
                "address-search-result",
                resultsContainer
            );

            // textContent (unlike innerHTML) always treats the text as plain
            // text, never HTML, so it's automatically safe [📖 innerHTML].
            item.textContent = result.formatted;

            // When this row is clicked, choose it [📖 Event listener].
            // The function remembers THIS row's result, latitude and
            // longitude [📖 Closure]. Each row gets its own.
            item.addEventListener("click", function () {
                selectResult(result, latitude, longitude, input, resultsContainer);
            });
        });

        resultsContainer.style.display = "block";
    }

    // ---- c. Jumping to the chosen address ----------------------------------

    function selectResult(result, latitude, longitude, input, resultsContainer) {

        const location = L.latLng(latitude, longitude);

        if (searchBounds && !searchBounds.contains(location)) {
            // alert() shows the browser's built-in pop-up message box.
            alert(SEARCH.outsideBoundsMessage);
            return;
        }

        input.value = result.formatted;
        resultsContainer.style.display = "none";

        // Only one search pin at a time
        if (resultMarker) {
            map.removeLayer(resultMarker);
        }

        // A marker [📖 Marker] is Leaflet's standard blue map pin.
        // Three calls chained together [📖 Method chaining]: make the pin,
        // add it to the map, attach a popup.
        resultMarker = L.marker(location, { pane: "pointPane" })
            .addTo(map)
            .bindPopup(
                "<strong>Search Result</strong><br>" +
                escapeText(result.formatted),

                // Same top pane as every other popup, so it sits above
                // all map layers instead of behind them
                { pane: POPUP_PANE }
            );

        // Remove the pin as soon as its popup closes, which happens when
        // the user clicks anywhere else on the map or opens another popup
        // Inside this function, "this" is the marker whose popup closed
        // [📖 this].
        resultMarker.on("popupclose", function () {

            map.removeLayer(this);

            if (resultMarker === this) {
                resultMarker = null;
            }
        });

        // Move the map to the address.
        map.setView(location, SEARCH.resultZoom);

        // Open the popup after the map has moved, so the move cannot
        // close it again straight away
        resultMarker.openPopup();
    }

    // ---- d. The box itself -------------------------------------------------

    // L.Control.extend({...}) makes a NEW CLASS based on Leaflet's Control
    // class, like  class AddressSearchControl : public L::Control  in C++.
    // The object passed in lists what this class adds or overrides
    // [📖 Class (JavaScript)].
    const AddressSearchControl = L.Control.extend({

        options: {
            position: "topright"
        },

        // Leaflet calls onAdd when the control is added to the map, and puts
        // the returned element in the corner [📖 Callback].
        onAdd: function () {

            const container = L.DomUtil.create("div", "address-search-control");

            // The text box (an <input> element [📖 Element]).
            const input = L.DomUtil.create(
                "input",
                "address-search-input",
                container
            );

            input.type = "text";
            input.placeholder = SEARCH.placeholder;

            // Stops the browser from showing its own suggestion list on top
            // of ours.
            input.autocomplete = "off";

            // The (hidden) list where suggestions will appear.
            const resultsContainer = L.DomUtil.create(
                "div",
                "address-search-results",
                container
            );

            // Clicking or scrolling in the box should not move the map
            // [📖 Event propagation]
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            // Search shortly after the user stops typing (3+ characters)
            // The "input" event fires on every keystroke [📖 Event].
            input.addEventListener("input", function () {

                // .trim() removes spaces from both ends.
                const searchText = input.value.trim();

                // Cancel the timer from the previous keystroke...
                clearTimeout(typingTimer);

                if (searchText.length < 3) {
                    resultsContainer.innerHTML = "";
                    resultsContainer.style.display = "none";
                    return;
                }

                // ...and start a new one. Only the LAST keystroke's timer ever
                // finishes, so we search once, after the typing pauses
                // [📖 Debounce].
                typingTimer = setTimeout(function () {
                    search(searchText, resultsContainer, input);
                }, SEARCH.typingDelay);
            });

            // Hide the suggestions when clicking anywhere else
            // "event.target" is the element that was actually clicked.
            document.addEventListener("click", function (event) {
                if (!container.contains(event.target)) {
                    resultsContainer.style.display = "none";
                }
            });

            return container;
        }
    });

    // Make one search box from the class and put it on the map.
    new AddressSearchControl().addTo(map);
}
