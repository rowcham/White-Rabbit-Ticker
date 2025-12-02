// lobsters.mjs
//
// Module for matrix.mjs that fetches the latest Lobsters stories from RSS
// and returns a single line of text to scroll.

const RSS_URL = "https://lobste.rs/rss";

// Very small HTML entity decoder for common entities
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

async function fetchLobstersTitles(limit = 5) {
  try {
    const res = await fetch(RSS_URL, {
      headers: {
        "User-Agent": "wled-matrix/1.0",
        "Accept": "application/rss+xml,text/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const xml = await res.text();

    // Grab individual <item> blocks
    const itemMatches = [...xml.matchAll(/<item[\s\S]*?<\/item>/g)];
    const titles = [];

    for (const match of itemMatches) {
      const itemBlock = match[0];
      const titleMatch = itemBlock.match(/<title>([^<]*)<\/title>/);

      if (titleMatch && titleMatch[1]) {
        const rawTitle = titleMatch[1].trim();
        const decoded = decodeEntities(rawTitle);
        titles.push(decoded);
        if (titles.length >= limit) break;
      }
    }

    if (!titles.length) {
      return "LOBSTE.RS: NO ITEMS";
    }

    // Build a single line: "LOBSTE.RS: TITLE1 • TITLE2 • ..."
    const line = "LOBSTE.RS: " + titles.join(" • ");

    // Matrix font is uppercase; unknown chars get mapped to space anyway
    return line.toUpperCase();
  } catch (err) {
    console.error("lobsters.mjs error:", err);
    return "LOBSTE.RS ERROR";
  }
}

export default {
  id: "lobsters",
  async getText() {
    // tweak limit if you want more/less titles in the scroll
    return await fetchLobstersTitles(5);
  },
};
