// create-admin.js
import { pool } from "./db.js";
import bcrypt from "bcrypt";

const username = "admin";
const password = "redstone123";

async function main() {
  try {
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
      [username, hash]
    );

    console.log("Admin created:", username);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
}

main();
