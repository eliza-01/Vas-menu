// backend/src/domain/sections/slug.js
/**
 * Section slug normalization + validation (used as part of table name).
 */
function normalizeSlug(input) {
  const raw = String(input || "").trim().toLowerCase();
  const slug = raw
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  if (!slug || !/^[a-z0-9_]+$/.test(slug)) return null;
  return slug;
}

function toMenuTable(slug) {
  return `menu_${slug}`;
}

module.exports = { normalizeSlug, toMenuTable };
