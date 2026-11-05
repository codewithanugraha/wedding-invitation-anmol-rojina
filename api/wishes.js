/* GET: the visible wishes. POST: add a wish. */
const { supabase, isSameSite, cleanText, readBody, deny } = require("./_supabase");

const FIELDS = "id,name,message,created_at";

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const db = await supabase(`wishes?select=${FIELDS}&order=created_at.desc&limit=200`);
      if (!db.ok) throw new Error(`Supabase replied ${db.status}`);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(await db.json());
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return deny(res, 405, "Not allowed");
    }
    if (!isSameSite(req)) return deny(res, 403, "Not allowed");

    const body = readBody(req);
    const name = cleanText(body.name, 60);
    const message = cleanText(body.message, 500);
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
