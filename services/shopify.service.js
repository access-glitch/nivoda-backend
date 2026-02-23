const httpClient = require("../config/httpClient");
const env = require("../config/env");
const { AppError } = require("../utils/AppError");
const {
  computeMetalPricing,
  resolveGoldRate,
  resolveMetalRates,
  toNumber,
} = require("./goldPricing.service");

const storefrontUrl = `https://${env.shopify.storeDomain}/api/${env.shopify.apiVersion}/graphql.json`;
const adminUrl = `https://${env.shopify.storeDomain}/admin/api/${env.shopify.apiVersion}/graphql.json`;

const toLower = (value) => String(value || "").toLowerCase();
const MEDIA_VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m3u8)(\?.*)?$/i;
const MEDIA_MODEL_EXTENSIONS = /\.(glb|gltf|usdz)(\?.*)?$/i;

const inferMediaPurpose = (alt = "", src = "") => {
  const text = `${toLower(alt)} ${toLower(src)}`;
  if (text.includes("3d") || text.includes("360") || text.includes("diamond video")) return "diamond-3d";
  if (text.includes("hand")) return "hand";
  if (text.includes("side") || text.includes("profile")) return "side";
  if (text.includes("lifestyle")) return "lifestyle";
  if (text.includes("angle")) return "angle";
  return "default";
};

const toCollectionTitle = (value = "") =>
  String(value || "")
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getCollectionProductCount = (entry = {}) => {
  const directCount = Number(entry?.products_count ?? entry?.productsCount);
  if (Number.isFinite(directCount) && directCount >= 0) {
    return directCount;
  }

  const edgeCount = Array.isArray(entry?.products?.edges) ? entry.products.edges.length : null;
  if (Number.isFinite(edgeCount) && edgeCount >= 0) {
    return edgeCount;
  }

  return null;
};

const normalizeCollectionEntry = (entry = {}) => {
  const handle = String(entry?.handle || "").trim().toLowerCase();
  if (!handle) return null;

  const title = String(entry?.title || "").trim() || toCollectionTitle(handle);

  return {
    key: handle,
    slug: handle,
    title,
    handle,
    handles: [handle],
    productsCount: getCollectionProductCount(entry),
  };
};

const uniqueCollections = (entries = []) => {
  const byHandle = new Map();
  (entries || []).forEach((entry) => {
    const normalized = normalizeCollectionEntry(entry);
    if (!normalized) return;
    if (!byHandle.has(normalized.handle)) {
      byHandle.set(normalized.handle, normalized);
    }
  });
  return [...byHandle.values()];
};

const makeMediaItem = ({
  id,
  type = "image",
  src = "",
  poster = "",
  alt = "",
  purpose = "",
  mimeType = "",
}) => {
  const normalizedSrc = String(src || "").trim();
  if (!normalizedSrc) return null;

  const normalizedType = (() => {
    const lowerType = toLower(type);
    if (lowerType.includes("video")) return "video";
    if (lowerType.includes("model")) return "model";
    if (MEDIA_MODEL_EXTENSIONS.test(normalizedSrc)) return "model";
    if (MEDIA_VIDEO_EXTENSIONS.test(normalizedSrc)) return "video";
    return "image";
  })();

  return {
    id: id || `${normalizedType}-${normalizedSrc}`,
    type: normalizedType,
    src: normalizedSrc,
    poster: String(poster || (normalizedType === "image" ? normalizedSrc : "")).trim(),
    alt: String(alt || "").trim(),
    purpose: purpose || inferMediaPurpose(alt, normalizedSrc),
    mimeType: String(mimeType || "").trim(),
  };
};

