import { apiGet } from "./backendClient";

export async function getDiamonds(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  return apiGet(`/api/diamonds${query.toString() ? `?${query}` : ""}`);
}
