import axios from 'axios';

const httpClient = axios.create({
  timeout: 20000,
});

const env = {
  shopify: {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
    adminToken: process.env.SHOPIFY_ADMIN_TOKEN,
    apiVersion: process.env.SHOPIFY_API_VERSION || '2025-01',
  },
};

const adminUrl = `https://${env.shopify.storeDomain}/admin/api/${env.shopify.apiVersion}/graphql.json`;

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
      throw new Error("Shopify Admin API error");
    }

    return response.data?.data;
  } catch (error) {
    throw new Error("Failed to call Shopify Admin API");
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const orderPayload = req.body || {};
    const order = await createOrder(orderPayload);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
}

async function createOrder(orderPayload = {}) {
  const lineItems = (orderPayload.lineItems || [])
    .filter((item) => item?.variantId && Number(item.quantity) > 0)
    .map((item) => ({
      variantId: item.variantId,
      quantity: Number(item.quantity),
    }));

  if (!lineItems.length) {
    throw new Error("At least one valid order line item is required");
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
    throw new Error("Unable to create Shopify order");
  }

  return payload?.draftOrder;
}