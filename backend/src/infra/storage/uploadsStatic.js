/**
 * Uploads directory bootstrap + express static mount.
 */
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

async function ensureUploadDir(uploadDir) {
  await fs.mkdir(uploadDir, { recursive: true });
}

function mountUploadsStatic(app, uploadDir, basePath = "") {
  const p = `${basePath}/uploads`;
  app.use(p, express.static(uploadDir, { maxAge: "1h", etag: true }));
}

function buildStoredFilename(originalName) {
  const ts = Date.now();
  const safeBase = path
    .basename(originalName)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 80);

  return `${ts}_${safeBase}`;
}

module.exports = { ensureUploadDir, mountUploadsStatic, buildStoredFilename };