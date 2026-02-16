# Nivoda Ring Builder Backend

Quick notes to get diamonds showing after deployment.

1) Deployment
- This project includes `render.yaml` for Render (https://render.com). The service is named `ring-builder-backend` so the default public URL will be:

- `https://ring-builder-backend.onrender.com`

2) Frontend configuration
- The frontend must call the deployed backend instead of `http://localhost:3000`.
- Update the frontend API base to:

- `https://ring-builder-backend.onrender.com/api`

Common places to change in frontend:
- environment variables (e.g. `REACT_APP_API_URL` or similar)
- network request base URLs in code (search for `localhost:3000`)

3) Health and quick tests
- Health endpoint:

```bash
curl https://ring-builder-backend.onrender.com/api/health
```

- Diamonds endpoint (example):

```bash
curl "https://ring-builder-backend.onrender.com/api/diamonds?limit=6&labgrown=false"
```

If you receive a 500 with "Missing Nivoda credentials", make sure `NIVODA_USERNAME` and `NIVODA_PASSWORD` are set in your Render environment variables (they are marked `sync: false` in `render.yaml`).

4) Static assets / images
- The backend serves `./public` at `/public` (e.g. `https://.../public/logo.png`). If frontend tries to load images from the backend, place them in the `public` folder or update image URLs in the frontend to their hosted locations.

5) Local testing
- Install dependencies and start locally:

```powershell
npm install
npm start
```

Then hit the health or diamonds endpoints above (when running locally the base URL is `http://localhost:3000/api`).

If you'd like, I can update the frontend repo (if you provide it) to switch the API base automatically to the deployed URL.

6) Use a custom domain (e.g. `https://danhov.innovatedevelopers.com`)

- If you want the backend to be reachable at `https://danhov.innovatedevelopers.com` you must:
	1. Add the custom domain to your Render service (Dashboard → your service → Settings → Custom Domains). Render will provide a DNS target (CNAME).
	2. In your DNS provider, create a `CNAME` record for `danhov.innovatedevelopers.com` pointing to the Render DNS target.
	3. Wait for DNS propagation and ensure Render issues an SSL cert (Render does this automatically after domain is verified).
	4. In Render environment variables for the backend service, ensure `CORS_ORIGIN` includes the frontend domain(s) that will call the backend (for example `https://ring-builder-frontend.onrender.com,https://danhov.innovatedevelopers.com`).

- After the custom domain is active, update your frontend API base to `https://danhov.innovatedevelopers.com/api` (or set an env var with that value) and redeploy the frontend.

If you want, I can prepare the exact DNS CNAME value once you tell me the Render service public hostname (for example `ring-builder-backend.onrender.com`).
