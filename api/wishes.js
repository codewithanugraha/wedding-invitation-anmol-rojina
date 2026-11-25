/* GET: one page of visible wishes, newest first. POST: add a wish.
   GET ?before=<created_at>&id=<id> returns the page after that wish, as
   { wishes: [...], more: true|false }. */
const { supabase, isSameSite, cleanText, readBody, deny } = require("./_supabase");

const FIELDS = "id,name,message,created_at";
const MAX_WISH = 60; // about two lines on a phone; js/wishes.js has the same limit
const PAGE_SIZE = 10; // js/wishes.js asks for the same number
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

/* The filter for wishes older than the last one on screen. Wishes sent in the
   same instant are told apart by id, so none is skipped or shown twice. */
function afterFilter(query) {
  const before = typeof query.before === "string" ? query.before : "";
  const id = typeof query.id === "string" ? query.id : "";
  if (!before && !id) return "";
  if (!TIMESTAMP.test(before) || !/^\d{1,18}$/.test(id)) return null;
  const at = `"${before}"`;
  return "&or=" + encodeURIComponent(`(created_at.lt.${at},and(created_at.eq.${at},id.lt.${id}))`);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const filter = afterFilter(req.query || {});
      if (filter === null) return deny(res, 400, "Invalid page");
      // One extra row says whether there is another page.
      const db = await supabase(
        `wishes?select=${FIELDS}&order=created_at.desc,id.desc&limit=${PAGE_SIZE + 1}${filter}`
      );
      if (!db.ok) throw new Error(`Supabase replied ${db.status}`);
      const rows = await db.json();
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ wishes: rows.slice(0, PAGE_SIZE), more: rows.length > PAGE_SIZE });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return deny(res, 405, "Not allowed");
    }
    if (!isSameSite(req)) return deny(res, 403, "Not allowed");

    const body = readBody(req);
    const name = cleanText(body.name, 60);
    const message = cleanText(
      typeof body.message === "string" ? body.message.replace(/\s+/g, " ") : null,
      MAX_WISH
    );
    if (!name || !message) return deny(res, 400, "A name and a wish are required");

    const db = await supabase(`wishes?columns=name,message&select=${FIELDS}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name, message }),
    });
    if (!db.ok) throw new Error(`Supabase replied ${db.status}`);
    const rows = await db.json();
    res.setHeader("Cache-Control", "no-store");
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Guest book request failed:", err.message);
    return deny(res, 502, "The guest book is unavailable");
  }
};
