const dotenv = require("dotenv");

dotenv.config();

const required = [
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_ADMIN_TOKEN",
  "SHOPIFY_STOREFRONT_TOKEN",
  "FRONTEND_URL",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (!process.env.NIVODA_API_KEY && !(process.env.NIVODA_USERNAME && process.env.NIVODA_PASSWORD)) {
  throw new Error(
    "Missing Nivoda credentials: set NIVODA_API_KEY or NIVODA_USERNAME and NIVODA_PASSWORD"
  );
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  frontendUrl: process.env.FRONTEND_URL,
  nivoda: {
    apiUrl: process.env.NIVODA_API_URL || "https://integrations.nivoda.net/api/diamonds",
    apiKey: process.env.NIVODA_API_KEY,
    username: process.env.NIVODA_USERNAME,
    password: process.env.NIVODA_PASSWORD,
  },
  shopify: {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
    adminToken: process.env.SHOPIFY_ADMIN_TOKEN,
    storefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN,
    apiVersion: process.env.SHOPIFY_API_VERSION || "2025-01",
  },
};
