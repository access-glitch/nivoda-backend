# Ring Builder (React + Shopify + Nivoda)

Production-ready custom frontend + secure backend middleware for:
- React (Vite) custom UI
- Nivoda inventory + filtering from backend only
- Shopify Storefront checkout flow
- Shopify Admin order creation/sync flow

## Final Architecture

```text
frontend/ (this root Vite app)
backend/
 ├── server.js
 ├── routes/
 │   ├── nivoda.routes.js
 │   ├── shopify.routes.js
 │   ├── order.routes.js
 ├── controllers/
 │   ├── nivoda.controller.js
 │   ├── shopify.controller.js
 │   ├── order.controller.js
 ├── services/
 │   ├── nivoda.service.js
 │   ├── shopify.service.js
 ├── middleware/
 │   ├── asyncHandler.js
 │   ├── errorHandler.js
 │   ├── notFound.js
 ├── config/
 │   ├── env.js
 │   ├── httpClient.js
 ├── utils/
 │   ├── AppError.js
 ├── package.json
 ├── .env.example
 └── render.yaml
```

## Backend API Contract

Implemented and production-routed in `backend/server.js`:

- `GET /api/health`
- `GET /api/diamonds`
- `GET /api/diamond/:id`
- `POST /api/shopify/cart`
- `POST /api/shopify/checkout`
- `POST /api/order/create`

Additional frontend support endpoints:

- `GET /api/shopify/products`
- `GET /api/shopify/top-sellers`
- `POST /api/shopify/storefront`

## Environment Variables

### Backend (`backend/.env`)

Required:

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxx
SHOPIFY_STOREFRONT_TOKEN=xxx
NIVODA_API_KEY=xxx
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Optional:

```bash
SHOPIFY_API_VERSION=2025-01
NIVODA_API_URL=https://integrations.nivoda.net/api/diamonds
```

### Frontend (`.env`)

```bash
VITE_BACKEND_URL=http://localhost:3000
VITE_SHOPIFY_STORE_URL=https://your-store.myshopify.com
```

## Local Run

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
npm install
npm run dev
```

## Shopify + Nivoda Integration Logic

- Nivoda calls are done only in `backend/services/nivoda.service.js`.
- Filters supported on `/api/diamonds`: `shape`, `minCarat`, `maxCarat`, `color`, `clarity`, `cut`, `priceMin`, `priceMax`, `labgrown`, `limit`, `offset`.
- Real-time pricing is returned directly from each Nivoda response.
- Shopify Storefront GraphQL is called in `backend/services/shopify.service.js` for products, cart, and checkout.
- Shopify Admin GraphQL is called in the same service for `POST /api/order/create` (draft order creation).
- API tokens are never exposed in React code.

## Frontend API Usage Examples

### 1) Diamonds from backend

```js
import { getDiamonds } from "./src/api/getDiamonds";

const result = await getDiamonds({
  shape: "ROUND",
  minCarat: 1,
  maxCarat: 2,
  color: "D,E,F",
  clarity: "VVS1,VVS2",
  priceMin: 1000,
  priceMax: 8000,
  limit: 12,
});
```

### 2) Create checkout via backend

```js
import { createShopifyCheckout } from "./src/api/shopifyCheckout";

const checkout = await createShopifyCheckout({
  lineItems: [
    {
      merchandiseId: "gid://shopify/ProductVariant/1234567890",
      quantity: 1,
      attributes: [{ key: "diamondId", value: "abc123" }],
    },
  ],
  attributes: [{ key: "source", value: "ring-builder" }],
});

window.location.href = checkout.checkoutUrl;
```

### 3) Create order via backend (Admin API)

```js
import { createOrder } from "./src/api/shopifyCheckout";

const order = await createOrder({
  email: "customer@example.com",
  note: "Ring Builder order",
  lineItems: [
    { variantId: "gid://shopify/ProductVariant/1234567890", quantity: 1 },
  ],
  customAttributes: [
    { key: "diamondId", value: "abc123" },
    { key: "diamondShape", value: "ROUND" },
  ],
});
```

## Render Deployment Steps

### Recommended: Blueprint deploy (single `render.yaml`)

1. In Render, create a **Blueprint** service from this repo.
2. Render will create both services from `render.yaml`:
  - `ring-builder-frontend` (Static Site)
  - `ring-builder-backend` (Web Service, `rootDir=backend`)
3. In backend service env vars, set secrets (`sync: false` fields):
  - `SHOPIFY_ADMIN_TOKEN`
  - `SHOPIFY_STOREFRONT_TOKEN`
  - `NIVODA_API_KEY` **or** (`NIVODA_USERNAME` + `NIVODA_PASSWORD`)
  - `FRONTEND_URL` = your frontend Render URL (or comma-separated allowlist)
4. Keep frontend env var `VITE_BACKEND_URL` pointed to your backend Render URL.
5. Redeploy both services after setting env vars.

## Shopify Setup Steps

1. Create a custom app in Shopify Admin.
2. Enable Storefront API scopes required for products/cart/checkout.
3. Generate Storefront access token and set `SHOPIFY_STOREFRONT_TOKEN` in backend only.
4. Enable Admin API scopes for draft orders/orders/products read/write as needed.
5. Generate Admin API token and set `SHOPIFY_ADMIN_TOKEN` in backend only.
6. Confirm your product variants are published to the sales channel used by Storefront API.

## Common Mistakes to Avoid

- Putting `SHOPIFY_ADMIN_TOKEN`, `SHOPIFY_STOREFRONT_TOKEN`, or `NIVODA_API_KEY` in frontend env vars.
- Leaving `FRONTEND_URL` too broad (use exact domain, comma-separated allowlist if needed).
- Sending Shopify product IDs where variant/merchandise IDs are required.
- Mismatching `SHOPIFY_API_VERSION` across tested and deployed environments.
- Not publishing products/variants to the storefront channel.
- Assuming Nivoda query filters are case-insensitive without normalizing (backend normalizes these).
