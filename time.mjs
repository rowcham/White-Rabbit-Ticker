// time.mjs – 12-hour time-of-day module for the WLED matrix

function pad(n) {
  return n.toString().padStart(2, "0");
}

export default {
  id: "time",
  getText: async () => {
    const now = new Date();
    const rawHours = now.getHours();       // 0–23
    let hours12 = rawHours % 12;           // 0–11
    if (hours12 === 0) hours12 = 12;       // midnight/noon → 12
    const minutes = pad(now.getMinutes()); // 00–59
    const suffix = rawHours >= 12 ? "PM" : "AM";

    // Example: "3:07 PM"
    return `${hours12}:${minutes} ${suffix}`;
  },
};
