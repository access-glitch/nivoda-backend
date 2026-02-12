import { apiPost } from "./backendClient";

function toAttributePair(key, value) {
  if (!key || value === undefined || value === null || value === "") {
    return null;
  }

  return {
    key: String(key),
    value: String(value),
  };
}

export async function createShopifyCart(payload) {
  return apiPost("/api/shopify/cart", payload);
}

export async function createShopifyCheckout(payload) {
  return apiPost("/api/shopify/checkout", payload);
}

export async function createOrder(payload) {
  return apiPost("/api/order/create", payload);
}

export function buildCheckoutPayloadFromCartItems(items = []) {
  const lineItems = items
    .filter((item) => item?.shopify?.merchandiseId)
    .map((item) => ({
      merchandiseId: item.shopify.merchandiseId,
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      attributes: [
        toAttributePair("ringBuilderId", item.id),
        toAttributePair("diamondId", item.diamondId),
        toAttributePair("diamondShape", item?.diamond?.shape),
        toAttributePair("diamondCarats", item?.diamond?.carats),
      ].filter(Boolean),
    }));

  const attributes = [
    toAttributePair("source", "ring-builder"),
    toAttributePair("cartItemCount", items.length),
  ].filter(Boolean);

  return { lineItems, attributes };
}