const uniqueMedia = (items = []) => {
  const seen = new Set();
  const output = [];

  items.forEach((item) => {
    if (!item?.src) return;
    const key = `${item.type}::${item.src}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(item);
  });

  return output;
};

const mapPublicMedia = (images = []) =>
  uniqueMedia(
    (images || [])
      .map((image, index) => {
        const isStringImage = typeof image === "string";
        const src = isStringImage ? image : image?.src || image?.url || "";
        const alt = isStringImage ? "" : image?.alt || image?.altText || "";
        const id = !isStringImage && image?.id ? String(image.id) : `image-${index}`;

        return makeMediaItem({
          id,
          type: "image",
          src,
          poster: src,
          alt,
        });
      })
      .filter(Boolean)
  );

const pickNumericMetafield = (
  candidates = [],
  { allowZero = false, allowNegative = false } = {}
) => {
  for (const candidate of candidates) {
    const value = toNumber(candidate?.value);
    if (value === null) continue;
    if (allowNegative ? Number.isFinite(value) : allowZero ? value >= 0 : value > 0) {
      return {
        value,
        source: candidate?.source || null,
      };
    }
  }

  return { value: null, source: null };
};

const formatAmountLabel = (amount = 0, currencyCode = "USD") =>
  `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currencyCode}`;

const stripHtml = (value = "") =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseJsonLikeValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;

  const raw = String(value || "").trim();
  if (!raw) return null;

  if (
    (raw.startsWith("{") && raw.endsWith("}")) ||
    (raw.startsWith("[") && raw.endsWith("]"))
  ) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return raw;
    }
  }

  return raw;
};

const normalizeReviewRating = (value) => {
  const parsed = toNumber(value);
  if (parsed === null) return null;

  let normalized = parsed;
  if (normalized > 5 && normalized <= 100) {
    normalized = normalized / 20;
  }

  if (!Number.isFinite(normalized) || normalized < 0) return null;
  return Math.round(Math.min(5, normalized) * 10) / 10;
};

const resolveReviewRatingValue = (value) => {
  const direct = normalizeReviewRating(value);
  if (direct !== null) return direct;

  const parsed = parseJsonLikeValue(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const candidates = [
    parsed?.value,
    parsed?.rating,
    parsed?.average,
    parsed?.score,
    parsed?.rating?.value,
    parsed?.rating?.average,
    parsed?.rating?.score,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeReviewRating(candidate);
    if (normalized !== null) return normalized;
  }

  return null;
};

const resolveReviewCountValue = (value) => {
  if (value === null || value === undefined) return null;

  const direct = Number.parseInt(String(value).replace(/[^0-9-]/g, ""), 10);
  if (Number.isFinite(direct) && direct >= 0) return direct;

  const parsed = parseJsonLikeValue(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const candidates = [
    parsed?.count,
    parsed?.total,
    parsed?.total_count,
    parsed?.value,
    parsed?.rating_count,
  ];

  for (const candidate of candidates) {
    const next = Number.parseInt(String(candidate).replace(/[^0-9-]/g, ""), 10);
    if (Number.isFinite(next) && next >= 0) {
      return next;
    }
  }

  return null;
};

const normalizeReviewEntry = (entry = {}, index = 0) => {
  if (!entry || typeof entry !== "object") return null;

  const author = String(
    entry?.author || entry?.name || entry?.reviewer || entry?.customer || entry?.user || ""
  ).trim();
  const title = String(entry?.title || entry?.headline || "").trim();
  const body = String(
    entry?.body || entry?.content || entry?.comment || entry?.message || entry?.text || ""
  ).trim();
  const rating = resolveReviewRatingValue(
    entry?.rating ?? entry?.stars ?? entry?.score ?? entry?.value
  );
  const createdAt = String(
    entry?.createdAt || entry?.created_at || entry?.date || entry?.posted_at || ""
  ).trim();

  if (!author && !title && !body && rating === null) return null;

  return {
    id:
      String(entry?.id || entry?.review_id || "").trim() ||
      `review-${index + 1}-${String(author || title || "entry").toLowerCase().replace(/\s+/g, "-")}`,
    author: author || "Verified Buyer",
    title,
    body,
    rating,
    createdAt: createdAt || null,
  };
};

const parseReviewListMetafield = (value = "") => {
  const parsed = parseJsonLikeValue(value);
  if (!parsed) return [];

  const normalizeList = (list = []) =>
    (list || []).map((entry, index) => normalizeReviewEntry(entry, index)).filter(Boolean);

  if (Array.isArray(parsed)) {
    return normalizeList(parsed);
  }

  if (typeof parsed !== "object") {
    return [];
  }

  const listCandidates = [parsed?.reviews, parsed?.items, parsed?.data, parsed?.nodes];
  for (const list of listCandidates) {
    if (Array.isArray(list)) {
      return normalizeList(list);
    }
  }

  const single = normalizeReviewEntry(parsed, 0);
  return single ? [single] : [];
};

const uniqueReviews = (reviews = []) => {
  const seen = new Set();
  const output = [];

  (reviews || []).forEach((review, index) => {
    if (!review) return;
    const key = [
      String(review?.id || ""),
      toLower(review?.author),
      toLower(review?.title),
      toLower(review?.body),
      String(review?.createdAt || ""),
    ].join("|");

    if (seen.has(key)) return;
    seen.add(key);
    output.push({
      ...review,
      id: review?.id || `review-${index + 1}`,
    });
  });

  return output;
};

const buildProductReviews = (node = {}) => {
  const ratingCandidates = [
    node?.reviewsRatingMetafield?.value,
    node?.customRatingMetafield?.value,
  ];
  const ratingCountCandidates = [
    node?.reviewsRatingCountMetafield?.value,
    node?.customRatingCountMetafield?.value,
  ];

  const averageRating =
    ratingCandidates
      .map((candidate) => resolveReviewRatingValue(candidate))
      .find((value) => value !== null) ?? null;
  const ratingCount =
    ratingCountCandidates
      .map((candidate) => resolveReviewCountValue(candidate))
      .find((value) => value !== null) ?? null;

  const reviewItems = uniqueReviews([
    ...parseReviewListMetafield(node?.reviewsJsonMetafield?.value),
    ...parseReviewListMetafield(node?.reviewsMetafield?.value),
    ...parseReviewListMetafield(node?.reviewListMetafield?.value),
    ...parseReviewListMetafield(node?.sprReviewsMetafield?.value),
  ]).slice(0, 36);

  const ratedItems = reviewItems
    .map((entry) => resolveReviewRatingValue(entry?.rating))
    .filter((value) => value !== null);
  const averageFromItems = ratedItems.length
    ? Math.round((ratedItems.reduce((sum, value) => sum + value, 0) / ratedItems.length) * 10) / 10
    : null;

  return {
    averageRating: averageRating ?? averageFromItems,
    count:
      ratingCount !== null
        ? Math.max(ratingCount, reviewItems.length)
        : reviewItems.length,
    items: reviewItems,
  };
};

const METAL_OPTION_REGEX = /(metal|matel|metel|matal|color|colour|material|alloy|finish)/i;
const METAL_OPTION_NAME_REGEX = /(metal|matel|metel|matal|material|alloy|finish)/i;
const METAL_VALUE_REGEX = /(gold|platinum|\bwg\b|\byg\b|\brg\b|\bpt\b)/i;

const normalizeMetalType = (value = "") => {
  const text = toLower(value);
  if (text.includes("platinum")) return "platinum";
  return "gold";
};

const getVariantMetalLabel = (variant = {}) => {
  const selectedOptions = Array.isArray(variant?.selectedOptions) ? variant.selectedOptions : [];
  const directMetal = selectedOptions.find(
    (option) =>
      METAL_OPTION_NAME_REGEX.test(String(option?.name || "")) &&
      METAL_VALUE_REGEX.test(String(option?.value || ""))
  );
  if (directMetal?.value) return String(directMetal.value).trim();

  const colorBackfill = selectedOptions.find(
    (option) =>
      METAL_OPTION_REGEX.test(String(option?.name || "")) &&
      METAL_VALUE_REGEX.test(String(option?.value || ""))
  );
  if (colorBackfill?.value) return String(colorBackfill.value).trim();

  const byValueOnly = selectedOptions.find((option) =>
    METAL_VALUE_REGEX.test(String(option?.value || ""))
  );
  return String(byValueOnly?.value || "").trim();
};

const pickManualRateForMetal = (pricingConfig = {}, metalType = "gold") => {
  const normalizedMetal = normalizeMetalType(metalType);
  const manualByType =
    normalizedMetal === "platinum"
      ? pricingConfig?.manualPlatinumRate
      : pricingConfig?.manualGoldRate;
  return manualByType ?? pricingConfig?.manualMetalRate ?? null;
};

function buildProductPricingConfig(node = {}) {
  const metalWeight = pickNumericMetafield(
    [
      { value: node?.metalWeightMetafield?.value, source: "product.custom.metal_weight" },
      { value: node?.goldWeightMetafield?.value, source: "product.custom.gold_weight_grams" },
      { value: node?.goldWeightLegacyMetafield?.value, source: "product.custom.gold_weight" },
    ],
    { allowZero: false }
  );
  const makingCharge = pickNumericMetafield(
    [
      { value: node?.makingChargeMetafield?.value, source: "product.custom.making_charge" },
      { value: node?.labourCostMetafield?.value, source: "product.custom.labour_cost" },
      { value: node?.laborCostMetafield?.value, source: "product.custom.labor_cost" },
    ],
    { allowZero: true }
  );
  const stylePriceAdjustment = pickNumericMetafield(
    [
      { value: node?.stylePriceMetafield?.value, source: "product.custom.style_price" },
      {
        value: node?.stylePriceDifferenceMetafield?.value,
        source: "product.custom.style_price_difference",
      },
      {
        value: node?.stylePriceAdjustmentMetafield?.value,
        source: "product.custom.style_price_adjustment",
      },
    ],
    { allowZero: true, allowNegative: true }
  );
  const manualMetalRate = pickNumericMetafield(
    [{ value: node?.manualMetalRateMetafield?.value, source: "product.custom.manual_metal_rate" }],
    { allowZero: false }
  );
  const manualGoldRate = pickNumericMetafield(
    [{ value: node?.manualGoldRateMetafield?.value, source: "product.custom.manual_gold_rate" }],
    { allowZero: false }
  );
  const manualPlatinumRate = pickNumericMetafield(
    [
      {
        value: node?.manualPlatinumRateMetafield?.value,
        source: "product.custom.manual_platinum_rate",
      },
    ],
    { allowZero: false }
  );

  return {
    metalWeightGrams: metalWeight.value,
    makingCharge: makingCharge.value ?? 0,
    labourCost: makingCharge.value ?? 0,
    stylePriceAdjustment: stylePriceAdjustment.value ?? 0,
    stylePrice: stylePriceAdjustment.value ?? 0,
    manualMetalRate: manualMetalRate.value,
    manualGoldRate: manualGoldRate.value,
    manualPlatinumRate: manualPlatinumRate.value,
    goldWeightGrams: metalWeight.value,
    sourceKeys: {
      metalWeight: metalWeight.source,
      goldWeight: metalWeight.source,
      makingCharge: makingCharge.source,
      labourCost: makingCharge.source,
      stylePriceAdjustment: stylePriceAdjustment.source,
      stylePrice: stylePriceAdjustment.source,
      manualMetalRate: manualMetalRate.source,
      manualGoldRate: manualGoldRate.source,
      manualPlatinumRate: manualPlatinumRate.source,
    },
  };
}

function buildVariantPricingConfig(variant = {}, productPricingConfig = {}) {
  const variantMetalWeight = pickNumericMetafield(
    [
      {
        value: variant?.metalWeightMetafield?.value,
        source: "variant.custom.metal_weight",
      },
      {
        value: variant?.goldWeightMetafield?.value,
        source: "variant.custom.gold_weight_grams",
      },
      { value: variant?.goldWeightLegacyMetafield?.value, source: "variant.custom.gold_weight" },
    ],
    { allowZero: false }
  );
  const variantMakingCharge = pickNumericMetafield(
    [
      { value: variant?.makingChargeMetafield?.value, source: "variant.custom.making_charge" },
      { value: variant?.labourCostMetafield?.value, source: "variant.custom.labour_cost" },
      { value: variant?.laborCostMetafield?.value, source: "variant.custom.labor_cost" },
    ],
    { allowZero: true }
  );
  const variantStylePriceAdjustment = pickNumericMetafield(
    [
      { value: variant?.stylePriceMetafield?.value, source: "variant.custom.style_price" },
      {
        value: variant?.stylePriceDifferenceMetafield?.value,
        source: "variant.custom.style_price_difference",
      },
      {
        value: variant?.stylePriceAdjustmentMetafield?.value,
        source: "variant.custom.style_price_adjustment",
      },
    ],
    { allowZero: true, allowNegative: true }
  );
  const variantManualMetalRate = pickNumericMetafield(
    [{ value: variant?.manualMetalRateMetafield?.value, source: "variant.custom.manual_metal_rate" }],
    { allowZero: false }
  );
  const variantManualRate = pickNumericMetafield(
    [{ value: variant?.manualGoldRateMetafield?.value, source: "variant.custom.manual_gold_rate" }],
    { allowZero: false }
  );
  const variantManualPlatinumRate = pickNumericMetafield(
    [
      {
        value: variant?.manualPlatinumRateMetafield?.value,
        source: "variant.custom.manual_platinum_rate",
      },
    ],
    { allowZero: false }
  );

  return {
    metalWeightGrams: variantMetalWeight.value ?? productPricingConfig.metalWeightGrams ?? null,
    makingCharge: variantMakingCharge.value ?? productPricingConfig.makingCharge ?? 0,
    labourCost: variantMakingCharge.value ?? productPricingConfig.makingCharge ?? 0,
    stylePriceAdjustment:
      variantStylePriceAdjustment.value ?? productPricingConfig.stylePriceAdjustment ?? 0,
    stylePrice: variantStylePriceAdjustment.value ?? productPricingConfig.stylePriceAdjustment ?? 0,
    manualMetalRate: variantManualMetalRate.value ?? productPricingConfig.manualMetalRate ?? null,
    manualGoldRate: variantManualRate.value ?? productPricingConfig.manualGoldRate ?? null,
    manualPlatinumRate:
      variantManualPlatinumRate.value ?? productPricingConfig.manualPlatinumRate ?? null,
    goldWeightGrams: variantMetalWeight.value ?? productPricingConfig.metalWeightGrams ?? null,
    sourceKeys: {
      metalWeight:
        variantMetalWeight.source ||
        productPricingConfig?.sourceKeys?.metalWeight ||
        productPricingConfig?.sourceKeys?.goldWeight ||
        null,
      goldWeight:
        variantMetalWeight.source ||
        productPricingConfig?.sourceKeys?.metalWeight ||
        productPricingConfig?.sourceKeys?.goldWeight ||
        null,
      makingCharge:
        variantMakingCharge.source ||
        productPricingConfig?.sourceKeys?.makingCharge ||
        productPricingConfig?.sourceKeys?.labourCost ||
        null,
      labourCost:
        variantMakingCharge.source ||
        productPricingConfig?.sourceKeys?.makingCharge ||
        productPricingConfig?.sourceKeys?.labourCost ||
        null,
      stylePriceAdjustment:
        variantStylePriceAdjustment.source ||
        productPricingConfig?.sourceKeys?.stylePriceAdjustment ||
        productPricingConfig?.sourceKeys?.stylePrice ||
        null,
      stylePrice:
        variantStylePriceAdjustment.source ||
        productPricingConfig?.sourceKeys?.stylePriceAdjustment ||
        productPricingConfig?.sourceKeys?.stylePrice ||
        null,
      manualMetalRate:
        variantManualMetalRate.source || productPricingConfig?.sourceKeys?.manualMetalRate || null,
      manualGoldRate:
        variantManualRate.source || productPricingConfig?.sourceKeys?.manualGoldRate || null,
      manualPlatinumRate:
        variantManualPlatinumRate.source ||
        productPricingConfig?.sourceKeys?.manualPlatinumRate ||
        null,
    },
  };
}

const normalizeMetafieldMedia = (value = "", key = "") => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const collectUrls = (input) => {
    if (!input) return [];
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) return [];
      if (/^https?:\/\//i.test(trimmed)) return [trimmed];
      return [];
    }
    if (Array.isArray(input)) {
      return input.flatMap((item) => collectUrls(item));
    }
    if (typeof input === "object") {
      return Object.values(input).flatMap((item) => collectUrls(item));
    }
    return [];
  };

  const parsed = (() => {
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        return JSON.parse(raw);
      } catch (error) {
        return raw;
      }
    }
    return raw;
  })();

  return uniqueMedia(
    collectUrls(parsed).map((url, index) =>
      makeMediaItem({
        id: `metafield-${key}-${index}`,
        type: MEDIA_MODEL_EXTENSIONS.test(url)
          ? "model"
          : MEDIA_VIDEO_EXTENSIONS.test(url)
            ? "video"
            : "image",
        src: url,
        poster: MEDIA_VIDEO_EXTENSIONS.test(url) ? "" : url,
        alt: key,
      })
    )
  );
};

const mapStorefrontMedia = (edges = []) =>
  uniqueMedia(
    (edges || [])
      .map((edge) => edge?.node)
      .map((node) => {
        const typename = String(node?.__typename || "");

        if (typename === "MediaImage") {
          return makeMediaItem({
            id: node?.id,
            type: "image",
            src: node?.image?.url,
            poster: node?.image?.url,
            alt: node?.image?.altText || node?.alt || "",
          });
        }

        if (typename === "Video") {
          const sources = node?.sources || [];
          const mp4Source = sources.find((source) => /mp4/i.test(String(source?.mimeType || "")));
          const preferred = mp4Source || sources[0];
          return makeMediaItem({
            id: node?.id,
            type: "video",
            src: preferred?.url,
            poster: node?.previewImage?.url,
            alt: node?.alt || "",
            mimeType: preferred?.mimeType || "",
          });
        }

        if (typename === "ExternalVideo") {
          return makeMediaItem({
            id: node?.id,
            type: "video",
            src: node?.embeddedUrl || node?.originUrl,
            poster: node?.previewImage?.url,
            alt: node?.alt || "",
          });
        }

        if (typename === "Model3d") {
          const sources = node?.sources || [];
          const glbSource =
            sources.find((entry) => /model\/gltf-binary/i.test(String(entry?.mimeType || ""))) ||
            sources.find((entry) => /\.glb(\?.*)?$/i.test(String(entry?.url || "")));
          const gltfSource =
            sources.find((entry) => /model\/gltf\+json/i.test(String(entry?.mimeType || ""))) ||
            sources.find((entry) => /\.gltf(\?.*)?$/i.test(String(entry?.url || "")));
          const preferred = glbSource || gltfSource || sources[0];

          return makeMediaItem({
            id: node?.id,
            type: "model",
            src: preferred?.url,
            poster: node?.previewImage?.url,
            alt: node?.alt || "",
            mimeType: preferred?.mimeType || "",
          });
        }

        return null;
      })
      .filter(Boolean)
  );

async function storefrontRequest(query, variables = {}) {
  try {
    if (!env.shopify.storeDomain || !env.shopify.storefrontToken) {
      throw new AppError("Missing Shopify Storefront credentials", 502, {
        hasStoreDomain: Boolean(env.shopify.storeDomain),
        hasStorefrontToken: Boolean(env.shopify.storefrontToken),
      });
    }

    const response = await httpClient.post(
      storefrontUrl,
      { query, variables },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": env.shopify.storefrontToken,
        },
      }
    );

    if (response.data?.errors?.length) {
      throw new AppError("Shopify Storefront API error", 502, response.data.errors);
    }

    return response.data?.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Failed to call Shopify Storefront API", 502, {
      message: error.message,
      response: error.response?.data,
    });
  }
}

async function adminRequest(query, variables = {}) {
  try {
    if (!env.shopify.storeDomain || !env.shopify.adminToken) {
      throw new AppError("Missing Shopify Admin credentials", 502, {
        hasStoreDomain: Boolean(env.shopify.storeDomain),
        hasAdminToken: Boolean(env.shopify.adminToken),
      });
    }

    const response = await httpClient.post(
      adminUrl,
      { query, variables },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": env.shopify.adminToken,
        },
      }
    );

    if (response.data?.errors?.length) {
      throw new AppError("Shopify Admin API error", 502, response.data.errors);
    }

    return response.data?.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Failed to call Shopify Admin API", 502, {
      message: error.message,
      response: error.response?.data,
    });
  }
}

const PRODUCT_NODE_SELECTION = `
  id
  title
  description
  descriptionHtml
  handle
  productType
  tags
  featuredImage { url }
  options {
    name
    values
  }
  metalWeightMetafield: metafield(namespace: "custom", key: "metal_weight") {
    value
    type
  }
  goldWeightMetafield: metafield(namespace: "custom", key: "gold_weight_grams") {
    value
    type
  }
  goldWeightLegacyMetafield: metafield(namespace: "custom", key: "gold_weight") {
    value
    type
  }
  makingChargeMetafield: metafield(namespace: "custom", key: "making_charge") {
    value
    type
  }
  stylePriceMetafield: metafield(namespace: "custom", key: "style_price") {
    value
    type
  }
  stylePriceDifferenceMetafield: metafield(namespace: "custom", key: "style_price_difference") {
    value
    type
  }
  stylePriceAdjustmentMetafield: metafield(namespace: "custom", key: "style_price_adjustment") {
    value
    type
  }
  labourCostMetafield: metafield(namespace: "custom", key: "labour_cost") {
    value
    type
  }
  laborCostMetafield: metafield(namespace: "custom", key: "labor_cost") {
    value
    type
  }
  manualMetalRateMetafield: metafield(namespace: "custom", key: "manual_metal_rate") {
    value
    type
  }
  manualGoldRateMetafield: metafield(namespace: "custom", key: "manual_gold_rate") {
    value
    type
  }
  manualPlatinumRateMetafield: metafield(namespace: "custom", key: "manual_platinum_rate") {
    value
    type
  }
  reviewsRatingMetafield: metafield(namespace: "reviews", key: "rating") {
    value
    type
  }
  reviewsRatingCountMetafield: metafield(namespace: "reviews", key: "rating_count") {
    value
    type
  }
  customRatingMetafield: metafield(namespace: "custom", key: "rating") {
    value
    type
  }
  customRatingCountMetafield: metafield(namespace: "custom", key: "rating_count") {
    value
    type
  }
  reviewsJsonMetafield: metafield(namespace: "custom", key: "reviews_json") {
    value
    type
  }
  reviewsMetafield: metafield(namespace: "custom", key: "reviews") {
    value
    type
  }
  reviewListMetafield: metafield(namespace: "custom", key: "review_list") {
    value
    type
  }
  sprReviewsMetafield: metafield(namespace: "spr", key: "reviews") {
    value
    type
  }
  media(first: 24) {
    edges {
      node {
        __typename
        mediaContentType
        alt
        ... on MediaImage {
          id
          image {
            url
            altText
          }
        }
        ... on Video {
          id
          previewImage { url }
          sources {
            url
            mimeType
            format
          }
        }
        ... on ExternalVideo {
          id
          embeddedUrl
          originUrl
          previewImage { url }
        }
        ... on Model3d {
          id
          previewImage { url }
          sources {
            url
            mimeType
            format
          }
        }
      }
    }
  }
  images(first: 24) {
    edges {
      node {
        url
        altText
      }
    }
  }
  variants(first: 60) {
    edges {
      node {
        id
        title
        availableForSale
        currentlyNotInStock
        quantityAvailable
        sku
        image { url }
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
        diamondVideoMetafield: metafield(namespace: "custom", key: "diamond_video") {
          value
          type
        }
        diamondVideoUrlMetafield: metafield(namespace: "custom", key: "diamond_video_url") {
          value
          type
        }
        galleryMediaMetafield: metafield(namespace: "custom", key: "gallery_media") {
          value
          type
        }
        styleIconMetafield: metafield(namespace: "custom", key: "style_icon") {
          value
          type
        }
        styleIconUrlMetafield: metafield(namespace: "custom", key: "style_icon_url") {
          value
          type
        }
        metalWeightMetafield: metafield(namespace: "custom", key: "metal_weight") {
          value
          type
        }
        goldWeightMetafield: metafield(namespace: "custom", key: "gold_weight_grams") {
          value
          type
        }
        goldWeightLegacyMetafield: metafield(namespace: "custom", key: "gold_weight") {
          value
          type
        }
        makingChargeMetafield: metafield(namespace: "custom", key: "making_charge") {
          value
          type
        }
        stylePriceMetafield: metafield(namespace: "custom", key: "style_price") {
          value
          type
        }
        stylePriceDifferenceMetafield: metafield(namespace: "custom", key: "style_price_difference") {
          value
          type
        }
        stylePriceAdjustmentMetafield: metafield(namespace: "custom", key: "style_price_adjustment") {
          value
          type
        }
        labourCostMetafield: metafield(namespace: "custom", key: "labour_cost") {
          value
          type
        }
        laborCostMetafield: metafield(namespace: "custom", key: "labor_cost") {
          value
          type
        }
        manualMetalRateMetafield: metafield(namespace: "custom", key: "manual_metal_rate") {
          value
          type
        }
        manualGoldRateMetafield: metafield(namespace: "custom", key: "manual_gold_rate") {
          value
          type
        }
        manualPlatinumRateMetafield: metafield(namespace: "custom", key: "manual_platinum_rate") {
          value
          type
        }
      }
    }
  }
`;

function mapStorefrontProduct(node = {}, options = {}) {
  const metalRates = options?.metalRates || {};
  const metalRateErrors = options?.metalRateErrors || {};
  const productMedia = mapStorefrontMedia(node.media?.edges || []);
  const fallbackImages = (node.images?.edges || [])
    .map((edge, index) =>
      makeMediaItem({
        id: `img-${index}`,
        type: "image",
        src: edge?.node?.url,
        poster: edge?.node?.url,
        alt: edge?.node?.altText || "",
      })
    )
    .filter(Boolean);
  const media = uniqueMedia([...productMedia, ...fallbackImages]);

  const productPricingConfig = buildProductPricingConfig(node);
  const productReviews = buildProductReviews(node);

  const variants = (node.variants?.edges || []).map(({ node: variant }) => {
    const variantAmount = Number(variant?.price?.amount || 0);
    const variantCurrency = variant?.price?.currencyCode || "USD";
    const variantPricingConfig = buildVariantPricingConfig(variant, productPricingConfig);
    const metalLabel = getVariantMetalLabel(variant);
    const metalType = normalizeMetalType(metalLabel);
    const liveRate = metalType === "platinum" ? metalRates?.platinum : metalRates?.gold;
    const fallbackRate = pickManualRateForMetal(variantPricingConfig, metalType);
    const effectiveRate = liveRate?.ratePerGram || fallbackRate || null;
    const manualRateSourceKey =
      metalType === "platinum"
        ? variantPricingConfig?.sourceKeys?.manualPlatinumRate
        : variantPricingConfig?.sourceKeys?.manualGoldRate;
    const fallbackRateSourceKey =
      manualRateSourceKey ||
      variantPricingConfig?.sourceKeys?.manualMetalRate ||
      (metalType === "platinum"
        ? "variant.custom.manual_platinum_rate"
        : "variant.custom.manual_gold_rate");

    const variantMetafields = [
      variant?.diamondVideoMetafield
        ? {
            namespace: "custom",
            key: "diamond_video",
            value: variant.diamondVideoMetafield.value,
          }
        : null,
      variant?.diamondVideoUrlMetafield
        ? {
            namespace: "custom",
            key: "diamond_video_url",
            value: variant.diamondVideoUrlMetafield.value,
          }
        : null,
      variant?.galleryMediaMetafield
        ? {
            namespace: "custom",
            key: "gallery_media",
            value: variant.galleryMediaMetafield.value,
          }
        : null,
      variant?.styleIconMetafield
        ? {
            namespace: "custom",
            key: "style_icon",
            value: variant.styleIconMetafield.value,
          }
        : null,
      variant?.styleIconUrlMetafield
        ? {
            namespace: "custom",
            key: "style_icon_url",
            value: variant.styleIconUrlMetafield.value,
          }
        : null,
      variantPricingConfig.metalWeightGrams !== null
        ? {
            namespace: "custom",
            key: "metal_weight",
            value: String(variantPricingConfig.metalWeightGrams),
          }
        : null,
      variantPricingConfig.metalWeightGrams !== null
        ? {
            namespace: "custom",
            key: "gold_weight_grams",
            value: String(variantPricingConfig.metalWeightGrams),
          }
        : null,
      variantPricingConfig.makingCharge !== null
        ? {
            namespace: "custom",
            key: "making_charge",
            value: String(variantPricingConfig.makingCharge),
          }
        : null,
      variantPricingConfig.makingCharge !== null
        ? {
            namespace: "custom",
            key: "labour_cost",
            value: String(variantPricingConfig.makingCharge),
          }
        : null,
      (variantPricingConfig?.sourceKeys?.stylePriceAdjustment ||
        variantPricingConfig.stylePriceAdjustment !== 0)
        ? {
            namespace: "custom",
            key: "style_price",
            value: String(variantPricingConfig.stylePriceAdjustment),
          }
        : null,
    ].filter(Boolean);

    const effectiveRateSource =
      liveRate?.source || (fallbackRate !== null ? fallbackRateSourceKey : null);

    const calculatedPricing = computeMetalPricing({
      metalWeightGrams: variantPricingConfig.metalWeightGrams,
      makingCharge: variantPricingConfig.makingCharge,
      stylePriceAdjustment: variantPricingConfig.stylePriceAdjustment,
      ratePerGram: effectiveRate,
    });

    const dynamicPriceAmount =
      calculatedPricing.configured && calculatedPricing.finalPrice !== null
        ? calculatedPricing.finalPrice
        : variantAmount;

    const pricing = {
      configured: calculatedPricing.configured,
      model: "metal-rate-v2",
      basePriceAmount: variantAmount,
      metalType,
      metalLabel,
      metalWeightGrams: variantPricingConfig.metalWeightGrams,
      goldWeightGrams: variantPricingConfig.metalWeightGrams,
      makingCharge: variantPricingConfig.makingCharge,
      labourCost: variantPricingConfig.makingCharge,
      stylePriceAdjustment: variantPricingConfig.stylePriceAdjustment,
      stylePrice: variantPricingConfig.stylePriceAdjustment,
      manualMetalRate: variantPricingConfig.manualMetalRate,
      manualGoldRate: variantPricingConfig.manualGoldRate,
      manualPlatinumRate: variantPricingConfig.manualPlatinumRate,
      metalRatePerGram: calculatedPricing.ratePerGram,
      goldRatePerGram: calculatedPricing.ratePerGram,
      liveRatePerGram: calculatedPricing.ratePerGram,
      metalValue: calculatedPricing.metalValue,
      goldValue: calculatedPricing.metalValue,
      finalPrice: calculatedPricing.finalPrice,
      currencyCode: variantCurrency,
      rateSource: effectiveRateSource,
      fallbackUsed: Boolean(
        liveRate?.fallbackUsed || (!liveRate?.ratePerGram && effectiveRate !== null)
      ),
      sourceKeys: variantPricingConfig.sourceKeys,
      liveRateFetchedAt: liveRate?.fetchedAt || null,
      apiError: metalRateErrors?.[metalType] || null,
    };

    return {
      id: variant?.id || null,
      title: variant?.title || "",
      availableForSale: Boolean(variant?.availableForSale),
      currentlyNotInStock: Boolean(variant?.currentlyNotInStock),
      quantityAvailable:
        Number.isFinite(Number(variant?.quantityAvailable)) && variant?.quantityAvailable !== null
          ? Number(variant.quantityAvailable)
          : null,
      image: variant?.image?.url || "",
      sku: variant?.sku || "",
      metalType,
      metalLabel,
      metalWeightGrams: variantPricingConfig.metalWeightGrams,
      makingCharge: variantPricingConfig.makingCharge,
      stylePriceAdjustment: variantPricingConfig.stylePriceAdjustment,
      priceAmount: dynamicPriceAmount,
      currencyCode: variantCurrency,
      price: formatAmountLabel(dynamicPriceAmount, variantCurrency),
      selectedOptions: (variant?.selectedOptions || []).map((entry) => ({
        name: entry?.name || "",
        value: entry?.value || "",
      })),
      metafields: variantMetafields,
      metafieldMedia: variantMetafields.flatMap((entry) =>
        normalizeMetafieldMedia(entry?.value, entry?.key || "")
      ),
      pricing,
    };
  });

  const primaryVariant =
    variants.find((variant) => variant.availableForSale) ||
    variants[0] ||
    null;
  const amount = Number(primaryVariant?.priceAmount || 0);
  const currency = primaryVariant?.currencyCode || "USD";
  const productPricing = primaryVariant?.pricing || {
    configured: false,
    model: "metal-rate-v2",
    basePriceAmount: amount,
    metalType: "gold",
    metalLabel: "",
    metalWeightGrams: productPricingConfig.metalWeightGrams,
    goldWeightGrams: productPricingConfig.metalWeightGrams,
    makingCharge: productPricingConfig.makingCharge,
    labourCost: productPricingConfig.makingCharge,
    stylePriceAdjustment: productPricingConfig.stylePriceAdjustment,
    stylePrice: productPricingConfig.stylePriceAdjustment,
    manualMetalRate: productPricingConfig.manualMetalRate,
    manualGoldRate: productPricingConfig.manualGoldRate,
    manualPlatinumRate: productPricingConfig.manualPlatinumRate,
    metalRatePerGram: null,
    goldRatePerGram: null,
    liveRatePerGram: null,
    metalValue: null,
    goldValue: null,
    finalPrice: null,
    currencyCode: currency,
    rateSource: null,
    fallbackUsed: false,
    sourceKeys: productPricingConfig.sourceKeys,
    liveRateFetchedAt: null,
    apiError: null,
  };
  const productImages = media.filter((item) => item.type === "image").map((item) => item.src);

  return {
    id: node.id,
    title: node.title,
    description: node.description || "",
    descriptionHtml: node.descriptionHtml || node.description || "",
    handle: node.handle || "",
    productType: node.productType || "",
    tags: Array.isArray(node.tags) ? node.tags : [],
    image: primaryVariant?.image || node.featuredImage?.url || productImages[0] || "",
    images: productImages,
    media,
    merchandiseId: primaryVariant?.id || null,
    priceAmount: amount,
    currencyCode: currency,
    price: formatAmountLabel(amount, currency),
    pricing: productPricing,
    goldRate:
      metalRates?.gold && metalRates.gold.ratePerGram
        ? {
            ratePerGram: metalRates.gold.ratePerGram,
            source: metalRates.gold.source,
            fallbackUsed: Boolean(metalRates.gold.fallbackUsed),
            currencyCode: metalRates.gold.currencyCode || currency,
            fetchedAt: metalRates.gold.fetchedAt || null,
          }
        : null,
    metalRates: {
      gold: metalRates?.gold || null,
      platinum: metalRates?.platinum || null,
    },
    reviews: productReviews,
    options: (node.options || []).map((option) => ({
      name: option?.name || "",
      values: Array.isArray(option?.values) ? option.values : [],
    })),
    variants,
  };
}

function mapPublicProduct(product = {}) {
  const media = mapPublicMedia(product?.images || []);
  const usesAjaxSchema =
    Array.isArray(product?.images) && typeof product?.images?.[0] === "string";
  const imageById = new Map(
    (product?.images || [])
      .filter((entry) => entry?.id && entry?.src)
      .map((entry) => [String(entry.id), entry.src])
  );
  const optionNames = (product?.options || []).map((option) => option?.name).filter(Boolean);

  const variants = (product?.variants || []).map((variant) => {
    const rawAmount = Number(variant?.price || 0);
    const amount =
      Number.isFinite(rawAmount) && usesAjaxSchema
        ? rawAmount / 100
        : Number.isFinite(rawAmount)
          ? rawAmount
          : 0;
    const currencyCode = variant?.presentment_prices?.[0]?.price?.currency_code || "USD";
    const imageId = variant?.image_id ? String(variant.image_id) : "";
    const selectedOptions = optionNames
      .map((name, index) => {
        const optionKey = `option${index + 1}`;
        const optionValue = variant?.[optionKey];
        if (!optionValue) return null;
        return { name, value: String(optionValue) };
      })
      .filter(Boolean);
    const metalLabel = getVariantMetalLabel({ selectedOptions });
    const metalType = normalizeMetalType(metalLabel);

    return {
      id:
        variant?.admin_graphql_api_id ||
        (variant?.id ? `gid://shopify/ProductVariant/${variant.id}` : null),
      title: variant?.title || "",
      availableForSale: variant?.available !== false,
      currentlyNotInStock: variant?.available === false,
      quantityAvailable:
        Number.isFinite(Number(variant?.inventory_quantity)) && variant?.inventory_quantity !== null
          ? Number(variant.inventory_quantity)
          : null,
      image: variant?.featured_image?.src || imageById.get(imageId) || "",
      sku: variant?.sku || "",
      metalType,
      metalLabel,
      metalWeightGrams: null,
      makingCharge: 0,
      stylePriceAdjustment: 0,
      priceAmount: amount,
      currencyCode,
      price: formatAmountLabel(amount, currencyCode),
      selectedOptions,
      metafields: [],
      metafieldMedia: [],
      pricing: {
        configured: false,
        model: "metal-rate-v2",
        basePriceAmount: amount,
        metalType,
        metalLabel,
        metalWeightGrams: null,
        goldWeightGrams: null,
        makingCharge: 0,
        labourCost: 0,
        stylePriceAdjustment: 0,
        stylePrice: 0,
        manualMetalRate: null,
        manualGoldRate: null,
        manualPlatinumRate: null,
        metalRatePerGram: null,
        goldRatePerGram: null,
        liveRatePerGram: null,
        metalValue: null,
        goldValue: null,
        finalPrice: null,
        currencyCode,
        rateSource: null,
        fallbackUsed: false,
        sourceKeys: {},
        liveRateFetchedAt: null,
        apiError: null,
      },
    };
  });

  const primaryVariant =
    variants.find((variant) => variant.availableForSale) || variants[0] || null;
  const amount = Number(primaryVariant?.priceAmount || 0);
  const currency = primaryVariant?.currencyCode || "USD";
  const images = media.filter((item) => item.type === "image").map((item) => item.src);

  return {
    id: String(product?.id || ""),
    title: product?.title || "",
    description: stripHtml(product?.body_html || product?.body || ""),
    descriptionHtml: product?.body_html || product?.body || "",
    handle: product?.handle || "",
    productType: product?.product_type || "",
    tags: product?.tags
      ? String(product.tags)
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [],
    image: primaryVariant?.image || product?.image?.src || images[0] || "",
    images,
    media,
    merchandiseId: primaryVariant?.id || null,
    priceAmount: amount,
    currencyCode: currency,
    price: formatAmountLabel(amount, currency),
    pricing: primaryVariant?.pricing || null,
    goldRate: null,
    metalRates: {
      gold: null,
      platinum: null,
    },
    reviews: {
      averageRating: null,
      count: 0,
      items: [],
    },
    options: (product?.options || []).map((option) => ({
      name: option?.name || "",
      values: Array.isArray(option?.values) ? option.values : [],
    })),
    variants,
  };
}

