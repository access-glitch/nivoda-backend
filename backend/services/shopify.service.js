const httpClient = require("../config/httpClient");
const env = require("../config/env");
const { AppError } = require("../utils/AppError");

const storefrontUrl = `https://${env.shopify.storeDomain}/api/${env.shopify.apiVersion}/graphql.json`;
const adminUrl = `https://${env.shopify.storeDomain}/admin/api/${env.shopify.apiVersion}/graphql.json`;

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
  storefrontProxy,
  getProducts,
  getTopSellers,
  createCart,
  createCheckout,
  createOrder,
};
