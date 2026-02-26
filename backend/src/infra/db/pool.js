// backend/src/infra/db/pool.js
/**
 * MySQL pool factory.
 */
const mysql = require("mysql2/promise");

function createPool(env) {
  return mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    timezone: "Z",
  });
}

module.exports = { createPool };
