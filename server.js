// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import hofRoutes from "./routes/hof.js";
import wbcRoutes from "./routes/wbc.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// test route (you already have this)
app.get("/test-db", async (req, res) => {
  const [rows] = await pool.query("SELECT DATABASE() AS db");
  res.json({ ok: true, db: rows[0].db });
});

// auth
app.use("/api/auth", authRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
app.use("/api/auth", authRoutes);
app.use("/api/hof", hofRoutes);
app.use("/api/wbc", wbcRoutes);