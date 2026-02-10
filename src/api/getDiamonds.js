const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export async function getDiamonds(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  const res = await fetch(
    `${API_BASE_URL}/api/diamonds${query.toString() ? `?${query}` : ""}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch diamonds");
  }

  return res.json();
}
