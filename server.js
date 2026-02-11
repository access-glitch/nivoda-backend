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

/* ======================
   ROOT CHECK (IMPORTANT)
====================== */
app.get("/", (req, res) => {
  res.send("Ring Builder Backend is running 🚀");
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
