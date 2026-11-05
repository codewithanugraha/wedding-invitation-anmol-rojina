/* POST: save a response. Nothing here reads responses back. */
const { supabase, isSameSite, cleanText, readBody, deny } = require("./_supabase");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return deny(res, 405, "Not allowed");
    }
    if (!isSameSite(req)) return deny(res, 403, "Not allowed");

    const body = readBody(req);
    const name = cleanText(body.name, 60);
    if (!name || typeof body.attending !== "boolean") {
      return deny(res, 400, "A name and a choice are required");
    }

    const db = await supabase("rsvps?columns=name,attending", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ name, attending: body.attending }),
    });
    if (!db.ok) throw new Error(`Supabase replied ${db.status}`);
    res.setHeader("Cache-Control", "no-store");
    return res.status(201).json({ saved: true });
  } catch (err) {
    console.error("RSVP request failed:", err.message);
    return deny(res, 502, "Responses are unavailable");
  }
};
