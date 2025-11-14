import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const isProd = process.env.NODE_ENV === "production";

export function requireAuth(req, res, next) {
  const bearer = req.headers.authorization || "";
  const tokenFromHeader = bearer.startsWith("Bearer ")
    ? bearer.slice(7)
    : null;

  const token = req.cookies?.token || tokenFromHeader;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

router.post("/login", async (req, res) => {
  const { username, password, rememberMe } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  const [rows] = await pool.query(
    "SELECT * FROM admins WHERE username = ?",
    [username]
  );
  const admin = rows[0];

  if (!admin) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const expiresIn = rememberMe ? "30d" : "12h";
  const maxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000   // 30 days
    : 12 * 60 * 60 * 1000;      // 12 hours

  const token = jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    JWT_SECRET,
    { expiresIn }
  );

  res
    .cookie("token", token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge,
      path: "/",
    })
    .json({
      message: "Logged in",
      admin: { id: admin.id, username: admin.username, role: admin.role },
      rememberMe: !!rememberMe,
    });
});

router.post("/login", async (req, res) => {
  const { username, password, rememberMe } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM admins WHERE username = ?",
      [username]
    );
    const admin = rows[0];

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const expiresIn = rememberMe ? "30d" : "12h";
    const maxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000   
      : 12 * 60 * 60 * 1000;     

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn }
    );

    res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        maxAge,
        path: "/",
      })
      .json({
        message: "Logged in",
        admin: { id: admin.id, username: admin.username, role: admin.role },
        rememberMe: !!rememberMe,
      });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ message: "Server error during login, please try again" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ admin: req.admin });
});

export default router;

export function requireSuperadmin(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.admin.role !== "superadmin") {
    return res.status(403).json({ message: "Superadmin role required" });
  }
  next();
}
