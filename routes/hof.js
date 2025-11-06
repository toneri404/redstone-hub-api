// routes/hof.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// TEMP: keep or replace with your real auth
const requireAuth = (req, res, next) => next();

/**
 * GET /api/hof
 * Optional query: month, year, category
 */
router.get("/", async (req, res) => {
  try {
    let query = "SELECT * FROM hof_entries";
    const conditions = [];
    const params = [];

    // Optional filters (month, year, category)
    if (req.query.month) {
      conditions.push("month = ?");
      params.push(req.query.month);
    }
    if (req.query.year) {
      conditions.push("year = ?");
      params.push(req.query.year);
    }
    if (req.query.category) {
      conditions.push("category = ?");
      params.push(req.query.category);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ HoF GET error:", err.message, err);
    res.status(500).send(err.message || "Failed to fetch HoF entries");
  }
});

/**
 * GET /api/hof/profile?discord=Toneri#0404
 * Returns saved name, avatar, x_handle for that discord, if any
 */
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const { discord } = req.query;
    if (!discord) {
      return res.status(400).json({ message: "discord is required" });
    }

    const [rows] = await pool.query(
      "SELECT discord, display_name AS name, avatar, x_handle FROM creators WHERE discord = ?",
      [discord]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// helper to sync creators table
async function upsertCreatorProfile({ discord, name, avatar, x_handle }) {
  if (!discord) return;
  await pool.query(
    `INSERT INTO creators (discord, display_name, avatar, x_handle)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       display_name = VALUES(display_name),
       avatar = VALUES(avatar),
       x_handle = VALUES(x_handle)`,
    [discord, name || null, avatar || null, x_handle || null]
  );
}

/**
 * POST /api/hof
 * Body: name, category, month, year, link, avatar, discord, x_handle, placement
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    let {
      name,
      category,
      month,
      year,
      link,
      avatar,
      discord,
      x_handle,
      placement,
    } = req.body;

    // insert HoF entry
    const [result] = await pool.query(
      `INSERT INTO hof_entries 
       (name, category, month, year, link, avatar, discord, x_handle, placement) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        category,
        month,
        year || null,
        link,
        avatar,
        discord,
        x_handle,
        placement || null,
      ]
    );

    // update or create profile for this discord
    if (discord) {
      await upsertCreatorProfile({ discord, name, avatar, x_handle });
    }

    const [rows] = await pool.query(
      "SELECT * FROM hof_entries WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating WBC entry:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to create WBC entry" });
  }
});

/**
 * PUT /api/hof/:id
 * Full update (including placement and profile sync)
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      month,
      year,
      link,
      avatar,
      discord,
      x_handle,
      placement,
    } = req.body;

    const [result] = await pool.query(
      `UPDATE hof_entries 
       SET name = ?, category = ?, month = ?, year = ?, link = ?, 
           avatar = ?, discord = ?, x_handle = ?, placement = ?
       WHERE id = ?`,
      [
        name,
        category,
        month,
        year || null,
        link,
        avatar,
        discord,
        x_handle,
        placement || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "HoF entry not found" });
    }

    // sync profile as well
    if (discord) {
      await upsertCreatorProfile({ discord, name, avatar, x_handle });
    }

    const [rows] = await pool.query(
      "SELECT * FROM hof_entries WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating HoF entry:", err);
    res.status(500).json({ message: "Failed to update HoF entry" });
  }
});

/**
 * PATCH /api/hof/:id/placement
 * Update only placement
 */
router.patch("/:id/placement", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { placement } = req.body;

    const [result] = await pool.query(
      "UPDATE hof_entries SET placement = ? WHERE id = ?",
      [placement || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "HoF entry not found" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM hof_entries WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating placement:", err);
    res.status(500).json({ message: "Failed to update placement" });
  }
});

// UPDATE full HoF entry
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      month,
      year,
      link,
      avatar,
      discord,
      x_handle,
      placement,
    } = req.body;

    const [result] = await pool.query(
      `UPDATE hof_entries
       SET name = ?, category = ?, month = ?, year = ?, link = ?,
           avatar = ?, discord = ?, x_handle = ?, placement = ?
       WHERE id = ?`,
      [
        name,
        category,
        month,
        year || null,
        link || null,
        avatar || null,
        discord || null,
        x_handle || null,
        placement || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "HoF entry not found" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM hof_entries WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating HoF entry:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to update HoF entry" });
  }
});


/**
 * DELETE /api/hof/:id
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM hof_entries WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "HoF entry not found" });
    }

    res.json({ message: "HoF entry deleted", id });
  } catch (err) {
    console.error("Error deleting HoF entry:", err);
    res.status(500).json({ message: "Failed to delete HoF entry" });
  }
});

export default router;
