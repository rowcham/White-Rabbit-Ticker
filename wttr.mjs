// wttr.mjs – wttr.in weather module for Garland, TX

const LOCATION = "Dallas";
const WTTR_URL = "https://wttr.in/Dallas?format=j1";

let cachedText = null;
let cachedAt = 0;
const CACHE_MS = 15 * 60 * 1000; // 15 minutes

async function fetchWeatherText() {
  const res = await fetch(WTTR_URL, {
    headers: {
      "User-Agent": "curl/7.79.1",
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`wttr.in HTTP ${res.status}`);
  }

  const data = await res.json();

  const current = data?.current_condition?.[0];
  const today = data?.weather?.[0];

  if (!current || !today) {
    throw new Error("Unexpected wttr.in JSON shape");
  }

  const nowF  = parseInt(current.temp_F, 10);
  const highF = parseInt(today.maxtempF, 10);
  const lowF  = parseInt(today.mintempF, 10);

  let rainChance = 0;
  if (Array.isArray(today.hourly)) {
    for (const hour of today.hourly) {
      const v = parseInt(hour.chanceofrain ?? "0", 10);
      if (Number.isFinite(v) && v > rainChance) {
        rainChance = v;
      }
    }
  }

  const clamp = (v, min, max) => {
    if (!Number.isFinite(v)) return 0;
    return Math.min(max, Math.max(min, v));
  };

  const nowStr  = clamp(nowF,  -99, 199);
  const highStr = clamp(highF, -99, 199);
  const lowStr  = clamp(lowF,  -99, 199);
  const rainStr = clamp(rainChance, 0, 100);

  // NOTE: your font doesn’t have “°”, so it will show as a blank.
  // If that bugs you, just remove the ° characters.
  return `${LOCATION}: Now ${nowStr}F High ${highStr}F Low ${lowStr}F Rain ${rainStr}%`;
}

export default {
  id: "wttr",
  async getText() {
    const now = Date.now();

    if (cachedText && now - cachedAt < CACHE_MS) {
      return cachedText;
    }

    try {
      const text = await fetchWeatherText();
      cachedText = text;
      cachedAt = now;
      return text;
    } catch (err) {
      console.error("wttr module error:", err?.message || err);
      return cachedText || `${LOCATION}: Weather unavailable`;
    }
  }
};
