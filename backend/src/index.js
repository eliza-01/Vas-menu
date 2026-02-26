/**
 * App entry: Express server + API registration + static frontend + uploads.
 * Also exposes API+uploads under /vas-menu/* for Cloudflare Tunnel path routing.
 */
const path = require("path");
const express = require("express");

const { loadEnv } = require("./config/env");
const { createPool } = require("./infra/db/pool");
const { waitForDb } = require("./infra/db/waitForDb");
const { ensureSchema } = require("./infra/db/schema");
const { ensureUploadDir } = require("./infra/storage/uploadsStatic");
const { errorMiddleware } = require("./infra/http/errorMiddleware");

const { registerHealthGet } = require("./api/health/get");
const { registerSectionsListGet } = require("./api/sections/getList");
const { registerSectionsCreatePost } = require("./api/sections/postCreate");
const { registerDishesListGet } = require("./api/dishes/getList");
const { registerDishesCreatePost } = require("./api/dishes/postCreate");

async function main() {
  const env = loadEnv();

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  const pool = createPool(env);
  await waitForDb(pool);
  await ensureSchema(pool);

  await ensureUploadDir(env.uploadDir);

  // uploads: доступны и в корне, и под /vas-menu
  app.use("/uploads", express.static(env.uploadDir, { maxAge: "1h", etag: true }));
  app.use("/vas-menu/uploads", express.static(env.uploadDir, { maxAge: "1h", etag: true }));

  const deps = { env, pool };

  // API router: монтируем и в корень, и под /vas-menu
  const api = express.Router();
  registerHealthGet(api, deps);
  registerSectionsListGet(api, deps);
  registerSectionsCreatePost(api, deps);
  registerDishesListGet(api, deps);
  registerDishesCreatePost(api, deps);

  app.use(api);
  app.use("/vas-menu", api);

  // Frontend
  const frontendDir = path.join(process.cwd(), "frontend");
  const indexHtml = path.join(frontendDir, "index.html");

  app.use("/", express.static(frontendDir));
  app.use("/vas-menu", express.static(frontendDir));
  app.get("/vas-menu", (req, res) => res.sendFile(indexHtml));
  app.get("/vas-menu/*", (req, res) => res.sendFile(indexHtml));

  app.use(errorMiddleware);

  app.listen(env.appPort, () => {
    console.log(`Webapp: ${env.baseUrl || `http://localhost:${env.appPort}`}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});