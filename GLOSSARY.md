# Glossary

Every hard word in this project's code comments, explained in plain language.

In the code, a word with an entry here is tagged like **[📖 Arrow function]**. To look it up, press **Cmd+F** in this file and type the word.

Each entry has:
- **What it is**, in plain words.
- **C++ version**, when there's something similar you may already know.
- **In this project**, a real example from the code.

---

## Contents

- [The web in general](#the-web-in-general): Web server, URL, CDN, Console, DevTools, Leaflet, Global variable
- [HTML: what's on the page](#html-whats-on-the-page): HTML, Tag, Attribute, Element, div, id, HTML entity, Escaping
- [CSS: how it looks](#css-how-it-looks): CSS, Selector, Property (CSS), Class (CSS), Cascade, !important, CSS variable, Hex color, rgba, Units, Box model, Position, z-index, Flexbox, Pseudo-class, Pseudo-element, Transition, clip-path, Inline style, Vendor prefix
- [JavaScript: the language](#javascript-the-language): JavaScript, Dynamic typing, const and let, null and undefined, NaN, Strict equality, Truthy and falsy, Ternary operator, typeof, Object, Array, Array methods, for...of, Set, Reference, Garbage collection, Destructuring, Spread syntax, Default parameter, Regular expression, Method chaining, Class (JavaScript), this, Module
- [Functions](#functions): Arrow function, Function as a value, Callback, Closure
- [JavaScript and the page](#javascript-and-the-page): DOM, innerHTML, Event, Event listener, Event propagation, Debounce
- [Waiting for things](#waiting-for-things): Promise, fetch, JSON
- [Maps](#maps): GeoJSON, Layer, LatLng, Container point, Bounds, Zoom level, Basemap, Tile, Pane, Marker, Popup, Tooltip, Control, Ray casting
- [Internet services](#internet-services): API key, Geocoding

---

## The web in general

### Web server
**What it is:** A program that hands out files when a browser asks for them. When you open `http://localhost:8000`, a web server on your own computer is sending the files to your browser.

**Why you need one:** For safety, browsers don't let a page read other files (like your GeoJSON data) when you open it by double-clicking. Opened from a web server, the page is allowed to.

**In this project:** VS Code's "Live Server", `python3 -m http.server`, or GitHub Pages. `js/main.js` shows a warning if the page was double-clicked.

### URL
**What it is:** A web address, like `https://api.geoapify.com/v1/geocode/autocomplete?text=Denver&limit=6`. The part after `?` is a list of `name=value` settings joined with `&`.

**In this project:** `js/search.js` builds a URL containing your search text. `encodeURIComponent()` makes the text safe to put inside a URL (a space becomes `%20`).

### CDN
**What it is:** A "content delivery network": a fast public website that hosts popular libraries so pages can load them without keeping their own copy.

**In this project:** `index.html` loads Leaflet from `unpkg.com`. The `@1.9.4` in the address pins an exact version, so an update can't break your map.

### Console
**What it is:** A hidden panel in the browser where JavaScript writes messages and errors. It's like the terminal output of a C++ program.

**How to open it:** **Cmd+Option+J** in Chrome, or right-click the page → Inspect → **Console** tab.

**In this project:** `console.warn(...)` and `console.error(...)` write here. **If the map is blank, the console almost always says why** (often a missing comma in `config.js`).

### DevTools
**What it is:** The browser's built-in developer tools (right-click → **Inspect**). The **Elements** tab shows the page's elements and their CSS, and you can edit values live to experiment. The **Console** tab shows errors. The **Network** tab shows every file the page downloaded.

**C++ version:** Debugger, inspector and log viewer in one.

### Leaflet
**What it is:** The free JavaScript library that draws the map: zooming, panning, markers, popups, shapes. Everything in the code that starts with `L.` comes from Leaflet.

**C++ version:** A library you `#include` and call, like a graphics library.

**Docs:** leafletjs.com (the "Tutorials" and "Docs" pages).

### Global variable
**What it is:** A variable every file can use without importing it.

**In this project:** Loading Leaflet in `index.html` creates the global `L`. Browsers also provide `document` (the page), `window` (the browser window) and `location` (the page's address).

---

## HTML: what's on the page

### HTML
**What it is:** The language that describes what's on a page: headings, boxes, buttons, links. It describes content, not looks (that's [CSS](#css)) and not behavior (that's [JavaScript](#javascript)).

**In this project:** `index.html` is tiny: one empty box for the map and a list of files to load. JavaScript also writes small pieces of HTML as strings, for popups and the legend.

### Tag
**What it is:** An HTML keyword in angle brackets. Most come in pairs that wrap content: `<strong>bold text</strong>`. The closing one has a `/`.

Common tags in this project:

| Tag | Meaning |
|---|---|
| `<div>` | a plain box |
| `<span>` | a plain inline piece of text |
| `<strong>` | bold text |
| `<br>` | line break (no closing tag) |
| `<a href="...">` | a clickable link |
| `<i>` | officially italic text, but used here as an empty box that CSS turns into a legend symbol |
| `<input>` | a text box or checkbox |
| `<script>` | load JavaScript |
| `<link>` | load CSS |

### Attribute
**What it is:** An extra setting written inside a tag: `<div id="map" class="big">`. Here `id` and `class` are attributes.

### Element
**What it is:** One actual box on the page, created from a tag. A tag is the text you write; an element is the live object the browser builds from it.

**C++ version:** If a tag is a class declaration, an element is an object created from it.

**In this project:** `L.DomUtil.create("div", ...)` creates a new element from JavaScript.

### div
**What it is:** The most basic HTML box (`<div>...</div>`). It has no look of its own until CSS styles it. It's used for almost every panel and container.

### id
**What it is:** A unique name for one element: `<div id="map">`. In CSS it's written with `#` (`#map { ... }`). In JavaScript, Leaflet finds it with `L.map("map")`.

### HTML entity
**What it is:** A code for a special character: `&copy;` is ©, `&lt;` is <, `&gt;` is >, `&amp;` is &.

### Escaping
**What it is:** Making text safe to put inside HTML by replacing `<` with `&lt;` and so on, so the browser shows it as text instead of reading it as code.

**Why it matters:** If a data file contained `<script>...</script>` and you put it into a popup unescaped, the browser would *run* it. That kind of attack is called "XSS" (cross-site scripting).

**In this project:** the `escapeText()` functions in `js/layers.js` and `js/search.js`. Setting `textContent` instead of `innerHTML` is also always safe.

---

## CSS: how it looks

### CSS
**What it is:** "Cascading Style Sheets", the language for colors, sizes, spacing, fonts and layout. A CSS file is a list of rules: *which elements* → *how they should look*.

**In this project:** `css/styles.css`. Leaflet also brings its own CSS, which ours overrides.

### Selector
**What it is:** The part of a CSS rule before `{` that says which elements it applies to.

| Selector | Matches |
|---|---|
| `#map` | the element with `id="map"` |
| `.legend` | every element with class `legend` |
| `.info.legend` | elements with *both* classes |
| `.legend i` | `<i>` elements anywhere inside a `.legend` |
| `a, b` | a and b (same rule for both) |
| `input:checked + .slider` | a `.slider` right after a ticked checkbox |
| `*` | everything |

JavaScript uses the same selectors: `document.querySelector(".layer-toggle-fixed")`.

**Practice:** the game *CSS Diner* (flukeout.github.io).

### Property (CSS)
**What it is:** One style setting inside a rule, written `name: value;`. For example `font-size: 13px;` or `background: white;`.

### Class (CSS)
**What it is:** A label you can put on any number of elements (`class="legend"`) so CSS and JavaScript can find them. An element can have several, separated by spaces: `class="info legend"`.

**Not the same as** a C++ or JavaScript class (see [Class (JavaScript)](#class-javascript)). It's just a tag-name for styling.

### Cascade
**What it is:** The rules for which CSS wins when two rules set the same property on the same element:
1. `!important` wins.
2. Otherwise, the more **specific** selector wins (`#id` beats `.class`, which beats a tag name).
3. If they're equal, the rule written **later** wins.

**In this project:** that's why `styles.css` loads *after* Leaflet's CSS in `index.html`.

### !important
**What it is:** A flag at the end of a CSS value (`color: red !important;`) that makes it beat normal rules. It's a sledgehammer, used here only to override Leaflet's built-in styles.

### CSS variable
**What it is:** A named value you define once and reuse. It's defined with two dashes, `--ui-text: #1d1d1f;`, and used as `var(--ui-text)`.

**C++ version:** A shared `const`.

**In this project:** section 1 of `styles.css`. Also `--marker-color`, which JavaScript sets on each point symbol so the CSS knows what color to paint it.

### Hex color
**What it is:** A color written as `#RRGGBB`. Each pair is a hexadecimal number from `00` (none) to `FF` (full) for red, green and blue. `#FF0000` is red, `#000000` black, `#FFFFFF` white.

**Tool:** search "color picker" in Google to get any color's hex code.

### rgba
**What it is:** A color written as `rgba(red, green, blue, alpha)`. Red, green and blue go from 0 to 255; alpha (opacity) goes from 0 (invisible) to 1 (solid). `rgba(0, 0, 0, 0.1)` is a faint see-through black.

### Units
**What it is:** CSS sizes always need a unit:

| Unit | Meaning |
|---|---|
| `px` | pixels |
| `%` | percent of the parent box |
| `vw` / `vh` | percent of the window's width / height (`100vh` = full height) |
| `em` | relative to the current font size |

`calc(100% + 7px)` does math with mixed units.

### Box model
**What it is:** Every element is a box made of layers, from the inside out: **content → padding** (space inside the border) **→ border → margin** (space outside the border).

`box-sizing: border-box` means "the width I set includes the padding and border". Without it they're added on top.

**Shorthand:** `padding: 10px 12px` means top/bottom 10px, left/right 12px. `margin: 3px 8px 0 3px` goes clockwise: top, right, bottom, left.

### Position
**What it is:** How an element is placed:
- `static` (default): in the normal flow of the page.
- `relative`: normal spot, but serves as the anchor for `absolute` children.
- `absolute`: placed with `top`/`left`/... inside the nearest `relative` parent, and doesn't push anything else around.
- `fixed`: placed relative to the browser window; stays put when the page scrolls.

### z-index
**What it is:** The stacking order of overlapping elements: higher numbers are drawn on top.

**In this project:** the map's [panes](#pane) and the floating switches.

### Flexbox
**What it is:** A layout mode (`display: flex`) that lines up an element's children in a row (or column) and makes centering easy (`align-items: center; justify-content: center;`).

**Learn:** the *Flexbox Froggy* game (flexboxfroggy.com) and CSS-Tricks' "A Complete Guide to Flexbox".

### Pseudo-class
**What it is:** A selector add-on for a *state*, written with one colon:

| Pseudo-class | Matches |
|---|---|
| `:hover` | while the mouse is over it |
| `:focus` | while selected for typing |
| `:checked` | a ticked checkbox |
| `:last-child` | the last item in its parent |

### Pseudo-element
**What it is:** A selector add-on, written with two colons, that styles a *part* of an element or adds an extra decorative piece. `::before` and `::after` create an extra box (they need `content: ""` to appear). `::placeholder` is the hint text in an empty input.

**In this project:** the switch's white knob is a `::before`; each point symbol's colored fill is an `::after`.

### Transition
**What it is:** Makes a CSS change animate smoothly instead of jumping. `transition: background 0.2s ease` means "when background changes, fade over 0.2 seconds".

### clip-path
**What it is:** Cuts an element to a shape; anything outside is invisible. `polygon(50% 0, 100% 50%, 50% 100%, 0 50%)` lists the shape's corners as x/y percentages of the box, which here makes a diamond.

**In this project:** all the point shapes (star, cross, drop...) in section 7 of `styles.css`. *Clippy* (bennettfeely.com/clippy) lets you draw shapes visually.

### Inline style
**What it is:** CSS set directly on one element, either in HTML (`<i style="background:red">`) or from JavaScript (`element.style.top = "10px"`). It beats rules in the stylesheet. In JavaScript, dashed names become camelCase: `z-index` → `style.zIndex`.

### Vendor prefix
**What it is:** A browser-specific copy of a CSS property, e.g. `-webkit-backdrop-filter` for Safari. It's written next to the standard one so every browser gets the effect.

---

## JavaScript: the language

### JavaScript
**What it is:** The programming language that runs inside web browsers. Despite the name, it's unrelated to Java. Its syntax (`if`, `for`, `while`, `{ }`, `;`, `&&`, `||`) will look familiar from C++. The big differences:
- no types written ([Dynamic typing](#dynamic-typing))
- no compiling: the browser runs the files directly
- functions are values ([Function as a value](#function-as-a-value))
- lots of waiting ([Promise](#promise), [Callback](#callback))

### Dynamic typing
**What it is:** Variables have no declared type; the *value* has a type, and a variable can hold anything. `let x = 5; x = "hello";` is allowed. Arrays can mix types too.

**C++ version:** As if every variable were `auto` and could change type. Mistakes show up when the code *runs*, not when it compiles, so check the [Console](#console).

**Duck typing:** code often checks "does this object have a `setRadius` method?" instead of "what class is it?" (see the hover code in `js/layers.js`).

### const and let
**What it is:** The two ways to create a variable:
- `const x = 5;` can't be reassigned (like C++ `const`). Use it by default.
- `let x = 5;` can be reassigned later (`x = 6;`).

**Gotcha:** `const` stops *reassignment*, not changes inside: with `const list = [];` you can still `list.push(1)`.

You may see `var` in old code online. It's an older form of `let`; avoid it.

### null and undefined
**What it is:** JavaScript has two "nothing" values:
- `undefined`: never set. For example, reading `config.color` when the object has no `color` key gives `undefined` instead of an error.
- `null`: deliberately set to "nothing", like `nullptr`.

**In this project:** the template relies on `undefined`: leave a setting out, and `js/layers.js` notices and fills in a default.

### NaN
**What it is:** "Not a Number", the result of a failed number conversion: `Number("abc")` is `NaN`. Test for it with `isNaN(x)`. It's similar to C++'s floating-point NaN.

### Strict equality
**What it is:** In JavaScript, use `===` for "equal" and `!==` for "not equal". The older `==` converts types first (`0 == ""` is `true`!), which causes bugs, so always use three.

### Truthy and falsy
**What it is:** Any value can be used as a true/false condition. These are **falsy** (count as false): `false`, `0`, `""` (empty string), `null`, `undefined`, `NaN`. **Everything else is truthy**, including `"0"`, `[]` and `{}`.

**Two patterns this enables, used all over the code:**
- `a || b` gives `a` if it's truthy, otherwise `b`. It reads as "a, or b as a default": `config.color || autoColor`.
- `a && b` gives `b` only if `a` is truthy. It's a safe way to read through something that might be missing: `feature.properties && feature.properties.name`.
- `.filter(Boolean)` keeps only truthy items, removing every `null`.

### Ternary operator
**What it is:** `condition ? valueIfTrue : valueIfFalse`, exactly as in C++. `show ? "visible" : "hidden"`.

### typeof
**What it is:** Gives a value's type as a string: `"number"`, `"string"`, `"boolean"`, `"object"`, `"function"` or `"undefined"`.

**In this project:** `typeof rule === "function"` checks whether a setting is a function or a name.

### Object
**What it is:** A bundle of named values, written `{ key: value, key2: value2 }`. You read and write them with a dot (`obj.key`), or with brackets when the key is in a variable (`obj[name]`). You can add new keys any time.

**C++ version:** Somewhere between a `struct` you can create on the spot and a `std::map<std::string, anything>`.

**Shortcuts:**
- `{ data, problems }` means `{ data: data, problems: problems }`.
- Objects can hold functions; that's what "methods" are.

**In this project:** every layer in `LAYERS` is an object, and so is `MAP`.

### Array
**What it is:** An ordered list: `[1, 2, 3]`. `list[0]` is the first item, `list.length` the size, `list.push(x)` adds to the end. It grows automatically and can hold mixed types.

**C++ version:** `std::vector`, without the type restriction.

### Array methods
**What it is:** Built-in functions on every array. Each takes a small function (usually an [arrow function](#arrow-function)) and applies it to the items. They replace most hand-written loops:

| Method | Does | C++ version |
|---|---|---|
| `list.forEach(f)` | run f on every item | range-based for loop |
| `list.map(f)` | new array of f(item) for each item | `std::transform` |
| `list.filter(f)` | new array of the items where f is true | `std::copy_if` |
| `list.find(f)` | first item where f is true (or `undefined`) | `std::find_if` |
| `list.some(f)` | is f true for at least one? | `std::any_of` |
| `list.every(f)` | is f true for all? | `std::all_of` |
| `list.sort((a, b) => b - a)` | sort (negative = a first), in place | `std::sort` |
| `list.slice(a, b)` | copy of items a to b-1 | |
| `list.join(", ")` | glue the items into one string | |
| `list.includes(x)` | does it contain x? | |
| `"a b".split(" ")` | a *string* method: string → array of pieces | |

`forEach`, `map`, `filter` and friends can also pass each item's index: `list.map((item, index) => ...)`.

**Read a chain top to bottom:** `LAYERS.filter(c => c.visible).forEach(c => ...)` means "take the visible layers, then do something with each".

### for...of
**What it is:** The loop over every item in a list: `for (const word of words) { ... }`. It's the same as C++'s `for (const auto& word : words)`. Unlike `forEach`, it works with `break` and `continue`.

### Set
**What it is:** A collection that holds each value at most once: `new Set()`, `.add(x)`, `.has(x)`. It's like `std::set`, except it remembers insertion order.

### Reference
**What it is:** Objects and arrays are never copied when you assign or pass them; you get another handle to the *same* object. Change it through one name and every name sees the change.

**C++ version:** Every object variable behaves roughly like a pointer (or `std::shared_ptr`). Numbers and strings behave like normal copied values.

**In this project:** `prepareLayers()` fills in `config.id` and every file that reads `LAYERS` sees it. To get a real copy, use [spread syntax](#spread-syntax): `[...list]` or `{...obj}`.

### Garbage collection
**What it is:** JavaScript frees memory automatically when nothing uses an object anymore. There's no `delete`, no destructors to write, and no memory leaks from forgetting to free things.

### Destructuring
**What it is:** Unpacking an object or array into separate variables in one step:
- `const { data, problems } = result;` is the same as `const data = result.data; const problems = result.problems;`
- `const [x, y] = pair;` is the same as `const x = pair[0]; const y = pair[1];`

It also works in parameter lists: `function ({ data, problems }) { ... }`.

**C++ version:** Structured bindings, `auto [x, y] = pair;`.

### Spread syntax
**What it is:** Three dots `...` that "pour out" the contents of an array or object into a new one:
- `[...list]` makes a copy of an array.
- `{ ...defaults, ...userSettings }` makes a new object with all keys from both, and later ones win.

**In this project:** `config.style = { weight: 2, ...config.style }` means "weight 2, unless the user's style says otherwise".

### Default parameter
**What it is:** A value used when an argument isn't passed: `function symbolHtml(cssClass, color, shape, tag = "div")`. It's the same idea as in C++.

### Regular expression
**What it is:** A mini-language for searching text, written between slashes: `/pattern/flags`. It's mainly used with `.replace()`, `.split()` and `.test()`.

| Piece | Meaning |
|---|---|
| `\w` | a letter, digit or underscore |
| `\s` | a space or tab |
| `\b` | a word boundary |
| `.` | any character |
| `+` / `*` / `?` | one or more / zero or more / optional |
| `[-_]` | any one of these characters |
| `[^A-Z]` | any character *except* these |
| `^` / `$` | start / end of the text |
| `( )` | a group (reused as `$1`, `$2` in the replacement) |
| flag `g` | replace *every* match, not just the first |
| flag `i` | ignore capitals |

Example: `"a_b-c".replace(/[-_]+/g, " ")` gives `"a b c"`.

**Practice:** regex101.com explains any pattern piece by piece.

### Method chaining
**What it is:** Calling one method straight on the result of another: `L.marker(spot).addTo(map).bindPopup("Hi")`. Each method returns an object, so the next one can be called on it. Read it top to bottom (or left to right) as a series of steps.

### Class (JavaScript)
**What it is:** A blueprint for objects, as in C++. JavaScript has a `class` keyword, but Leaflet uses its own style: `L.Control.extend({...})` makes a new class that inherits from `L.Control`, and `new AddressSearchControl()` creates an object from it.

**C++ version:** `class AddressSearchControl : public L::Control { ... };`.

### this
**What it is:** Inside a method or event handler, `this` is the object the method was called on. In a Leaflet `layer.on("mouseover", function () { ... })` handler, `this` is the shape the mouse is over.

**C++ version:** `this`, but it's a reference rather than a pointer: `this.setRadius()`, not `this->setRadius()`.

**Gotcha:** [arrow functions](#arrow-function) don't get their own `this`. That's why the event handlers in this project use the `function () {...}` form.

### Module
**What it is:** A JavaScript file that shares pieces with `export` and borrows with `import`:

```js
// config.js
export const MAP = { ... };

// main.js
import { MAP } from "./config.js";
```

Anything *not* exported stays private to its file.

**C++ version:** Like `#include` plus a header, except you name exactly which pieces you want, and nothing leaks out unless exported. Turned on by `<script type="module">` in `index.html`.

---

## Functions

### Arrow function
**What it is:** A short way to write a function:

```js
x => x * 2                  // one parameter, returns x * 2
(a, b) => a + b             // two parameters
() => true                  // no parameters
config => ({ id: 1 })       // returns an object: needs ( ) around { }
item => {                   // several lines: needs { } and an explicit return
    const y = item + 1;
    return y;
}
```

**C++ version:** A lambda: `[](auto x) { return x * 2; }`.

**In this project:** used everywhere, especially with [array methods](#array-methods).

### Function as a value
**What it is:** Functions can be stored in variables, kept in objects and arrays, passed to other functions, and returned from functions, just like numbers. Writing a function's name *without* `()` refers to the function itself; *with* `()` calls it.

```js
format: thousands       // hands over the function (popups.js will call it later)
format: thousands(5)    // would call it now and hand over the result
```

**C++ version:** Function pointers or `std::function`.

**In this project:** `BUILDERS` in `layers.js` maps type names to builder functions, and `decimals(3)` *returns* a new function.

### Callback
**What it is:** A function you hand to someone else to call later, when something happens or finishes: "call me back".

**In this project:**
- `setTimeout(updateLabels, 100)` means "call updateLabels in 100 ms".
- `.then(function)` means "call this when the download finishes".
- `map.on("zoomend", function)` means "call this after every zoom".
- `onAdd` and `onEachFeature` are callbacks Leaflet calls while building things.

### Closure
**What it is:** A function created *inside* another function remembers the outer function's variables, even after the outer function has finished. The inner function "closes over" them.

```js
function makeCounter() {
    let count = 0;
    return () => { count += 1; return count; };
}
const next = makeCounter();
next();   // 1
next();   // 2  (count lives on inside "next")
```

**C++ version:** A lambda that captures by reference, `[&count]`, except JavaScript keeps the variable alive for you. It's also like private member variables of an object.

**In this project:** `update()` in `legend.js` remembers which box to fill; `search.js` keeps `resultMarker` and `typingTimer` this way.

---

## JavaScript and the page

### DOM
**What it is:** "Document Object Model": the live tree of [elements](#element) that the browser builds from the HTML. JavaScript can read and change it while the page is open, and the screen updates immediately. `document` is the whole page.

| Code | Does |
|---|---|
| `document.querySelector(".x")` | find the first element matching a [selector](#selector) |
| `element.innerHTML = "..."` | replace what's inside |
| `element.style.top = "10px"` | change its CSS |
| `element.offsetHeight` | measure its height |
| `L.DomUtil.create("div", "my-class", parent)` | Leaflet's helper to make a new element |

### innerHTML
**What it is:** The HTML inside an element, as a string. Setting it replaces the element's contents, and the browser builds the new elements from the string.

**Safety:** only put [escaped](#escaping) text into innerHTML. `textContent` is the safe alternative for plain text, because it never reads tags.

### Event
**What it is:** Something that happens: a click, a key press, the mouse moving over something, the window being resized, the map finishing a zoom. Each has a name: `"click"`, `"input"`, `"resize"`, `"zoomend"`, `"overlayadd"`.

### Event listener
**What it is:** A [callback](#callback) registered to run every time an event happens:

```js
checkbox.addEventListener("change", function () { ... });   // plain web pages
map.on("zoomend", function () { ... });                     // Leaflet's version
```

**C++ version:** Like registering a handler in a GUI framework (signals/slots, observers).

### Event propagation
**What it is:** A click on an element also counts as a click on every box around it ("bubbling up"). So clicking the legend would also click the map underneath it. `L.DomEvent.disableClickPropagation(box)` stops that, so using a panel never drags or zooms the map.

### Debounce
**What it is:** Waiting until something stops happening before reacting. In the search box, each keystroke restarts a 250 ms timer, so the search runs only once, after you pause typing, instead of once per letter.

---

## Waiting for things

### Promise
**What it is:** An object that stands for a result that isn't ready yet, like a receipt or IOU. A download returns a promise immediately; the data comes later.

```js
loadLayerData()
    .then(result => { /* runs when it's ready */ })
    .catch(error => { /* runs if anything failed */ });
```

- `.then(f)` registers what to do with the result. Whatever `f` returns is passed to the next `.then`.
- `.catch(f)` handles errors from anywhere above it, like a C++ `try/catch`.
- `throw new Error("...")` inside a `.then` jumps to the `.catch`.
- `Promise.allSettled([...])` waits for a whole list of promises and reports each one's success or failure.

**C++ version:** `std::future`, but you never block waiting on it; you attach what should happen next.

**The key idea:** code written *after* the `.then(...)` block runs *before* the data arrives. Anything that needs the data goes *inside*.

**Modern alternative you'll see online:** `async`/`await`, which does the same thing in a style that reads top to bottom.

### fetch
**What it is:** The browser's built-in function for downloading something from a [URL](#url). It returns a [promise](#promise) of a response; `response.json()` then reads the response as [JSON](#json) (another promise).

**In this project:** loading every GeoJSON file (`layers.js`) and asking Geoapify for addresses (`search.js`).

### JSON
**What it is:** "JavaScript Object Notation": a text format for data that looks just like JavaScript [objects](#object) and [arrays](#array): `{"name": "Union Station", "visitors": 1200000}`. Keys must be in double quotes.

**In this project:** GeoJSON files are JSON, and so are Geoapify's answers.

---

## Maps

### GeoJSON
**What it is:** The standard [JSON](#json) format for map data. A file is a `FeatureCollection` holding a list of **features**, and each feature has:
- `geometry`: the shape. Its `type` is `Point`, `LineString` or `Polygon` (or a `Multi...` version), plus its `coordinates`.
- `properties`: any information about it, e.g. `{ "name": "City Park", "acres": 330 }`. These are what popups show and what `scoreField` and `labelField` refer to.

```json
{ "type": "Feature",
  "properties": { "name": "Union Station" },
  "geometry": { "type": "Point", "coordinates": [-105.0002, 39.7527] } }
```

**Gotcha:** GeoJSON coordinates are **[longitude, latitude]**, the opposite of Leaflet's `[lat, lng]`. Coordinates must be in WGS84 (EPSG:4326).

**A polygon's "rings":** the first list of corners is the outer edge; any more are holes.

**Tools:** geojson.io (view and edit files), mapshaper.org (shrink and simplify files).

### Layer
**What it is:** One set of things drawn on the map, usually one GeoJSON file, e.g. "all parks". In Leaflet, a GeoJSON layer is a *group* of smaller layers, one per feature. That's why the code uses `eachLayer` to visit every shape in it.

### LatLng
**What it is:** A position on Earth: latitude (north/south, -90 to 90) and longitude (east/west, -180 to 180). In Leaflet it's written `[lat, lng]` or `L.latLng(lat, lng)`. Denver is about `[39.74, -104.99]`.

### Container point
**What it is:** A position in *screen pixels*, measured from the top-left corner of the map box. It changes whenever you pan or zoom. Convert with `map.latLngToContainerPoint(latlng)` and `map.containerPointToLatLng(point)`.

**In this project:** `labels.js` measures label sizes in pixels but checks them against area outlines in lat/lng.

### Bounds
**What it is:** The smallest rectangle that contains some shapes, given by its south-west and north-east corners. `map.fitBounds(bounds)` zooms the map to show that rectangle.

### Zoom level
**What it is:** How close in the map is, from about 1 (whole world) to 19 (individual buildings). Each step doubles the scale.

### Basemap
**What it is:** The background map pictures (streets, place names, parks) underneath your data. This project uses OpenStreetMap; the address is in `MAP.basemap` in `config.js`.

### Tile
**What it is:** The basemap arrives as many small square pictures, 256×256 pixels each, for each zoom level. Leaflet downloads only the tiles you can see, and fills in `{z}/{x}/{y}` in the basemap address for each one.

### Pane
**What it is:** A see-through sheet that layers are drawn on. Panes are stacked by [z-index](#z-index), which is how this project guarantees points sit above areas and popups above everything. The list is `PANES` in `config.js`.

### Marker
**What it is:** A symbol for a point location. Leaflet has several kinds:
- `L.marker`: the classic blue pin (used for search results).
- `L.circleMarker`: a circle drawn as a shape (used for scored points).
- `L.divIcon`: a marker made of your own HTML and CSS (used for the shaped symbols and numbered markers).

### Popup
**What it is:** The small window that opens when you click a feature. It's attached with `layer.bindPopup(html)`.

### Tooltip
**What it is:** A small text box attached to a shape. It usually appears on hover, but with `permanent: true` it always shows, which is how the area name labels work.

### Control
**What it is:** Leaflet's word for a box that sits in a corner of the map: zoom buttons, the layer list, the legend, the search box, the switches. You make one with `L.control({ position: "topright" })` and an `onAdd` function that returns its contents.

### Ray casting
**What it is:** The classic test for "is this point inside this polygon?". Draw an imaginary ray from the point in one direction and count how many edges it crosses: an odd number means inside, even means outside.

**In this project:** `pointInRing()` in `labels.js`.

---

## Internet services

### API key
**What it is:** A password-like code that identifies your project to an online service (here Geoapify) so it can count your usage. API stands for "Application Programming Interface": a way for programs to talk to a service.

**Note:** in a website, the key is visible to anyone who views the page's code. Protect it by limiting it, in the service's dashboard, to your own website's address.

### Geocoding
**What it is:** Turning an address ("1701 Wynkoop St, Denver") into coordinates, or the reverse. This project uses Geoapify's autocomplete geocoder for the search box.
