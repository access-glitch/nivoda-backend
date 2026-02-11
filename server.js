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
    - Custom CORS handling to support Private Network Access (Access-Control-Allow-Private-Network)
       so a frontend hosted on a public origin can call a backend on localhost during development
       when the browser issues preflight requests.
====================== */
app.use(express.json());

app.use((req, res, next) => {
   const origin = req.headers.origin;

   // Determine allowed origin header
   if (corsOrigins && origin && corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
   } else if (!corsOrigins && origin) {
      // If no specific origins configured, echo origin (allow any)
      res.setHeader("Access-Control-Allow-Origin", origin);
   }

   res.setHeader("Vary", "Origin");
   res.setHeader("Access-Control-Allow-Credentials", "true");

   // If this is a preflight request, respond with the required headers
   if (req.method === "OPTIONS") {
      const acrHeaders = req.headers["access-control-request-headers"];
      if (acrHeaders) res.setHeader("Access-Control-Allow-Headers", acrHeaders);

      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

      // Chrome/Chromium will include Access-Control-Request-Private-Network when making requests
      // from a public context to a private network (like localhost). If present, we must opt-in.
      if (req.headers["access-control-request-private-network"]) {
         res.setHeader("Access-Control-Allow-Private-Network", "true");
      }

      return res.status(204).send();
   }

   next();
});

// Keep using the CORS middleware for more advanced handling if needed (no-op when we already set headers)
app.use(cors());

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
