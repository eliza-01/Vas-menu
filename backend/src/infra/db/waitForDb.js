/**
 * Startup wait: ping DB with retries (fast fail if misconfigured).
 */
async function waitForDb(pool) {
  const startedAt = Date.now();
  const maxMs = 45_000;

  while (true) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (e) {
      if (Date.now() - startedAt > maxMs) throw e;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

module.exports = { waitForDb };
