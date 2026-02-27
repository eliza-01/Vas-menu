/**
 * POST /api/priority { section, order: number[] }
 * Reorders by swapping ids (permutes existing ids).
 */
const { normalizeSlug, toMenuTable } = require("../../domain/sections/slug");

async function handle(req, res, deps) {
  const section = normalizeSlug(req.body?.section);
  if (!section) return res.status(400).json({ error: "section is required" });

  const order = Array.isArray(req.body?.order) ? req.body.order : null;
  if (!order || order.length === 0) return res.status(400).json({ error: "order is required" });

  const table = toMenuTable(section);
  const conn = await deps.pool.getConnection();

  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query(
      `SELECT id FROM \`${table}\` ORDER BY sort_order ASC, id ASC LIMIT 2000`
    );
    const existingIds = existingRows.map((r) => Number(r.id));

    if (order.length !== existingIds.length) {
      return res.status(400).json({ error: "order length mismatch" });
    }

    const exSet = new Set(existingIds);
    const ord = order.map((x) => Number(x));
    const ordSet = new Set(ord);

    if (ordSet.size !== existingIds.length) {
      return res.status(400).json({ error: "order must be unique permutation" });
    }
    for (const id of ordSet) {
      if (!exSet.has(id)) return res.status(400).json({ error: "order contains unknown id" });
    }

    // полный пересчёт sort_order = 1..N в заданном порядке
    for (let i = 0; i < ord.length; i++) {
      await conn.query(`UPDATE \`${table}\` SET sort_order = ? WHERE id = ?`, [i + 1, ord[i]]);
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function registerPrioritySavePost(app, deps) {
  app.post("/api/priority", (req, res, next) =>
    handle(req, res, deps).catch(next)
  );
}

module.exports = { registerPrioritySavePost };