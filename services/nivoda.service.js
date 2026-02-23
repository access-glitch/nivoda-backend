const httpClient = require("../config/httpClient");
const env = require("../config/env");
const { AppError } = require("../utils/AppError");

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const MEDIA_VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m3u8)(\?.*)?$/i;

const AUTH_QUERY = `
  query Authenticate($username: String!, $password: String!) {
    authenticate {
      username_and_password(username: $username, password: $password) {
        token
      }
    }
  }
`;

const AUTH_MUTATION = `
  mutation Authenticate($username: String!, $password: String!) {
    authenticate {
      username_and_password(username: $username, password: $password) {
        token
      }
    }
  }
`;

const AUTH_QUERY_CANDIDATES = [AUTH_QUERY, AUTH_MUTATION];

const DIAMOND_CERTIFICATE_FIELDS = `
  id
  lab
  shape
  certNumber
  carats
  color
  clarity
  cut
  polish
  symmetry
  table
  depthPercentage
  floInt
  labgrown
`;

const DIAMOND_BASE_FIELDS = `
  id
  image
  video
  mine_of_origin
  certificate {
    ${DIAMOND_CERTIFICATE_FIELDS}
  }
`;

const DIAMOND_EXTRA_CANDIDATES = [
  `
    video_url
    image_url
    hd_image_url
    preview_image_url
    media
    images
    hd_images
    preview_images
    thumbnails
  `,
  `
    videoUrl
    imageUrl
    hdImageUrl
    previewImageUrl
    media
    images
    hdImages
    previewImages
    thumbnails
  `,
  `
    video_url
    image_url
    hd_image_url
    preview_image_url
  `,
  `
    videoUrl
    imageUrl
    hdImageUrl
    previewImageUrl
  `,
  "",
];

const buildDiamondsQuery = (extraDiamondFields = "") => `
  query GetDiamonds($token: String!, $query: DiamondQuery!, $limit: Int, $offset: Int) {
    as(token: $token) {
      diamonds_by_query(
        query: $query
        limit: $limit
        offset: $offset
        order: { type: price, direction: ASC }
      ) {
        items {
          id
          price
          discount
          diamond {
            ${DIAMOND_BASE_FIELDS}
            ${extraDiamondFields}
          }
        }
        total_count
      }
    }
  }
`;

const buildDiamondByIdQuery = (extraDiamondFields = "") => `
  query GetDiamondById($token: String!, $query: DiamondQuery!, $limit: Int) {
    as(token: $token) {
      diamonds_by_query(query: $query, limit: $limit) {
        items {
          id
          price
          discount
          diamond {
            ${DIAMOND_BASE_FIELDS}
            ${extraDiamondFields}
          }
        }
      }
    }
  }
`;

const DIAMONDS_QUERY_CANDIDATES = DIAMOND_EXTRA_CANDIDATES.map((fields) =>
  buildDiamondsQuery(fields)
);
const DIAMOND_BY_ID_QUERY_CANDIDATES = DIAMOND_EXTRA_CANDIDATES.map((fields) =>
  buildDiamondByIdQuery(fields)
);

function toInt(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.round((numeric / 100) * 100) / 100;
}

function toPriceInt(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Math.round(numeric);
}

const isHttpUrl = (value = "") => /^https?:\/\//i.test(String(value || "").trim());
const isVideoUrl = (value = "") => MEDIA_VIDEO_EXTENSIONS.test(String(value || "").trim());

