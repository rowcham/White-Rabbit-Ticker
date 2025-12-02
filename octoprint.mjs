// octoprint.mjs - OctoPrint status module for WLED matrix

// Base URL of your OctoPrint instance (no trailing slash)
const OCTO_BASE_URL = "http://192.168.1.121";

// API key from OctoPrint Settings → API
// *** PUT YOUR REAL KEY HERE ***
const OCTO_API_KEY = "YOUR_API_KEY_HERE";

// ---- Helpers ----

function formatRemaining(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins.toString().padStart(2, "0")}m`;
}

function shortenFileName(name, maxLen = 16) {
  if (!name) return "";
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 3) + "...";
}

function formatPercent(completion) {
  if (typeof completion !== "number" || !Number.isFinite(completion)) return "";
  return `${Math.round(completion)}%`;
}

function toIntOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

async function fetchJson(path) {
  if (!OCTO_API_KEY || !OCTO_API_KEY.trim()) {
    console.error("OctoPrint: OCTO_API_KEY is empty");
    return null;
  }

  const url = `${OCTO_BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "X-Api-Key": OCTO_API_KEY.trim(),
    },
  });

  if (!res.ok) {
    console.error(`OctoPrint ${path} HTTP ${res.status}`);
    return null;
  }

  return res.json();
}

async function fetchJob() {
  try {
    return await fetchJson("/api/job");
  } catch (err) {
    console.error("OctoPrint /api/job error:", err?.message || err);
    return null;
  }
}

// Needs DisplayLayerProgress plugin
async function fetchLayerInfo() {
  try {
    const data = await fetchJson("/plugin/DisplayLayerProgress/values");
    if (!data || !data.layer) return null;

    const currentLayer = toIntOrNull(data.layer.current);
    const totalLayer = toIntOrNull(data.layer.total);

    if (currentLayer === null || totalLayer === null) return null;

    return { currentLayer, totalLayer };
  } catch (err) {
    // 404 or plugin not installed → just skip layers
    console.error("DisplayLayerProgress fetch error:", err?.message || err);
    return null;
  }
}

export default {
  id: "octoprint",

  async getText() {
    const [jobData, layerInfo] = await Promise.all([
      fetchJob(),
      fetchLayerInfo(),
    ]);

    if (!jobData && !layerInfo) {
      return "3DP ERR";
    }

    const state = (jobData?.state || "").trim();
    const progress = jobData?.progress || {};
    const job = jobData?.job || {};
    const fileName = job.file?.name || "";

    let stateText;
    switch (state) {
      case "Printing":
        stateText = "Printing";
        break;
      case "Paused":
        stateText = "Paused";
        break;
      case "Operational":
        stateText = "Idle";
        break;
      case "Error":
      case "Offline":
      case "Offline after error":
        stateText = "Error";
        break;
      default:
        stateText = state || "Unknown";
        break;
    }

    const pct = formatPercent(progress.completion);
    const remaining = formatRemaining(progress.printTimeLeft);
    const shortName = shortenFileName(fileName);

    let layerText = "";
    if (layerInfo && layerInfo.currentLayer !== null && layerInfo.totalLayer !== null) {
      layerText = `L${layerInfo.currentLayer}/${layerInfo.totalLayer}`;
    }

    // Build compact ticker string for the 32x8 matrix
    // Example: "3DP Printing 57% L34/120 1h05m Benchy.gcode"
    let text = `3DP ${stateText}`;
    if (pct) text += ` ${pct}`;
    if (layerText) text += ` ${layerText}`;
    if (remaining) text += ` ${remaining}`;
    if (shortName) text += ` ${shortName}`;

    return text;
  },
};
