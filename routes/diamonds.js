const express = require("express");
const axios = require("axios");

const router = express.Router();

const NIVODA_API_URL =
  process.env.NIVODA_API_URL ||
  "https://integrations.nivoda.net/api/diamonds";

const NIVODA_USERNAME = process.env.NIVODA_USERNAME;
const NIVODA_PASSWORD = process.env.NIVODA_PASSWORD;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const AUTH_QUERY = `
  query ($username: String!, $password: String!) {
    authenticate {
      username_and_password(username: $username, password: $password) {
        token
      }
    }
  }
`;

const DIAMONDS_QUERY = `
  query ($token: String!, $query: DiamondQuery!, $limit: Int, $offset: Int) {
    as(token: $token) {
      diamonds_by_query(
        query: $query,
        offset: $offset,
        limit: $limit,
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

const toIntPrice = (value) => {
  const number = Number(value);
  if (Number.isNaN(number)) return null;
  return Math.round(number * 100);
};

const buildQueryFilters = (query) => {
  const filters = {};

  if (query.shape) {
    filters.shapes = [String(query.shape).toUpperCase()];
  }

  if (query.minCarat || query.maxCarat) {
    const from = query.minCarat ? Number(query.minCarat) : 0;
    const to = query.maxCarat ? Number(query.maxCarat) : 30;
    filters.sizes = { from, to };
  }

  if (query.color) {
    filters.color = String(query.color)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  if (query.clarity) {
    filters.clarity = String(query.clarity)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  if (query.cut) {
    filters.cut = String(query.cut)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  if (query.priceMin || query.priceMax) {
    const from = query.priceMin ? toIntPrice(query.priceMin) : 0;
    const to = query.priceMax ? toIntPrice(query.priceMax) : 500000000;
    if (from !== null && to !== null) {
      filters.dollar_value = { from, to };
    }
  }

  if (query.returns !== undefined) {
    filters.returns = String(query.returns).toLowerCase() === "true";
  }

  if (query.labgrown !== undefined) {
    filters.labgrown = String(query.labgrown).toLowerCase() === "true";
  }

  if (query.preferredCurrency) {
    filters.preferredCurrency = String(query.preferredCurrency).toUpperCase();
  }

  return filters;
};

const getToken = async () => {
  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt > now) {
    return cachedToken;
  }

  if (!NIVODA_USERNAME || !NIVODA_PASSWORD) {
    throw new Error("Missing Nivoda credentials");
  }

  const response = await axios.post(NIVODA_API_URL, {
    query: AUTH_QUERY,
    variables: {
      username: NIVODA_USERNAME,
      password: NIVODA_PASSWORD,
    },
  });

  const token =
    response.data?.data?.authenticate?.username_and_password?.token;

  if (!token) {
    throw new Error("Failed to authenticate with Nivoda");
  }

  cachedToken = token;
  cachedTokenExpiresAt = now + 6 * 60 * 60 * 1000;

  return token;
};

router.get("/", async (req, res) => {
  try {
    const token = await getToken();
    const filters = buildQueryFilters(req.query);

    const limit = req.query.limit ? Number(req.query.limit) : 12;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const response = await axios.post(NIVODA_API_URL, {
      query: DIAMONDS_QUERY,
      variables: {
        token,
        query: filters,
        limit,
        offset,
      },
    });

    const result = response.data?.data?.as?.diamonds_by_query;

    if (!result) {
      return res.status(502).json({ error: "Invalid Nivoda response" });
    }

    return res.json({
      items: result.items || [],
      totalCount: result.total_count || 0,
    });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;

    return res.status(500).json({
      error: "Nivoda API error",
      details: err.message || "Unknown error",
      status,
      data,
    });
  }
});

router.get("/schema", async (req, res) => {
  try {
    const typeName = req.query.type ? String(req.query.type) : "Diamond";
    const response = await axios.post(NIVODA_API_URL, {
      query: "query ($name: String!) { __type(name: $name) { name fields { name } } }",
      variables: { name: typeName },
    });

    return res.json(response.data);
  } catch (err) {
    return res.status(500).json({
      error: "Nivoda schema error",
      details: err.message || "Unknown error",
      status: err.response?.status,
      data: err.response?.data,
    });
  }
});

module.exports = router;
