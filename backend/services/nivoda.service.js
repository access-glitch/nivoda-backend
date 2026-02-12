const httpClient = require("../config/httpClient");
const env = require("../config/env");
const { AppError } = require("../utils/AppError");

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const AUTH_QUERY = `
  query Authenticate($username: String!, $password: String!) {
    authenticate {
      username_and_password(username: $username, password: $password) {
        token
      }
    }
  }
`;

const DIAMONDS_QUERY = `
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
            id
            image
            video
            mine_of_origin
            certificate {
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
            }
          }
        }
        total_count
      }
    }
  }
`;

const DIAMOND_BY_ID_QUERY = `
  query GetDiamondById($token: String!, $query: DiamondQuery!, $limit: Int) {
    as(token: $token) {
      diamonds_by_query(query: $query, limit: $limit) {
        items {
          id
          price
          discount
          diamond {
            id
            image
            video
            mine_of_origin
            certificate {
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
            }
          }
        }
      }
    }
  }
`;

function toInt(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toPriceCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Math.round(numeric * 100);
}

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
      from: toPriceCents(queryParams.priceMin) ?? 0,
      to: toPriceCents(queryParams.priceMax) ?? 500000000,
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
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Failed to fetch data from Nivoda", 502, {
      message: error.message,
      response: error.response?.data,
    });
  }
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

  const data = await nivodaRequest(AUTH_QUERY, {
    username: env.nivoda.username,
    password: env.nivoda.password,
  });

  const token = data?.authenticate?.username_and_password?.token;
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

  const data = await nivodaRequest(DIAMONDS_QUERY, {
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
    items: payload.items || [],
    totalCount: payload.total_count || 0,
  };
}

async function getDiamondById(diamondId) {
  if (!diamondId) {
    throw new AppError("diamond id is required", 400);
  }

  const token = await resolveNivodaToken();

  const data = await nivodaRequest(DIAMOND_BY_ID_QUERY, {
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

  return item;
}

module.exports = {
  getDiamonds,
  getDiamondById,
};
