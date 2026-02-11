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
