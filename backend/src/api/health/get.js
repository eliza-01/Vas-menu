/**
 * GET /api/health -> { ok: true }
 */
function registerHealthGet(app) {
  app.get("/api/health", (req, res) => res.json({ ok: true }));
}

module.exports = { registerHealthGet };
