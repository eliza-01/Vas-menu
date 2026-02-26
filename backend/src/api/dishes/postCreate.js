/**
 * POST /api/dishes (multipart/form-data)
 * Fields: section, name, ingredients, choices, image
 */
const path = require("path");
const { createImageUpload } = require("../../infra/storage/imageUpload");
const { normalizeSlug, toMenuTable } = require("../../domain/sections/slug");
const { parseLines } = require("../../domain/dishes/parseLines");

function registerDishesCreatePost(app, deps) {
  const upload = createImageUpload(deps.env.uploadDir).single("image");

  app.post("/api/dishes", (req, res, next) =>
    upload(req, res, (err) => {
      if (err) return next(err);
      handle(req, res, deps).catch(next);
    })
  );
}

async function handle(req, res, deps) {
  const section = normalizeSlug(req.body?.section);
  if (!section) return res.status(400).json({ error: "section is required" });

  const name = String(req.body?.name || "").trim().slice(0, 160);
  if (!name) return res.status(400).json({ error: "name is required" });

  if (!req.file) return res.status(400).json({ error: "image is required" });

  const ingredients = parseLines(req.body?.ingredients);
  const choices = parseLines(req.body?.choices);

  const table = toMenuTable(section);

  await deps.pool.query(
    `INSERT INTO \`${table}\` (name, image_path, ingredients, choices)
     VALUES (?, ?, CAST(? AS JSON), CAST(? AS JSON))`,
    [name, path.basename(req.file.filename), JSON.stringify(ingredients), JSON.stringify(choices)]
  );

  res.status(201).json({ ok: true });
}

module.exports = { registerDishesCreatePost };
