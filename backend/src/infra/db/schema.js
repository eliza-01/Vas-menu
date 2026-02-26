/**
 * Minimal schema bootstrap: sections table + menu_<slug> tables + lightweight migrations.
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

  const [rows] = await pool.query("SELECT COUNT(*) AS cnt FROM sections");
  if (Number(rows?.[0]?.cnt || 0) === 0) {
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
        choices JSON NOT NULL,
        notes VARCHAR(2000) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await ensureColumn(pool, table, "notes", "VARCHAR(2000) NOT NULL DEFAULT ''");
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

  if (rows.length) return;
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
}

module.exports = { ensureSchema };