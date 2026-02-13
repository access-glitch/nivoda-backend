import axios from 'axios';

const httpClient = axios.create({
  timeout: 20000,
});

const env = {
  shopify: {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
    storefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN,
    apiVersion: process.env.SHOPIFY_API_VERSION || '2025-01',
  },
};

const storefrontUrl = `https://${env.shopify.storeDomain}/api/${env.shopify.apiVersion}/graphql.json`;

async function storefrontRequest(query, variables = {}) {
  try {
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
      throw new Error("Shopify Storefront API error");
    }

    return response.data?.data;
  } catch (error) {
    throw new Error("Failed to call Shopify Storefront API");
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const limit = Number(req.query.limit) || 4;
    const products = await getTopSellers(limit);
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching top sellers:', error);
    res.status(500).json({ message: 'Failed to fetch top sellers' });
  }
}

async function getTopSellers(limit = 4) {
  const query = `
    query GetTopSellers($limit: Int!) {
      products(first: $limit, sortKey: BEST_SELLING) {
        edges {
          node {
            id
            title
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

  const data = await storefrontRequest(query, { limit: Number(limit) || 4 });
  return data?.products?.edges || [];
}