async function getPublicProducts(limit = 24, collectionHandle = "rings", options = {}) {
  const sanitizedLimit = Number(limit) || 24;
  const handle = String(collectionHandle || "rings").trim();
  const strictCollection = Boolean(options?.strictCollection);

  if (!env.shopify.storeDomain) {
    throw new AppError("Shopify store domain is missing", 500);
  }

  try {
    const byCollection = await httpClient.get(
      `https://${env.shopify.storeDomain}/collections/${encodeURIComponent(handle)}/products.json`,
      {
        params: { limit: sanitizedLimit },
        headers: { Accept: "application/json" },
      }
    );

    const products = byCollection.data?.products || [];
    if (products.length) {
      return products.map(mapPublicProduct);
    }
    if (strictCollection) {
      return [];
    }
  } catch (error) {
    if (strictCollection) {
      return [];
    }
    // Ignore and continue to the all-products public endpoint fallback.
  }

  if (strictCollection) {
    return [];
  }

  const allProducts = await httpClient.get(`https://${env.shopify.storeDomain}/products.json`, {
    params: { limit: sanitizedLimit },
    headers: { Accept: "application/json" },
  });

  return (allProducts.data?.products || []).map(mapPublicProduct);
}

async function getPublicProductByHandle(handle = "") {
  const sanitizedHandle = String(handle || "").trim();
  if (!sanitizedHandle) {
    throw new AppError("Product handle is required", 400);
  }

  if (!env.shopify.storeDomain) {
    throw new AppError("Shopify store domain is missing", 500);
  }

  try {
    const response = await httpClient.get(
      `https://${env.shopify.storeDomain}/products/${encodeURIComponent(sanitizedHandle)}.js`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (response?.data?.handle) {
      return mapPublicProduct(response.data);
    }
  } catch (error) {
    // Continue to products.json fallback when the per-handle endpoint is unavailable.
  }

  const allProducts = await httpClient.get(`https://${env.shopify.storeDomain}/products.json`, {
    params: { limit: 250 },
    headers: { Accept: "application/json" },
  });

  const mappedProducts = (allProducts.data?.products || []).map(mapPublicProduct);
  const matched = mappedProducts.find(
    (product) => toLower(product?.handle) === toLower(sanitizedHandle)
  );

  if (!matched) {
    throw new AppError("Product not found", 404, { handle: sanitizedHandle });
  }

  return matched;
}

async function getProducts(limit = 24, collectionHandle = "rings", options = {}) {
  const sanitizedLimit = Math.min(Math.max(Number(limit) || 24, 1), 80);
  const handle = String(collectionHandle || "rings").trim();
  const strictCollection = Boolean(options?.strictCollection);
  let metalRates = {};
  let metalRateErrors = {};

  const resolvedRates = await resolveMetalRates();
  metalRates = resolvedRates?.rates || {};
  metalRateErrors = resolvedRates?.errors || {};

  const byCollectionQuery = `
    query GetProductsByCollection($limit: Int!, $handle: String!) {
      collection(handle: $handle) {
        products(first: $limit) {
          edges {
            node {
              ${PRODUCT_NODE_SELECTION}
            }
          }
        }
      }
    }
  `;

  const fallbackQuery = `
    query GetProducts($limit: Int!) {
      products(first: $limit) {
        edges {
          node {
            ${PRODUCT_NODE_SELECTION}
          }
        }
      }
    }
  `;

  if (!env.shopify.storefrontToken) {
    return getPublicProducts(sanitizedLimit, handle, { strictCollection });
  }

  try {
    const collectionData = await storefrontRequest(byCollectionQuery, {
      limit: sanitizedLimit,
      handle,
    });

    const collectionEdges = collectionData?.collection?.products?.edges || [];
    if (collectionEdges.length) {
      return collectionEdges.map(({ node }) =>
        mapStorefrontProduct(node, {
          metalRates,
          metalRateErrors,
        })
      );
    }
    if (strictCollection) {
      return [];
    }

    const fallbackData = await storefrontRequest(fallbackQuery, {
      limit: sanitizedLimit,
    });

    return (fallbackData?.products?.edges || []).map(({ node }) =>
      mapStorefrontProduct(node, {
        metalRates,
        metalRateErrors,
      })
    );
  } catch (error) {
    return getPublicProducts(sanitizedLimit, handle, { strictCollection });
  }
}

async function getCollections() {
  const storefrontCollectionsQuery = `
    query GetCollections($limit: Int!) {
      collections(first: $limit, sortKey: TITLE) {
        edges {
          node {
            handle
            title
            products(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  `;

  if (env.shopify.storefrontToken) {
    try {
      const data = await storefrontRequest(storefrontCollectionsQuery, { limit: 250 });
      const storefrontCollections = (data?.collections?.edges || [])
        .map((edge) => edge?.node)
        .filter(Boolean);
      const normalized = uniqueCollections(storefrontCollections);
      if (normalized.length) {
        return normalized;
      }
    } catch (error) {
      // Continue to public endpoint fallback.
    }
  }

  try {
    const response = await httpClient.get(
      `https://${env.shopify.storeDomain}/collections.json`,
      {
        params: { limit: 250 },
        headers: { Accept: "application/json" },
      }
    );
    const publicCollections = Array.isArray(response?.data?.collections)
      ? response.data.collections
      : [];
    const normalized = uniqueCollections(publicCollections);
    if (normalized.length) {
      return normalized;
    }
  } catch (error) {
    // Ignore and return empty result.
  }

  return [];
}

async function getProductByHandle(handle = "") {
  const sanitizedHandle = String(handle || "").trim();
  if (!sanitizedHandle) {
    throw new AppError("Product handle is required", 400);
  }

  const resolvedRates = await resolveMetalRates();
  const metalRates = resolvedRates?.rates || {};
  const metalRateErrors = resolvedRates?.errors || {};

  const query = `
    query GetProductByHandle($handle: String!) {
      product(handle: $handle) {
        ${PRODUCT_NODE_SELECTION}
      }
    }
  `;

  if (!env.shopify.storefrontToken) {
    return getPublicProductByHandle(sanitizedHandle);
  }

  try {
    const data = await storefrontRequest(query, {
      handle: sanitizedHandle,
    });

    const product = data?.product || null;
    if (!product?.id) {
      throw new AppError("Product not found", 404, { handle: sanitizedHandle });
    }

    return mapStorefrontProduct(product, {
      metalRates,
      metalRateErrors,
    });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      throw error;
    }
    return getPublicProductByHandle(sanitizedHandle);
  }
}

