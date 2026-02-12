import { apiGet } from "./backendClient";

export async function getTopSellers(limit = 4) {
  return apiGet(`/api/shopify/top-sellers?limit=${encodeURIComponent(limit)}`);
}
