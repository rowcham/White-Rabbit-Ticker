// hadata.mjs - Home Assistant date + room temps module

import fetch from "node-fetch";

// ========== HA CONFIG ==========
const HA_URL = "http://YOURHOMEASSISTANTIP.:8123";  // your HA
const HA_TOKEN = "YOURHALONGLIVEDTOKEN"; // <- real token here

const INSIDE1 = "sensor.master_bedroom_govee_sensor_temperature";
const INSIDE2 = "sensor.bedroom_room_temperature";
const INSIDE3 = "sensor.living_room_temperature";
// ===============================

// basic HA state getter (returns .state or "??"), with raw debug on failure
async function getHA(sensor) {
  const url = `${HA_URL}/api/states/${sensor}`;
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` }
    });
    const text = await r.text();

    if (!r.ok) {
      console.error(`HA HTTP ${r.status} for ${sensor}: ${text}`);
      return "??";
    }

    let j;
    try {
      j = JSON.parse(text);
    } catch (e) {
      console.error(`HA JSON parse error for ${sensor}:`, text);
      return "??";
    }

    if (!("state" in j)) {
      console.error("HA state missing for", sensor, "got:", j);
      return "??";
    }
    return j.state;
  } catch (e) {
    console.error("HA error for", sensor, e.message);
    return "??";
  }
}

// clean up temps for display (round, handle ??)
function fmtTemp(v) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v;
  return n.toFixed(0); // integer degrees
}

async function buildHaString() {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {month: "short", day: "numeric"});

  const t1 = fmtTemp(await getHA(INSIDE1));
  const t2 = fmtTemp(await getHA(INSIDE2));
  const t3 = fmtTemp(await getHA(INSIDE3));

  // No time; just date + temps
  const s = `${date} Mbr:${t1}F BDR:${t2}F Lr:${t3}F`;
  console.log("HA module string:", s);
  return s;
}

// Module interface: id, color, getText()
export default {
  id: "hadata",
  color: { r: 16, g: 0, b: 0 },    // dark red, barely on
  getText: buildHaString
};
