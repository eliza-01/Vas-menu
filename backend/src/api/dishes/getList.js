// backend/src/api/dishes/getList.js
/**
 * GET /api/dishes?section=<slug> -> dish cards
 * imageUrl is relative (uploads/<file>) to avoid localhost/loopback issues behind tunnel.
 */
const { normalizeSlug, toMenuTable } = require("../../domain/sections/slug");

async function handle(req, res, deps) {
  const slug = normalizeSlug(req.query?.section);
  if (!slug) return res.status(400).json({ error: "section is required" });

  const table = toMenuTable(slug);

  const [rows] = await deps.pool.query(
    `SELECT id, name, image_path, ingredients, choices, notes, created_at
     FROM \`${table}\` ORDER BY id ASC LIMIT 200`
  );

  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      // ВАЖНО: относительный путь.
      // При открытии https://l2arena.su/vas-menu/ с <base href="/vas-menu/">
      // это станет https://l2arena.su/vas-menu/uploads/<file>
      imageUrl: `uploads/${r.image_path}`,
      ingredients: r.ingredients || [],
      choices: r.choices || [],
      notes: r.notes || "",
      createdAt: r.created_at,
    }))
  );
}

function registerDishesListGet(app, deps, basePath = "") {
  app.get(`${basePath}/api/dishes`, (req, res, next) =>
    handle(req, res, deps).catch(next)
  );
}

module.exports = { registerDishesListGet };