// backend/src/api/sections/postCreate.js
/**
 * POST /api/sections { title, slug? } -> created section
 * Also creates the menu_<slug> table.
 */
const { normalizeSlug, toMenuTable } = require("../../domain/sections/slug");

async function handle(req, res, deps) {
  const title = String(req.body?.title || "").trim().slice(0, 120);
  const slug = normalizeSlug(req.body?.slug || title);

  if (!title) return res.status(400).json({ error: "title is required" });
  if (!slug) return res.status(400).json({ error: "slug is invalid" });

  await deps.pool.query("INSERT INTO sections (title, slug) VALUES (?, ?)", [
    title,
    slug,
  ]);

  const table = toMenuTable(slug);
  await deps.pool.query(`
    CREATE TABLE IF NOT EXISTS \`${table}\` (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(160) NOT NULL,
      image_path VARCHAR(255) NOT NULL,
      ingredients JSON NOT NULL,
      decor JSON NOT NULL,
      choices JSON NOT NULL,
      notes VARCHAR(2000) NOT NULL DEFAULT '',
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [rows] = await deps.pool.query(
    "SELECT id, title, slug FROM sections WHERE slug = ?",
    [slug]
  );
  res.status(201).json(rows?.[0] || { title, slug });
}

function registerSectionsCreatePost(app, deps, basePath = "") {
  app.post(`${basePath}/api/sections`, (req, res, next) =>
    handle(req, res, deps).catch(next)
  );
}

module.exports = { registerSectionsCreatePost };