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
    const limit = Number(req.query.limit) || 12;
    const products = await getProducts(limit);
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
}

async function getProducts(limit = 12) {
  const query = `
    query GetProducts($limit: Int!) {
      products(first: $limit) {
        edges {
          node {
            id
            title
            featuredImage { url }
            images(first: 3) {
              edges {
                node { url }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  title
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

  const data = await storefrontRequest(query, { limit: Number(limit) || 12 });

  return (data?.products?.edges || []).map(({ node }) => {
    const primaryVariant = node.variants?.edges?.[0]?.node;
    const amount = Number(primaryVariant?.price?.amount || 0);
    const currency = primaryVariant?.price?.currencyCode || "USD";

    return {
      id: node.id,
      title: node.title,
      image: node.featuredImage?.url || node.images?.edges?.[0]?.node?.url || "",
      images: (node.images?.edges || []).map((edge) => edge.node.url).filter(Boolean),
      merchandiseId: primaryVariant?.id || null,
      priceAmount: amount,
      currencyCode: currency,
      price: `$${amount.toLocaleString()} ${currency}`,
    };
  });
}