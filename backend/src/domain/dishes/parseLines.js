// backend/src/domain/dishes/parseLines.js
/**
 * Parse textarea lines into compact string array.
 */
function parseLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
}

module.exports = { parseLines };
