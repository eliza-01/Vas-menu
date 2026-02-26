/**
 * App entry: Express server + API registration + static frontend + uploads.
 */
const path = require("path");
const express = require("express");

const { loadEnv } = require("./config/env");
const { createPool } = require("./infra/db/pool");
const { waitForDb } = require("./infra/db/waitForDb");
const { ensureSchema } = require("./infra/db/schema");
const { ensureUploadDir, mountUploadsStatic } = require("./infra/storage/uploadsStatic");
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
  mountUploadsStatic(app, env.uploadDir);

  const deps = { env, pool };

  registerHealthGet(app, deps);
  registerSectionsListGet(app, deps);
  registerSectionsCreatePost(app, deps);
  registerDishesListGet(app, deps);
  registerDishesCreatePost(app, deps);

  const frontendDir = path.join(process.cwd(), "frontend");
  app.use("/", express.static(frontendDir));

  app.use(errorMiddleware);

  app.listen(env.appPort, () => {
    console.log(`Webapp: ${env.baseUrl || `http://localhost:${env.appPort}`}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
