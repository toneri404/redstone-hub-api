import { pool } from "./db.js";

setInterval(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("DB keep-alive ping OK");
  } catch (err) {
    console.log("Keep-alive error:", err.message);
  }
}, 2 * 60 * 1000);

