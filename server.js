const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const nivodaRoutes = require("./routes/nivoda.routes");
const shopifyRoutes = require("./routes/shopify.routes");
const orderRoutes = require("./routes/order.routes");
const { notFoundHandler } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const corsOrigins = env.frontendUrl
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy blocked this origin"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ring-builder-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", nivodaRoutes);
app.use("/api/shopify", shopifyRoutes);
app.use("/api/order", orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Backend running on 0.0.0.0:${env.port}`);
});
