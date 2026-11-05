/* Shared by the server functions. Files starting with "_" are not public routes.
   SUPABASE_URL and SUPABASE_KEY live in Vercel's settings and never reach the browser. */
const TIMEOUT_MS = 10000;

function supabase(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_KEY is not set");

  return fetch(`${url.replace(/\/+$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/* Only this site's own pages may send to the forms. */
function isSameSite(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/* The cleaned text, or null if it is missing, empty or too long. */
function cleanText(value, maxLength) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

/* Reading req.body throws when the request has invalid JSON. */
function readBody(req) {
  try {
    return req.body && typeof req.body === "object" ? req.body : {};
  } catch {
    return {};
  }
}

function deny(res, status, message) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json({ error: message });
}

module.exports = { supabase, isSameSite, cleanText, readBody, deny };
