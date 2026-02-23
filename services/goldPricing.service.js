const httpClient = require("../config/httpClient");
const env = require("../config/env");
const { AppError } = require("../utils/AppError");

const RATE_PRECISION = 10000;
const MONEY_PRECISION = 100;
const SUPPORTED_METALS = ["gold", "platinum"];

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .trim()
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundRate(value) {
  return Math.round((Number(value) + Number.EPSILON) * RATE_PRECISION) / RATE_PRECISION;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * MONEY_PRECISION) / MONEY_PRECISION;
}

function readPath(obj, path) {
  if (!obj || !path) return undefined;
  return String(path)
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function toPositiveNumber(value) {
  const parsed = toNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed;
}

function normalizeMetalType(metalType = "gold") {
  const normalized = String(metalType || "")
    .trim()
    .toLowerCase();
  return SUPPORTED_METALS.includes(normalized) ? normalized : "gold";
}

function getMetalConfig(metalType = "gold") {
  const normalized = normalizeMetalType(metalType);
  return normalized === "platinum" ? env.platinum : env.gold;
}

function buildMetalRateHeaders(metalType = "gold") {
  const config = getMetalConfig(metalType);
  const headers = {
    Accept: "application/json",
  };

  if (config.apiKey) {
    const keyHeader = config.apiKeyHeader || "x-api-key";
    const prefix = config.apiKeyPrefix || "";
    headers[keyHeader] = `${prefix}${config.apiKey}`;
  }

  return headers;
}

function pickRateFromPayload(payload = {}, metalType = "gold") {
  const config = getMetalConfig(metalType);
  const configuredPathValue = config.responsePath ? readPath(payload, config.responsePath) : null;

  const candidates = [
    configuredPathValue,
    payload?.ratePerGram,
    payload?.pricePerGram,
    payload?.price_per_gram,
    payload?.goldRatePerGram,
    payload?.data?.ratePerGram,
    payload?.data?.pricePerGram,
    payload?.data?.price_per_gram,
    payload?.result?.ratePerGram,
    payload?.result?.pricePerGram,
  ];

  for (const candidate of candidates) {
    const parsed = toPositiveNumber(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

async function fetchLiveGoldRate() {
  return fetchLiveMetalRate("gold");
}

async function fetchLiveMetalRate(metalType = "gold") {
  const normalizedMetal = normalizeMetalType(metalType);
  const config = getMetalConfig(normalizedMetal);

  if (!config.apiUrl) {
    return null;
  }

  try {
    const response = await httpClient.get(config.apiUrl, {
      headers: buildMetalRateHeaders(normalizedMetal),
    });
    const payload = response?.data || {};
    const rawRate = pickRateFromPayload(payload, normalizedMetal);
    if (rawRate === null) {
      return null;
    }

    const multiplier = toPositiveNumber(config.multiplier) || 1;
    const adjustedRate = roundRate(rawRate * multiplier);
    if (!Number.isFinite(adjustedRate) || adjustedRate <= 0) {
      return null;
    }

    return {
      metalType: normalizedMetal,
      ratePerGram: adjustedRate,
      source: "live",
      currencyCode: config.currencyCode,
      fallbackUsed: false,
      fetchedAt: new Date().toISOString(),
      providerUrl: config.apiUrl,
    };
  } catch (error) {
    throw new AppError(`Failed to fetch live ${normalizedMetal} rate`, 502, {
      message: error?.message || "Unknown error",
      response: error?.response?.data || null,
    });
  }
}

async function resolveGoldRate(options = {}) {
  return resolveMetalRate("gold", options);
}

async function resolveMetalRate(metalType = "gold", options = {}) {
  const normalizedMetal = normalizeMetalType(metalType);
  const config = getMetalConfig(normalizedMetal);
  const manualRates = options?.manualRates || {};

  const manualRateFromRequest = toPositiveNumber(
    manualRates[normalizedMetal] ?? (normalizedMetal === "gold" ? options.manualRate : null)
  );
  const manualRateFromEnv = toPositiveNumber(config.manualRate);

  let liveError = null;

  try {
    const liveRate = await fetchLiveMetalRate(normalizedMetal);
    if (liveRate?.ratePerGram) {
      return liveRate;
    }
  } catch (error) {
    liveError = error;
  }

  if (manualRateFromRequest !== null) {
    return {
      metalType: normalizedMetal,
      ratePerGram: roundRate(manualRateFromRequest),
      source: "manual-request",
      currencyCode: config.currencyCode,
      fallbackUsed: true,
      fetchedAt: new Date().toISOString(),
      providerUrl: null,
      fallbackReason: liveError?.message || "live_rate_unavailable",
    };
  }

  if (manualRateFromEnv !== null) {
    return {
      metalType: normalizedMetal,
      ratePerGram: roundRate(manualRateFromEnv),
      source: "manual-env",
      currencyCode: config.currencyCode,
      fallbackUsed: true,
      fetchedAt: new Date().toISOString(),
      providerUrl: null,
      fallbackReason: liveError?.message || "live_rate_unavailable",
    };
  }

  throw new AppError(`Unable to resolve ${normalizedMetal} rate`, 502, {
    message:
      `Live ${normalizedMetal} rate API failed (or missing), and no manual fallback is configured.`,
    liveError: liveError?.details || liveError?.message || null,
  });
}

async function resolveMetalRates(options = {}) {
  const rates = {};
  const errors = {};

  await Promise.all(
    SUPPORTED_METALS.map(async (metal) => {
      try {
        rates[metal] = await resolveMetalRate(metal, options);
      } catch (error) {
        rates[metal] = null;
        errors[metal] = error?.message || `Unable to resolve ${metal} rate`;
      }
    })
  );

  return {
    rates,
    errors,
    fetchedAt: new Date().toISOString(),
  };
}

function computeMetalPricing({
  metalWeightGrams,
  makingCharge,
  labourCost,
  stylePriceAdjustment,
  ratePerGram,
}) {
  const weight = toPositiveNumber(metalWeightGrams);
  const making = toNumber(makingCharge);
  const labour = toNumber(labourCost);
  const styleAdjustment = toNumber(stylePriceAdjustment);
  const normalizedMaking = Number.isFinite(making) && making >= 0 ? making : Number.isFinite(labour) && labour >= 0 ? labour : 0;
  const normalizedStyleAdjustment = Number.isFinite(styleAdjustment) ? styleAdjustment : 0;
  const rate = toPositiveNumber(ratePerGram);

  if (weight === null || rate === null) {
    return {
      configured: false,
      metalWeightGrams: weight,
      makingCharge: normalizedMaking,
      labourCost: normalizedMaking,
      stylePriceAdjustment: normalizedStyleAdjustment,
      ratePerGram: rate,
      metalValue: null,
      goldValue: null,
      finalPrice: null,
    };
  }

  const metalValue = roundMoney(weight * rate);
  const finalPrice = roundMoney(metalValue + normalizedMaking + normalizedStyleAdjustment);

  return {
    configured: true,
    metalWeightGrams: weight,
    makingCharge: normalizedMaking,
    labourCost: normalizedMaking,
    stylePriceAdjustment: normalizedStyleAdjustment,
    ratePerGram: roundRate(rate),
    metalValue,
    goldValue: metalValue,
    finalPrice,
  };
}

function computeGoldPricing({
  goldWeightGrams,
  labourCost,
  makingCharge,
  stylePriceAdjustment,
  ratePerGram,
}) {
  return computeMetalPricing({
    metalWeightGrams: goldWeightGrams,
    labourCost,
    makingCharge,
    stylePriceAdjustment,
    ratePerGram,
  });
}

module.exports = {
  toNumber,
  computeGoldPricing,
  computeMetalPricing,
  resolveGoldRate,
  resolveMetalRate,
  resolveMetalRates,
  normalizeMetalType,
};
