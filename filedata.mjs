// filedata.mjs - scroll text from a plaintext file

import { promises as fs } from "fs";

// Change this to whatever file you want to scroll
const FILE_PATH = "/home/void/wled-matrix/output.txt";

const fileData = {
  id: "filedata",
  async getText() {
    try {
      const raw = await fs.readFile(FILE_PATH, "utf8");

      // Squash all whitespace/newlines so it fits the marquee style better
      const cleaned = raw.replace(/\s+/g, " ").trim();

      if (!cleaned) {
        return "[FILE EMPTY]";
      }

      return cleaned;
    } catch (err) {
      console.error("filedata module error reading", FILE_PATH, err);
      return "[FILE ERROR]";
    }
  },
};

export default fileData;
