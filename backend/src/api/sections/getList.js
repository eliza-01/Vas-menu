// backend/src/api/sections/getList.js
/**
 * GET /api/sections -> [{id,title,slug}]
 */
async function handle(req, res, deps) {
  const [rows] = await deps.pool.query(
    "SELECT id, title, slug FROM sections ORDER BY id ASC"
  );
  res.json(rows);
}

function registerSectionsListGet(app, deps, basePath = "") {
  app.get(`${basePath}/api/sections`, (req, res, next) =>
    handle(req, res, deps).catch(next)
  );
}

module.exports = { registerSectionsListGet };
