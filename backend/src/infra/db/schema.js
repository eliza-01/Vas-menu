/**
 * DB schema bootstrap + migrations for menu_* tables (decor + notes + sort_order).
 */
const { toMenuTable } = require("../../domain/sections/slug");

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sections (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(120) NOT NULL,
      slug VARCHAR(64) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_sections_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [[c]] = await pool.query("SELECT COUNT(*) AS cnt FROM sections");
  if (Number(c?.cnt || 0) === 0) {
    await pool.query(
      "INSERT INTO sections (title, slug) VALUES (?, ?), (?, ?), (?, ?), (?, ?)",
      ["Закуски", "snacks", "Салаты", "salads", "Горячие блюда", "mains", "Десерты", "desserts"]
    );
  }

  const [sections] = await pool.query("SELECT slug FROM sections ORDER BY id ASC");
  for (const s of sections) {
    const table = toMenuTable(s.slug);

    await pool.query(`
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

    await ensureJsonArrayNotNull(pool, table, "decor");
    await ensureColumn(pool, table, "notes", "VARCHAR(2000) NOT NULL DEFAULT ''");
    const addedSort = await ensureColumn(pool, table, "sort_order", "INT UNSIGNED NOT NULL DEFAULT 0");

    if (addedSort || (await isSortOrderAllZero(pool, table))) {
      await initSortOrder(pool, table);
    }
  }
}

async function ensureColumn(pool, table, column, ddl) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );

  if (rows.length) return false;
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
  return true;
}

async function ensureJsonArrayNotNull(pool, table, column) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  if (rows.length) return false;

  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` JSON NULL`);
  await pool.query(`UPDATE \`${table}\` SET \`${column}\` = JSON_ARRAY() WHERE \`${column}\` IS NULL`);
  await pool.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` JSON NOT NULL`);
  return true;
}

async function isSortOrderAllZero(pool, table) {
  const [[r]] = await pool.query(
    `SELECT COUNT(*) AS cnt,
            SUM(CASE WHEN sort_order = 0 THEN 1 ELSE 0 END) AS zeros
     FROM \`${table}\``
  );

  const cnt = Number(r?.cnt || 0);
  const zeros = Number(r?.zeros || 0);
  return cnt > 0 && zeros === cnt;
}

async function initSortOrder(pool, table) {
  await pool.query(
    `UPDATE \`${table}\` t
     JOIN (
       SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) AS rn
       FROM \`${table}\`
     ) x ON x.id = t.id
     SET t.sort_order = x.rn`
  );
}

module.exports = { ensureSchema };