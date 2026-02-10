const SHOPIFY_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION;

export async function getProducts(limit = 12) {
  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
      },
      body: JSON.stringify({
        query: `
          {
            products(first: ${limit}) {
              edges {
                node {
                  id
                  title
                  images(first: 3) {
                    edges {
                      node {
                        url
                      }
                    }
                  }
                  priceRange {
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        `,
      }),
    }
  );

  const json = await res.json();

  if (json.errors) {
    console.error(json.errors);
    return [];
  }

  return json.data.products.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    image: node.images.edges[0]?.node.url || "",
    images: node.images.edges.map((edge) => edge.node.url).filter(Boolean),
    price: `$${node.priceRange.minVariantPrice.amount} ${node.priceRange.minVariantPrice.currencyCode}`,
    badge: "",
  }));
}
