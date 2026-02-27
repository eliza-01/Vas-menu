/**
 * GET /api/priority?section=<slug> -> [{id,name}] ordered by id ASC
 */
const { normalizeSlug, toMenuTable } = require("../../domain/sections/slug");

async function handle(req, res, deps) {
  const slug = normalizeSlug(req.query?.section);
  if (!slug) return res.status(400).json({ error: "section is required" });

  const table = toMenuTable(slug);

  const [rows] = await deps.pool.query(
    `SELECT id, name FROM \`${table}\` ORDER BY sort_order ASC, id ASC LIMIT 2000`
  );
  res.json(rows);
}

function registerPriorityListGet(app, deps) {
  app.get("/api/priority", (req, res, next) =>
    handle(req, res, deps).catch(next)
  );
}

module.exports = { registerPriorityListGet };