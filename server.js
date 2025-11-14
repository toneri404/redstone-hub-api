import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import hofRoutes from "./routes/hof.js";
import wbcRoutes from "./routes/wbc.js";
import "./keepAlive.js";


dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: [
      "https://redstone-hof-wbc.vercel.app",
      "http://localhost:5173",
      "https://minershub.online",
      "https://www.minershub.online",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());


app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});



app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT DATABASE() AS db");
    res.json({ ok: true, db: rows[0].db });
  } catch (err) {
    console.error("DB test failed:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/hof", hofRoutes);
app.use("/api/wbc", wbcRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
