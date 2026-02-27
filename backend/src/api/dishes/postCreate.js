// backend/src/api/dishes/postCreate.js
/**
 * POST /api/dishes (multipart/form-data)
 * Fields: section, name, ingredients, choices, notes, image
 */
const path = require("path");
const { createImageUpload } = require("../../infra/storage/imageUpload");
const { normalizeSlug, toMenuTable } = require("../../domain/sections/slug");
const { parseLines } = require("../../domain/dishes/parseLines");

async function handle(req, res, deps) {
  const section = normalizeSlug(req.body?.section);
  if (!section) return res.status(400).json({ error: "section is required" });

  const name = String(req.body?.name || "").trim().slice(0, 160);
  if (!name) return res.status(400).json({ error: "name is required" });

  if (!req.file) return res.status(400).json({ error: "image is required" });

  const ingredients = parseLines(req.body?.ingredients);
  const choices = parseLines(req.body?.choices);
  const notes = String(req.body?.notes || "").trim().slice(0, 2000);

  const table = toMenuTable(section);

  const [[m]] = await deps.pool.query(
    `SELECT COALESCE(MAX(sort_order), 0) AS mx FROM \`${table}\``
  );
  const sortOrder = Number(m?.mx || 0) + 1;

  await deps.pool.query(
    `INSERT INTO \`${table}\` (name, image_path, ingredients, choices, notes, sort_order)
     VALUES (?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?)`,
    [
      name,
      path.basename(req.file.filename),
      JSON.stringify(ingredients),
      JSON.stringify(choices),
      notes,
      sortOrder,
    ]
  );

  res.status(201).json({ ok: true });
}

function registerDishesCreatePost(app, deps, basePath = "") {
  const upload = createImageUpload(deps.env.uploadDir).single("image");

  app.post(`${basePath}/api/dishes`, (req, res, next) =>
    upload(req, res, (err) => {
      if (err) return next(err);
      handle(req, res, deps).catch(next);
    })
  );
}

module.exports = { registerDishesCreatePost };
