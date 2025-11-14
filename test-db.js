import pool from "./db.js";

(async () => {
  try {
    const [rows] = await pool.query("SELECT 1 AS test");
    console.log("✅ DB OK:", rows);
  } catch (err) {
    console.error("❌ DB ERROR:");
    console.error(err);
  } finally {
    process.exit();
  }
})();