async function getPublicTopSellers(limit = 4) {
  if (!env.shopify.storeDomain) {
    throw new AppError("Shopify store domain is missing", 500);
  }

  const response = await httpClient.get(
    `https://${env.shopify.storeDomain}/collections/all/products.json`,
    {
      params: { limit: Number(limit) || 4, sort_by: "best-selling" },
      headers: { Accept: "application/json" },
    }
  );

  const products = response.data?.products || [];
  return products.map((product) => {
    const variant = product?.variants?.[0] || {};
    const amount = String(variant?.price || "0");
    const currency = variant?.presentment_prices?.[0]?.price?.currency_code || "USD";
    const variantId =
      variant?.admin_graphql_api_id ||
      (variant?.id ? `gid://shopify/ProductVariant/${variant.id}` : "");

    return {
      node: {
        id: String(product?.id || ""),
        title: product?.title || "",
        handle: product?.handle || "",
        featuredImage: { url: product?.image?.src || product?.images?.[0]?.src || "" },
        variants: {
          edges: [
            {
              node: {
                id: variantId,
                price: {
                  amount,
                  currencyCode: currency,
                },
              },
            },
          ],
        },
      },
    };
  });
}

async function getTopSellers(limit = 4) {
  const query = `
    query GetTopSellers($limit: Int!) {
      products(first: $limit, sortKey: BEST_SELLING) {
        edges {
          node {
            id
            title
            handle
            featuredImage { url }
            variants(first: 1) {
              edges {
                node {
                  id
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  if (!env.shopify.storefrontToken) {
    return getPublicTopSellers(limit);
  }

  try {
    const data = await storefrontRequest(query, { limit: Number(limit) || 4 });
    return data?.products?.edges || [];
  } catch (error) {
    return getPublicTopSellers(limit);
  }
}

async function getGoldRate(manualRate = null) {
  return resolveGoldRate({ manualRate });
}

async function getMetalRates(options = {}) {
  return resolveMetalRates(options);
}

async function storefrontProxy(query, variables = {}) {
  if (!query || typeof query !== "string") {
    throw new AppError("GraphQL query is required", 400);
  }

  return storefrontRequest(query, variables);
}

async function createCart(lineItems = [], attributes = []) {
  const cartLines = (lineItems || [])
    .filter((item) => item?.merchandiseId && Number(item.quantity) > 0)
    .map((item) => ({
      merchandiseId: item.merchandiseId,
      quantity: Number(item.quantity),
      attributes: (item.attributes || []).filter((entry) => entry?.key && entry?.value),
    }));

  if (!cartLines.length) {
    throw new AppError("At least one valid line item is required", 400);
  }

  const mutation = `
    mutation CreateCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          totalQuantity
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await storefrontRequest(mutation, {
    input: {
      lines: cartLines,
      attributes,
    },
  });

  const payload = data?.cartCreate;

  if (payload?.userErrors?.length) {
    throw new AppError("Unable to create Shopify cart", 400, payload.userErrors);
  }

  return payload?.cart;
}

