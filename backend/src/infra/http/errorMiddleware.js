/**
 * Express error middleware (JSON).
 */
function errorMiddleware(err, req, res, next) {
  const msg = err?.message || "server error";
  const status = /duplicate|ER_DUP_ENTRY/i.test(msg) ? 409 : 500;
  console.error(err);
  res.status(status).json({ error: msg });
}

module.exports = { errorMiddleware };
