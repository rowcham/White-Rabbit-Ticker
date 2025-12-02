// mpddata.mjs - MPD "Now Playing" module for the WLED matrix framework
//
// Talks to MPD via its TCP protocol and returns a short string like:
//   "MPD: Artist - Title"
// If MPD is stopped/paused, returns an empty string so the framework
// effectively skips this module and goes back to the first one.

import net from "net";

// ====== MPD CONFIG ======

// MPD host and port
const MPD_HOST = "192.168.88.17";
const MPD_PORT = 6600;

// Optional password support; leave empty string if no password.
const MPD_PASSWORD = "";  // set if you use `password "xyz"` in mpd.conf

// How long we'll wait for MPD before giving up, in milliseconds.
const MPD_TIMEOUT_MS = 250;

// =========================

// Connect to MPD, ask for currentsong + status, and return a parsed object.
// Returns:
//   { state: "play"|"pause"|"stop", artist, title, name, file }  or null on error.
async function queryNowPlaying() {
  return new Promise((resolve) => {
    let buffer = "";
    let greeted = false;
    let closed = false;

    const client = net.createConnection({ host: MPD_HOST, port: MPD_PORT });

    // Hard timeout so this module can't stall the matrix too long.
    client.setTimeout(MPD_TIMEOUT_MS, () => {
      console.error("MPD timeout after", MPD_TIMEOUT_MS, "ms");
      client.destroy(new Error("MPD timeout"));
    });

    client.on("error", (err) => {
      console.error("MPD error:", err.message);
      if (!closed) {
        closed = true;
        resolve(null);
      }
    });

    client.on("data", (chunk) => {
      buffer += chunk.toString("utf8");

      // First data from MPD is a greeting line like:
      //   OK MPD 0.23.12
      if (!greeted && buffer.startsWith("OK MPD")) {
        greeted = true;

        const commands = [];

        if (MPD_PASSWORD && MPD_PASSWORD.trim() !== "") {
          commands.push(`password ${MPD_PASSWORD}`);
        }

        // Ask for song metadata and player state
        commands.push("currentsong");
        commands.push("status");
        commands.push("close");

        client.write(commands.join("\n") + "\n");
      }
    });

    client.on("end", () => {
      if (closed) return;
      closed = true;

      const lines = buffer.split("\n").map(l => l.trim()).filter(Boolean);

      let state = "stop";
      let artist = "";
      let title  = "";
      let name   = "";
      let file   = "";

      for (const line of lines) {
        if (line.startsWith("Artist:")) {
          artist = line.substring("Artist:".length).trim();
        } else if (line.startsWith("Title:")) {
          title = line.substring("Title:".length).trim();
        } else if (line.startsWith("Name:")) {
          name = line.substring("Name:".length).trim();
        } else if (line.startsWith("file:")) {
          file = line.substring("file:".length).trim();
        } else if (line.startsWith("state:")) {
          state = line.substring("state:".length).trim();
        } else if (line.startsWith("ACK")) {
          console.error("MPD ACK error:", line);
        }
      }

      resolve({ state, artist, title, name, file });
    });
  });
}

// Build a short display string from the parsed MPD state.
async function buildMpdString() {
  const info = await queryNowPlaying();

  // If MPD is unreachable or times out, just show nothing so we don't
  // waste time scrolling error messages or stalling the matrix.
  if (!info) {
    return "";
  }

  // If MPD is NOT playing (stopped/paused), return empty string:
  // framework will still call this module, but scrollMessage("")
  // is a no-op (totalCols === 0) so it visually just skips to the next.
  if (info.state !== "play") {
    return "";
  }

  // Prefer "Artist - Title"
  let main = "";
  if (info.artist && info.title) {
    main = `${info.artist} - ${info.title}`;
  } else if (info.name) {
    main = info.name;
  } else if (info.title) {
    main = info.title;
  } else if (info.file) {
    const parts = info.file.split("/");
    main = parts[parts.length - 1];
  } else {
    main = "(unknown)";
  }

  const s = `MPD: ${main}   `;
  console.log("MPD module string:", s);
  return s;
}

// Module interface for the framework
export default {
  id: "mpd",
  getText: buildMpdString
};
