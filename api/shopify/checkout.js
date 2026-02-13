import axios from 'axios';

console.log('api/shopify/checkout loaded');

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

if (!env.shopify.storeDomain || !env.shopify.storefrontToken) {
  console.warn('api/shopify/checkout: missing SHOPIFY env vars', {
    SHOPIFY_STORE_DOMAIN: !!env.shopify.storeDomain,
    SHOPIFY_STOREFRONT_TOKEN: !!env.shopify.storefrontToken,
  });
}

const storefrontUrl = `https://${env.shopify.storeDomain}/api/${env.shopify.apiVersion}/graphql.json`;

async function storefrontRequest(query, variables = {}) {
  try {
    if (!env.shopify.storeDomain || !env.shopify.storefrontToken) {
      throw new Error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_TOKEN');
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
      throw new Error("Shopify Storefront API error");
    }

    return response.data?.data;
  } catch (error) {
    console.error('storefrontRequest error', {
      message: error?.message,
      url: storefrontUrl,
      query: query && query.slice ? query.slice(0, 200) : query,
    });
    throw new Error("Failed to call Shopify Storefront API: " + (error?.message || 'unknown'));
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { lineItems = [], attributes = [], buyerIdentity = null } = req.body || {};
    const checkout = await createCheckout(lineItems, attributes, buyerIdentity);
    res.status(201).json(checkout);
  } catch (error) {
    console.error('Error creating checkout:', error);
    res.status(500).json({ message: 'Failed to create checkout' });
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

async function createCheckout(lineItems = [], attributes = [], buyerIdentity = null) {
  const cart = await createCart(lineItems, attributes);

  return {
    cartId: cart?.id,
    checkoutUrl: cart?.checkoutUrl,
    totalQuantity: cart?.totalQuantity || 0,
    buyerIdentity,
  };
}