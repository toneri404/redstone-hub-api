// create-admin.js
import { pool } from "./db.js";
import bcrypt from "bcrypt";

const username = "admin";           // 👈 your login name
const password = "redstone123";     // 👈 your password (pick anything)

async function main() {
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO admins (username, password_hash, role) VALUES (?, ?, 'superadmin')",
    [username, hash]
  );

  console.log("✅ Admin created:", username);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