async function createCheckout(lineItems = [], attributes = [], buyerIdentity = null) {
  const cart = await createCart(lineItems, attributes);

  return {
    cartId: cart?.id,
    checkoutUrl: cart?.checkoutUrl,
    totalQuantity: cart?.totalQuantity || 0,
    buyerIdentity,
  };
}

async function createOrder(orderPayload = {}) {
  const lineItems = (orderPayload.lineItems || [])
    .filter((item) => item?.variantId && Number(item.quantity) > 0)
    .map((item) => ({
      variantId: item.variantId,
      quantity: Number(item.quantity),
    }));

  if (!lineItems.length) {
    throw new AppError("At least one valid order line item is required", 400);
  }

  const mutation = `
    mutation DraftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
          name
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const customAttributes = (orderPayload.customAttributes || [])
    .filter((entry) => entry?.key && entry?.value)
    .map((entry) => ({ key: String(entry.key), value: String(entry.value) }));

  const data = await adminRequest(mutation, {
    input: {
      email: orderPayload.email || undefined,
      note: orderPayload.note || undefined,
      lineItems,
      customAttributes,
      tags: orderPayload.tags || ["ring-builder"],
    },
  });

  const payload = data?.draftOrderCreate;

  if (payload?.userErrors?.length) {
    throw new AppError("Unable to create Shopify order", 400, payload.userErrors);
  }

  return payload?.draftOrder;
}

module.exports = {
  getCollections,
  storefrontProxy,
  getProducts,
  getProductByHandle,
  getTopSellers,
  getGoldRate,
  getMetalRates,
  createCart,
  createCheckout,
  createOrder,
};
