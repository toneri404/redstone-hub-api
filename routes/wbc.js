import { Router } from "express";
import { pool } from "../db.js";

const router = Router();
const requireAuth = (req, res, next) => next();

/**
 * GET /api/wbc
 * Optional query: month, year
 */
router.get("/", async (req, res) => {
  try {
    let query = "SELECT * FROM wbc_entries";
    const params = [];
    const where = [];

    const { month, year } = req.query;

    if (month) {
      where.push("month = ?");
      params.push(month);
    }
    if (year) {
      where.push("year = ?");
      params.push(year);
    }

    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }

    query += " ORDER BY year DESC, month DESC, created_at DESC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching WBC entries:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch WBC entries" });
  }
});

/**
 * Keep using the same creators table as HoF for discord profiles
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
    console.error("Error fetching WBC profile:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch profile" });
  }
});

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
 * POST /api/wbc
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name,
      month,
      year,
      date_range,
      link,
      discord,
      x_handle,
      avatar,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO wbc_entries
       (name, month, year, date_range, link, discord, x_handle, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        month,
        year || null,
        date_range || null,
        link || null,
        discord || null,
        x_handle || null,
        avatar || null,
      ]
    );

    if (discord) {
      await upsertCreatorProfile({ discord, name, avatar, x_handle });
    }

    const [rows] = await pool.query(
      "SELECT * FROM wbc_entries WHERE id = ?",
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

// UPDATE full WBC entry
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      month,
      year,
      date_range,
      link,
      discord,
      x_handle,
      avatar,
    } = req.body;

    const [result] = await pool.query(
      `UPDATE wbc_entries
       SET name = ?, month = ?, year = ?, date_range = ?, link = ?,
           discord = ?, x_handle = ?, avatar = ?
       WHERE id = ?`,
      [
        name,
        month,
        year || null,
        date_range || null,
        link || null,
        discord || null,
        x_handle || null,
        avatar || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "WBC entry not found" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM wbc_entries WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating WBC entry:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to update WBC entry" });
  }
});


/**
 * DELETE /api/wbc/:id
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM wbc_entries WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "WBC entry not found" });
    }

    res.json({ message: "WBC entry deleted", id });
  } catch (err) {
    console.error("Error deleting WBC entry:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to delete WBC entry" });
  }
});

export default router;
