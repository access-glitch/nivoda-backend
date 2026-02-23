const dotenv = require("dotenv");

dotenv.config({ override: true });

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStoreDomain(value) {
  const cleaned = cleanString(value).replace(/\s+/g, "");
  return cleaned
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .replace(/\/.*$/, "");
}

const nivodaApiKey = cleanString(process.env.NIVODA_API_KEY);
const nivodaUsername = cleanString(process.env.NIVODA_USERNAME);
const nivodaPassword = cleanString(process.env.NIVODA_PASSWORD);
const shopifyStoreDomain =
  normalizeStoreDomain(process.env.SHOPIFY_STORE_DOMAIN) || "danhov-2.myshopify.com";
const shopifyStorefrontToken = cleanString(process.env.SHOPIFY_STOREFRONT_TOKEN);
const shopifyAdminToken = cleanString(process.env.SHOPIFY_ADMIN_TOKEN);
const frontendUrl = cleanString(process.env.FRONTEND_URL) || "http://localhost:5173";

function readMetalConfig(prefix, defaults = {}) {
  const upper = String(prefix || "").toUpperCase();
  const legacyPrefix = upper === "GOLD";

  const readVar = (name, fallback = "") => cleanString(process.env[name]) || fallback;

  return {
    apiUrl: readVar(
      `${upper}_RATE_API_URL`,
      legacyPrefix ? readVar("GOLD_RATE_API_URL", defaults.apiUrl || "") : defaults.apiUrl || ""
    ),
    apiKey: readVar(
      `${upper}_RATE_API_KEY`,
      legacyPrefix ? readVar("GOLD_RATE_API_KEY", "") : ""
    ),
    apiKeyHeader: readVar(
      `${upper}_RATE_API_KEY_HEADER`,
      legacyPrefix ? readVar("GOLD_RATE_API_KEY_HEADER", "x-api-key") : "x-api-key"
    ),
    apiKeyPrefix: readVar(
      `${upper}_RATE_API_KEY_PREFIX`,
      legacyPrefix ? readVar("GOLD_RATE_API_KEY_PREFIX", "") : ""
    ),
    responsePath: readVar(
      `${upper}_RATE_RESPONSE_PATH`,
      legacyPrefix ? readVar("GOLD_RATE_RESPONSE_PATH", "ratePerGram") : "ratePerGram"
    ),
    multiplier: readVar(
      `${upper}_RATE_MULTIPLIER`,
      legacyPrefix ? readVar("GOLD_RATE_MULTIPLIER", "1") : "1"
    ),
    manualRate: readVar(
      `MANUAL_${upper}_RATE`,
      legacyPrefix ? readVar("MANUAL_GOLD_RATE", "") : ""
    ),
    currencyCode: readVar(
      `${upper}_RATE_CURRENCY`,
      legacyPrefix ? readVar("GOLD_RATE_CURRENCY", "USD") : "USD"
    ),
  };
}

const hasNivodaCreds =
  Boolean(nivodaApiKey) || (Boolean(nivodaUsername) && Boolean(nivodaPassword));

const missing = [];

if (!shopifyStoreDomain) missing.push("SHOPIFY_STORE_DOMAIN");
if (!shopifyStorefrontToken) missing.push("SHOPIFY_STOREFRONT_TOKEN");
if (!shopifyAdminToken) missing.push("SHOPIFY_ADMIN_TOKEN");
if (!hasNivodaCreds) missing.push("NIVODA_API_KEY (or NIVODA_USERNAME + NIVODA_PASSWORD)");

if (missing.length) {
  console.warn(
    `[env] Missing optional variables for full functionality: ${missing.join(", ")}. ` +
      "Server will start, but related endpoints may fail until configured."
  );
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  frontendUrl,
  nivoda: {
    apiUrl: cleanString(process.env.NIVODA_API_URL) || "https://integrations.nivoda.net/api/diamonds",
    apiKey: nivodaApiKey,
    username: nivodaUsername,
    password: nivodaPassword,
  },
  shopify: {
    storeDomain: shopifyStoreDomain,
    adminToken: shopifyAdminToken,
    storefrontToken: shopifyStorefrontToken,
    apiVersion: cleanString(process.env.SHOPIFY_API_VERSION) || "2025-01",
  },
  gold: readMetalConfig("gold"),
  platinum: readMetalConfig("platinum"),
};
