# White Rabbit Ticker

White Rabbit Ticker is a **modular Node.js framework** for driving a WLED 2D matrix as a scrolling text ticker.

It doesn’t care where the text comes from. Each module returns a string; the framework turns it into pixels and shoves it at WLED over UDP.

Built-in example modules:

* Home Assistant – date + indoor temps
* MPD – “Now Playing”
* Weather via wttr.in
* Local time (12-hour)
* Lobsters RSS headlines
* Plain text file
* Octoprint status (new 12/2/2025)

---

## 0. Quick start (I just want text on the LEDs)

Follow this in order.

### Step 1 – Make sure WLED is sane

1. Power up your WLED controller with the matrix attached.
2. Open the WLED web UI (hostname like `wled-xxxx.local` or the IP).
3. In **LED Preferences**:

   * Set total LEDs to `256` for a 32×8 panel (or whatever `WIDTH * HEIGHT` will be).
   * Enable **2D** and set it to `32` columns × `8` rows (or your actual size).
4. Note the **hostname or IP**. Example:
   `wled-2f1f50.local` or `192.168.88.50`.

### Step 2 – Check Node.js

In a terminal on the machine that will run the ticker:

```bash
node -v
```

* If it prints **v18.x** or **v20.x**, good.
* If it says “command not found” or some ancient version, go install a current Node.js (how you do that is up to you: nvm, distro packages, etc.).

### Step 3 – Put the project somewhere

Example:

```bash
mkdir -p ~/white-rabbit-ticker
cd ~/white-rabbit-ticker
# put matrix.mjs and all the *.mjs modules in this folder
```

You should end up with something like:

* `matrix.mjs`
* `hadata.mjs`
* `mpddata.mjs`
* `wttr.mjs`
* `time.mjs`
* `filedata.mjs`
* `lobsters.mjs`

### Step 4 – Init Node + install deps

Inside the project folder:

```bash
npm init -y
npm install node-fetch
```

That creates a `package.json` and installs `node-fetch` (used by the HA module).

### Step 5 – Basic config in `matrix.mjs`

Open `matrix.mjs` in a text editor (nano, vim, VS Code, whatever) and set these at the top:

```js
// Hostname or IP of your WLED matrix device
const WLED_IP = "wled-2f1f50.local";

// WLED UDP Realtime (DRGB) port
const UDP_PORT = 21324;

// Physical matrix dimensions
const WIDTH = 32;
const HEIGHT = 8;

// Scroll speed in ms between steps (bigger = slower)
const SCROLL_INTERVAL_MS = 60;

// Default text color
const DEFAULT_COLOR = { r: 4, g: 0, b: 0 };
```

Change:

* `WLED_IP` to your actual WLED hostname or IP.
* `WIDTH`/`HEIGHT` if your matrix isn’t 32×8.
* `SCROLL_INTERVAL_MS` if you want faster/slower scroll.

### Step 6 – Start the thing

From the project folder:

```bash
node matrix.mjs
```

If all is right, you’ll see some logs in the terminal and text will start marching across the matrix.

If you see nothing or garbage, go to **Troubleshooting** at the bottom.

---

## 1. What this thing actually is

* **Engine**: `matrix.mjs`

  * Opens a UDP socket to WLED (DRGB realtime mode).
  * Holds a small 5×7 bitmap font.
  * Converts strings → 5-column glyphs → a stream of frames.
  * Sends those frames to WLED as `[2,2] + RGB bytes` over UDP.
  * Walks a list of modules; each module runs once per loop and returns one string.

* **Modules**: ES modules that export an object with `id` and `getText()`:

  ```js
  export default {
    id: "example-module",
    getText: async () => "TEXT TO SCROLL",
  };
  ```

If `getText()` returns `""`, the framework skips that module for that pass.

---

## 2. Project layout

Typical folder contents:

* `matrix.mjs` – core engine / main loop
* `hadata.mjs` – Home Assistant date + room temperatures
* `mpddata.mjs` – MPD “Now Playing”
* `wttr.mjs` – weather via wttr.in
* `time.mjs` – local clock, 12-hour
* `filedata.mjs` – scroll a local text file
* `lobsters.mjs` – Lobsters RSS titles

Module wiring is at the top of `matrix.mjs`:

```js
import dgram from "dgram";
import haData from "./hadata.mjs";
import mpdData from "./mpddata.mjs";
// import lobsters from "./lobsters.mjs";
// import filedata from "./filedata.mjs";
import wttr from "./wttr.mjs";
import time from "./time.mjs";

const MODULES = [
  haData,
  mpdData,
  // lobsters,
  // filedata,
  wttr,
  time,
];
```

* Comment/uncomment imports and entries in `MODULES` to turn modules on or off.
* Reorder items in `MODULES` to change the display order.

---

## 3. Module configuration

### 3.1 Home Assistant – `hadata.mjs`

Top of the file looks like:

```js
const HA_URL   = "http://YOURHOMEASSISTANTINSTANCE:8123";
const HA_TOKEN = "YOUR_LONG_LIVED_TOKEN_HERE";

const INSIDE1 = "sensor.master_bedroom_govee_sensor_temperature";
const INSIDE2 = "sensor.bedroom_temperature";
const INSIDE3 = "sensor.living_room_temperature";
```

What to do:

1. Set `HA_URL` to your Home Assistant base URL.
2. Create a long-lived access token in Home Assistant and paste it as `HA_TOKEN`.
3. Change `INSIDE1/2/3` to real entity IDs from your system.

When it works, you’ll get lines like:

```text
Dec 1  Mbr: 72°F  BDR: 70°F  LR: 71°F
```

### 3.2 MPD – `mpddata.mjs`

At the top:

```js
const MPD_HOST = "YOURMPDINSTANCEBYIP";
const MPD_PORT = 6600;
const MPD_PASSWORD = "";   // set if you use a password
const MPD_TIMEOUT_MS = 250;
```

Set:

* `MPD_HOST` and `MPD_PORT` to your MPD instance.
* `MPD_PASSWORD` if your MPD requires one.

Behavior:

* If MPD is playing:

  * Returns `Artist - Title` (falls back to `name` or `file` if needed).
* If MPD is paused/stopped or unreachable:

  * Returns `""` so this module is skipped.

### 3.3 Weather – `wttr.mjs`

At the top:

```js
const LOCATION = "YourCity";
const WTTR_URL = "https://wttr.in/YourCity?format=j1";
const CACHE_MS = 15 * 60 * 1000; // 15 minutes
```

Change:

* `LOCATION` to the name you like.
* `WTTR_URL` if you want a different wttr.in query.
* `CACHE_MS` if you want more/less aggressive caching.

It builds a line with:

* Current temp
* Today’s high/low
* Max chance of rain for the day

### 3.4 Time – `time.mjs`

No real config. It uses system time and returns a 12-hour string:

```text
6:42 PM
```

Turn it on/off by including/removing it from `MODULES` in `matrix.mjs`.

### 3.5 File ticker – `filedata.mjs`

At the top:

```js
const FILE_PATH = "/home/youruser/wled-matrix/output.txt";
```

Set `FILE_PATH` to any UTF-8 text file.

Behavior:

* Reads the file.
* Collapses whitespace/newlines into one long line.
* Returns:

  * The cleaned content if the file has text.
  * `[FILE EMPTY]` if the file is blank.
  * `[FILE ERROR]` if something went wrong reading it.

### 3.6 Lobsters RSS – `lobsters.mjs`

Defaults to `https://lobste.rs/rss`.

It grabs some recent titles, decodes basic entities, and returns them joined into one ticker line.

Config options inside that module let you change:

* How many items to include
* Separator between titles

---

## 4. Running it

From the project folder:

```bash
node matrix.mjs
```

