// backend/src/api/health/get.js
/**
 * GET /api/health -> { ok: true }
 */
function registerHealthGet(app, deps, basePath = "") {
  app.get(`${basePath}/api/health`, (req, res) => res.json({ ok: true }));
}
module.exports = { registerHealthGet };
