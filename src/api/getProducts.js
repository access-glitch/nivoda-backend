import { apiGet } from "./backendClient";

export async function getProducts(limit = 12) {
  return apiGet(`/api/shopify/products?limit=${encodeURIComponent(limit)}`);
}