If you want a simple `npm start` shortcut, edit `package.json` and add:

```json
"scripts": {
  "start": "node matrix.mjs"
}
```

Then you can run:

```bash
npm start
```

To keep it alive long-term:

* Use `tmux` or `screen` and leave it running.
* Or write a small `systemd` service that runs `node /path/to/matrix.mjs`.

---

## 5. How the scrolling works (short version)

You don’t have to touch this, but here’s what happens:

1. The engine normalizes text and looks up each character in a 5×7 font map.
2. Each character becomes 5 columns of bits plus a blank spacer column.
3. All columns are concatenated into a “virtual strip” wider than your matrix.
4. The engine slides a window of width `WIDTH` across that strip.
5. For each step:

   * It builds a full `WIDTH × HEIGHT` RGB frame in memory.
   * It writes those bytes into a buffer: `[2, 2, r, g, b, r, g, b, ...]`.
   * Sends the buffer to WLED over UDP.
   * Waits `SCROLL_INTERVAL_MS` and moves one column left.

Pixel index mapping is **row-major**:

```text
index = y * WIDTH + x
x: 0 → WIDTH-1 (left to right)
y: 0 → HEIGHT-1 (top to bottom)
```

If it looks mirrored / upside-down, fix the **2D layout** options in WLED, not the code.

---

## 6. Writing your own module

Template:

```js
// mymodule.mjs
const myModule = {
  id: "my-module",
  getText: async () => {
    // do whatever here: HTTP request, file read, random nonsense, etc.
    const value = "HELLO MATRIX";
    return value;      // return "" to skip this module
  },
};

export default myModule;
```

Wire it into `matrix.mjs`:

```js
import myModule from "./mymodule.mjs";

const MODULES = [
  // other modules...
  myModule,
];
```

That’s it. If you return a string, it shows up. If you return "", it’s invisible for that pass.

---

## 7. Troubleshooting

### Nothing shows on the matrix

Checklist:

1. **Can you ping WLED from the Node box?**

   ```bash
   ping yourwled.local
   # or
   ping 192.168.88.50
   ```

2. **LED count correct?**

   * In WLED, total LEDs should equal `WIDTH * HEIGHT`.

3. **Realtime allowed?**

   * In WLED UI → Sync Interfaces:

     * Make sure realtime UDP is allowed and not blocked by some setting.

4. **Firewall:**

   * If you have a firewall, make sure UDP/21324 is not being dropped.

5. **Try a dumb test:**

   * Temporarily set `MODULES = [ time ];` and see if the time scrolls.
   * If that works, the engine is fine; another module is failing.

### Text is backwards / scrambled

* The code assumes straight row-major wiring.
* In WLED’s 2D settings:

  * Flip rotation, mirroring, and serpentine/zigzag options until text looks correct.
* Don’t edit the matrix math in `matrix.mjs` until you’ve exhausted WLED’s options.

### MPD never shows anything

* From the Node box, try:

  ```bash
  telnet MPD_HOST MPD_PORT
  ```

  You should see something like `OK MPD 0.22.x`.

* Check `MPD_HOST`, `MPD_PORT`, and `MPD_PASSWORD` in `mpddata.mjs`.

* Remember: if MPD is paused or stopped, this module intentionally returns `""`.

### Home Assistant line looks wrong

* Check `HA_URL` by hitting `HA_URL/api/` in a browser or curl.
* Verify the long-lived token and that it has API permissions.
* Confirm the entity IDs in `INSIDE1/2/3` actually exist.

### Weather line is empty or weird

* Hit the URL from the module in a browser:

  ```text
  https://wttr.in/YourCity?format=j1
  ```

* Make sure the machine can reach wttr.in (no DNS or firewall issues).

* Lower `CACHE_MS` if you’re testing and want faster updates.

---

Once the basic config is in place and it’s running without errors, you basically leave it alone and let White Rabbit Ticker drag whatever text you throw at it across the LEDs.
