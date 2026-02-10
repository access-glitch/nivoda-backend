const SHOPIFY_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION;

const SHOPIFY_API_URL = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

export async function getTopSellers(limit = 4) {
  const res = await fetch(SHOPIFY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
    },
    body: JSON.stringify({
      query: `
        {
          products(first: ${limit}, sortKey: BEST_SELLING) {
            edges {
              node {
                id
                title
                featuredImage { url }
                variants(first: 1) {
                  edges {
                    node {
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
      `,
    }),
  });

  const json = await res.json();
  console.log("SHOPIFY RESPONSE 👉", json);

  if (!json.data || !json.data.products) {
    throw new Error("Unauthorized or no products");
  }

  return json.data.products.edges;
}