const uniqueMedia = (items = []) => {
  const seen = new Set();
  const output = [];

  items.forEach((item) => {
    if (!item?.url) return;
    const key = `${item.type}:${item.url}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(item);
  });

  return output;
};

const normalizeJsonCandidate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return value;

  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return value;
    }
  }

  return value;
};

const mediaFromValue = (value, category = "image", fallbackType = "image") => {
  if (!value) return [];

  const normalizedValue = normalizeJsonCandidate(value);

  if (typeof normalizedValue === "string") {
    const url = normalizedValue.trim();
    if (!isHttpUrl(url)) return [];
    return [
      {
        type: isVideoUrl(url) ? "video" : fallbackType,
        url,
        category,
      },
    ];
  }

  if (Array.isArray(normalizedValue)) {
    return normalizedValue.flatMap((entry) => mediaFromValue(entry, category, fallbackType));
  }

  if (typeof normalizedValue === "object") {
    const candidateKeys = [
      "url",
      "video_url",
      "videoUrl",
      "image_url",
      "imageUrl",
      "hd_image_url",
      "hdImageUrl",
      "preview_image_url",
      "previewImageUrl",
      "thumbnail_url",
      "thumbnailUrl",
      "thumbnail",
    ];

    const direct = candidateKeys.flatMap((key) =>
      mediaFromValue(normalizedValue[key], category, fallbackType)
    );

    const nested = Object.entries(normalizedValue)
      .filter(([key]) => !candidateKeys.includes(key))
      .flatMap(([, entry]) => mediaFromValue(entry, category, fallbackType));

    return [...direct, ...nested];
  }

  return [];
};

const buildNivodaMediaArray = (item = {}) => {
  const diamond = item?.diamond || {};

  const buckets = {
    video: [],
    hd: [],
    image: [],
    preview: [],
  };

  const pushMedia = (entries = [], bucket = "image") => {
    if (!Array.isArray(entries) || !entries.length) return;
    buckets[bucket].push(...entries);
  };

  pushMedia(mediaFromValue(diamond?.video, "video", "video"), "video");
  pushMedia(mediaFromValue(diamond?.video_url, "video", "video"), "video");
  pushMedia(mediaFromValue(diamond?.videoUrl, "video", "video"), "video");

  pushMedia(mediaFromValue(diamond?.hd_image_url, "hd", "image"), "hd");
  pushMedia(mediaFromValue(diamond?.hdImageUrl, "hd", "image"), "hd");
  pushMedia(mediaFromValue(diamond?.image, "image", "image"), "image");
  pushMedia(mediaFromValue(diamond?.image_url, "image", "image"), "image");
  pushMedia(mediaFromValue(diamond?.imageUrl, "image", "image"), "image");
  pushMedia(mediaFromValue(diamond?.preview_image_url, "preview", "image"), "preview");
  pushMedia(mediaFromValue(diamond?.previewImageUrl, "preview", "image"), "preview");

  pushMedia(mediaFromValue(diamond?.media, "image", "image"), "image");
  pushMedia(mediaFromValue(diamond?.images, "image", "image"), "image");
  pushMedia(mediaFromValue(diamond?.hd_images, "hd", "image"), "hd");
  pushMedia(mediaFromValue(diamond?.hdImages, "hd", "image"), "hd");
  pushMedia(mediaFromValue(diamond?.preview_images, "preview", "image"), "preview");
  pushMedia(mediaFromValue(diamond?.previewImages, "preview", "image"), "preview");
  pushMedia(mediaFromValue(diamond?.thumbnails, "preview", "image"), "preview");

  const ordered = [
    ...buckets.video.map((entry) => ({ type: "video", url: entry.url })),
    ...buckets.hd.map((entry) => ({ type: "image", url: entry.url })),
    ...buckets.image.map((entry) => ({ type: entry.type || "image", url: entry.url })),
    ...buckets.preview.map((entry) => ({ type: "image", url: entry.url })),
  ];

  return uniqueMedia(ordered);
};

const enrichDiamondItem = (item = {}) => {
  const media = buildNivodaMediaArray(item);
  const diamond = item?.diamond || {};
  const normalizedPrice = toMoney(item?.price);

  return {
    ...item,
    priceRaw: Number.isFinite(Number(item?.price)) ? Number(item.price) : item?.price ?? null,
    price: normalizedPrice ?? item?.price ?? null,
    diamond: {
      ...diamond,
      media,
    },
  };
};

function buildNivodaFilters(queryParams = {}) {
  const filters = {};

  if (queryParams.shape) {
    filters.shapes = [String(queryParams.shape).toUpperCase()];
  }

  if (queryParams.minCarat || queryParams.maxCarat) {
    filters.sizes = {
      from: toInt(queryParams.minCarat) ?? 0,
      to: toInt(queryParams.maxCarat) ?? 30,
    };
  }

  if (queryParams.color) {
    filters.color = String(queryParams.color)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  if (queryParams.clarity) {
    filters.clarity = String(queryParams.clarity)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  if (queryParams.priceMin || queryParams.priceMax) {
    filters.dollar_value = {
      from: toPriceInt(queryParams.priceMin) ?? 0,
      to: toPriceInt(queryParams.priceMax) ?? 500000,
    };
  }

  if (queryParams.cut) {
    filters.cut = String(queryParams.cut)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  if (typeof queryParams.labgrown !== "undefined") {
    filters.labgrown = String(queryParams.labgrown).toLowerCase() === "true";
  }

  return filters;
}

async function nivodaRequest(query, variables) {
  try {
    const response = await httpClient.post(env.nivoda.apiUrl, {
      query,
      variables,
    });

    if (response.data?.errors?.length) {
      throw new AppError("Nivoda API returned GraphQL errors", 502, response.data.errors);
    }

    return response.data?.data;
  } catch (error) {
    const graphqlErrors = error?.response?.data?.errors;
    if (Array.isArray(graphqlErrors) && graphqlErrors.length) {
      throw new AppError("Nivoda API returned GraphQL errors", 502, graphqlErrors);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Failed to fetch data from Nivoda", 502, {
      message: error.message,
      response: error.response?.data,
    });
  }
}

async function nivodaRequestWithFallback(queries = [], variables = {}) {
  let lastError = null;

  for (const query of queries) {
    try {
      return await nivodaRequest(query, variables);
    } catch (error) {
      lastError = error;
      const isGraphqlError =
        error instanceof AppError &&
        String(error?.message || "").toLowerCase().includes("graphql");

      if (!isGraphqlError) {
        throw error;
      }
    }
  }

  throw lastError || new AppError("Failed to fetch data from Nivoda", 502);
}

async function resolveNivodaToken() {
  if (env.nivoda.apiKey) {
    return env.nivoda.apiKey;
  }

  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt > now) {
    return cachedToken;
  }

  if (!env.nivoda.username || !env.nivoda.password) {
    throw new AppError("Missing Nivoda credentials", 500);
  }

  const data = await nivodaRequestWithFallback(AUTH_QUERY_CANDIDATES, {
    username: env.nivoda.username,
    password: env.nivoda.password,
  });

  const token =
    data?.authenticate?.username_and_password?.token ||
    data?.authenticate?.token ||
    data?.auth?.token ||
    null;
  if (!token) {
    throw new AppError("Unable to authenticate with Nivoda", 502);
  }

  cachedToken = token;
  cachedTokenExpiresAt = now + 6 * 60 * 60 * 1000;
  return token;
}

async function getDiamonds(queryParams) {
  const limit = Math.min(toInt(queryParams.limit) ?? 12, 50);
  const offset = Math.max(toInt(queryParams.offset) ?? 0, 0);
  const query = buildNivodaFilters(queryParams);
  const token = await resolveNivodaToken();

  const data = await nivodaRequestWithFallback(DIAMONDS_QUERY_CANDIDATES, {
    token,
    query,
    limit,
    offset,
  });

  const payload = data?.as?.diamonds_by_query;

  if (!payload) {
    throw new AppError("Unexpected Nivoda response structure", 502);
  }

  return {
    items: (payload.items || []).map((item) => enrichDiamondItem(item)),
    totalCount: payload.total_count || 0,
  };
}

async function getDiamondById(diamondId) {
  if (!diamondId) {
    throw new AppError("diamond id is required", 400);
  }

  const token = await resolveNivodaToken();

  const data = await nivodaRequestWithFallback(DIAMOND_BY_ID_QUERY_CANDIDATES, {
    token,
    query: {
      stone_ids: [String(diamondId)],
    },
    limit: 1,
  });

  const item = data?.as?.diamonds_by_query?.items?.[0];

  if (!item) {
    throw new AppError("Diamond not found", 404);
  }

  return enrichDiamondItem(item);
}

module.exports = {
  getDiamonds,
  getDiamondById,
};
