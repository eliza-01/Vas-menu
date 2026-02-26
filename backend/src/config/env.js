/**
 * Environment reader (no .env dependency to keep docker-only).
 */
function loadEnv() {
  const appPort = Number(process.env.APP_PORT || 3000);
  const baseUrl = process.env.BASE_URL || "";
  const uploadDir = process.env.UPLOAD_DIR || "/app/uploads";

  return {
    appPort,
    baseUrl,
    uploadDir,
    db: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "admin",
      password: process.env.DB_PASSWORD || "admin",
      database: process.env.DB_NAME || "restaurant",
    },
  };
}

module.exports = { loadEnv };
