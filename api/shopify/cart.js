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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { lineItems = [], attributes = [] } = req.body || {};
    const cart = await createCart(lineItems, attributes);
    res.status(201).json(cart);
  } catch (error) {
    console.error('Error creating cart:', error);
    res.status(500).json({ message: 'Failed to create cart' });
  }
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
    throw new Error("At least one valid line item is required");
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
    throw new Error("Unable to create Shopify cart");
  }

  return payload?.cart;
}