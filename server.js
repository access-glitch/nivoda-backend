const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigins = process.env.CORS_ORIGIN
   ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
   : null;

/* ======================
   MIDDLEWARE
====================== */
app.use(
   cors(
      corsOrigins
         ? {
               origin: corsOrigins,
            }
         : undefined
   )
);
app.use(express.json());

// Serve optional public assets (put images or static files in ./public)
app.use("/public", express.static(path.join(__dirname, "public")));

/* ======================
   ROOT CHECK (IMPORTANT)
====================== */
app.get("/", (req, res) => {
  res.send("Ring Builder Backend is running 🚀");
});

// simple health check for render or other platforms
app.get("/api/health", (req, res) => {
   res.json({ status: "ok", uptime: process.uptime() });
});

/* ======================
   API ROUTES
====================== */
app.use("/api/diamonds", require("./routes/diamonds"));
app.use("/api/gold", require("./routes/gold"));
app.use("/api/price", require("./routes/price"));

/* ======================
   SERVER START
====================== */
app.listen(PORT, () => {
   console.log(`Backend running on http://localhost:${PORT}`);
});
