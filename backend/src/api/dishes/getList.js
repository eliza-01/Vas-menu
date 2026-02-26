/**
 * GET /api/dishes?section=<slug> -> dish cards
 */
const { normalizeSlug, toMenuTable } = require("../../domain/sections/slug");

async function handle(req, res, deps) {
  const slug = normalizeSlug(req.query?.section);
  if (!slug) return res.status(400).json({ error: "section is required" });

  const table = toMenuTable(slug);

  const [rows] = await deps.pool.query(
    `SELECT id, name, image_path, ingredients, choices, notes, created_at
     FROM \`${table}\` ORDER BY id DESC LIMIT 200`
  );

  const base = deps.env.baseUrl || "";
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      imageUrl: `${base}/uploads/${r.image_path}`,
      ingredients: r.ingredients || [],
      choices: r.choices || [],
      notes: r.notes || "",
      createdAt: r.created_at,
    }))
  );
}

function registerDishesListGet(app, deps) {
  app.get("/api/dishes", (req, res, next) => handle(req, res, deps).catch(next));
}

module.exports = { registerDishesListGet };