# Full-Stack Boilerplate: React + Vite Frontend, Cloudflare Worker Backend, OpenAI Integration

This project provides a boilerplate for a full-stack application with a React + Vite frontend and a Cloudflare Worker backend that integrates with the OpenAI API.

## Project Structure

```
cloudflare-openai-boilerplate/
├── backend/
│   └── worker-backend/       # Cloudflare Worker project
│       ├── src/
│       │   └── index.js      # Worker script
│       └── wrangler.toml     # Worker configuration
├── frontend/
│   └── frontend-app/         # React + Vite project
│       ├── src/
│       │   └── App.jsx       # Main React component
│       └── package.json
└── README.md
```

## Prerequisites

*   **Node.js and npm:** Make sure you have Node.js (v20 or later recommended, v18 minimum) and npm installed. You can download them from [nodejs.org](https://nodejs.org/). (Note: The backend worker initialization requires Node v20+ for current Wrangler versions).
*   **Cloudflare Account:** You'll need a Cloudflare account. If you don't have one, sign up at [cloudflare.com](https://www.cloudflare.com/).
*   **OpenAI API Key:** Obtain an API key from [OpenAI](https://platform.openai.com/account/api-keys).
*   **Wrangler CLI:** Install the Cloudflare Wrangler CLI globally: `npm install -g wrangler` (or use `npx wrangler` for commands).

## Setup and Deployment

### 1. Backend (Cloudflare Worker)

The backend is a Cloudflare Worker that proxies requests to the OpenAI API.

**a. Navigate to the worker directory:**
```bash
cd backend/worker-backend
```

**b. Log in to Wrangler (if you haven't already):**
This will open a browser window to authenticate with your Cloudflare account.
```bash
npx wrangler login
```

**c. Configure OpenAI API Key Secret:**
Replace `your-openai-api-key-here` with your actual OpenAI API key. This command securely stores your API key as an environment variable for your worker.
```bash
npx wrangler secret put OPENAI_API_KEY
```
Enter your API key when prompted.

**d. Deploy the Worker:**
This command will build and deploy your worker to your Cloudflare account.
```bash
npx wrangler deploy
```
After deployment, Wrangler will output the URL of your deployed worker (e.g., `https://worker-backend.<your-cloudflare-subdomain>.workers.dev`). **Note this URL.**

**e. (Optional) Local Development for Worker:**
To run the worker locally for development:
```bash
npx wrangler dev
```
This will typically start the worker on `http://localhost:8787`. You would also need to create a `.dev.vars` file in `backend/worker-backend` with `OPENAI_API_KEY="your-key"` for local testing with secrets.

**Important Note on CORS during Local Development:**
The frontend (e.g., running on `http://localhost:5173`) and the local worker (`wrangler dev`, typically on `http://localhost:8787`) are on different origins. Browsers will make a "preflight" `OPTIONS` request to the worker before the actual `POST` request to ensure the server allows cross-origin requests. The provided `backend/worker-backend/src/index.js` has been configured to handle these `OPTIONS` requests correctly.

The `corsHeaders` in `index.js` are set to:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For local dev, '*' is fine. For prod, restrict this to your frontend domain.
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```
For a production deployment, you should change `'Access-Control-Allow-Origin': '*'` to your specific frontend's domain (e.g., `'Access-Control-Allow-Origin': 'https://your-frontend-app.pages.dev'`) for enhanced security.

### 2. Frontend (React + Vite)

The frontend is a React application built with Vite.

**a. Navigate to the frontend directory:**
(Assuming you are in the root `cloudflare-openai-boilerplate` directory)
```bash
cd frontend/frontend-app
```
Or, if you are in `backend/worker-backend`:
```bash
cd ../../frontend/frontend-app
```

**b. Install dependencies:**
```bash
npm install
```

**c. Update Worker URL in Frontend Code:**
Open `frontend/frontend-app/src/App.jsx` in your code editor.
Find the `WORKER_URL` constant and replace the placeholder URL with the actual URL of your deployed Cloudflare Worker (obtained in step 1.d).

```javascript
// In frontend/frontend-app/src/App.jsx
// Replace with your actual worker URL:
const WORKER_URL = 'https://worker-backend.<your-cloudflare-subdomain>.workers.dev';

// For local development, if your worker is running via `npx wrangler dev` (usually on port 8787):
// const WORKER_URL = 'http://localhost:8787';
```
If you are running the worker locally using `wrangler dev` (e.g., on `http://localhost:8787`), you can use that URL for local frontend development.

**d. Run the Frontend Development Server:**
```bash
npm run dev
```
This will start the Vite development server, typically at `http://localhost:5173`. Open this URL in your browser to see the application.

**e. Build for Production:**
When you're ready to deploy the frontend:
```bash
npm run build
```
This command creates a `dist` folder in `frontend/frontend-app` containing the optimized static assets.

### 3. Deploying the Frontend

You can deploy the static frontend (the contents of `frontend/frontend-app/dist`) to various hosting platforms like Cloudflare Pages, Vercel, Netlify, or GitHub Pages.

**Example: Deploying to Cloudflare Pages**

1.  Push your project to a GitHub (or GitLab) repository.
2.  In your Cloudflare dashboard, go to "Workers & Pages".
3.  Select "Create application" > "Pages" > "Connect to Git".
4.  Choose your repository.
5.  Configure the build settings:
    *   **Framework preset:** `Vite`
    *   **Build command:** `npm run build`
    *   **Build output directory:** `frontend/frontend-app/dist`
    *   **Root Directory (under "Build configuration"):** Set this to `frontend/frontend-app` if you are running the build from the repository root. If your Git repository root is `frontend-app` itself, then the build output directory would just be `dist`.
    *   You might need to set the Node.js version in Environment Variables (e.g., `NODE_VERSION` to `20`).
6.  Deploy!

## How it Works

1.  The React frontend makes a POST request to the Cloudflare Worker endpoint (`WORKER_URL`).
2.  The Cloudflare Worker receives the request, extracts the prompt, and securely forwards it to the OpenAI API, including your `OPENAI_API_KEY` (which is stored as a secret in Cloudflare, not exposed to the frontend).
3.  The OpenAI API processes the prompt and returns a completion.
4.  The Cloudflare Worker sends this response back to the React frontend.
5.  The frontend displays the received text.

## Customization

*   **OpenAI Model:** The default model is `gpt-3.5-turbo-instruct`. You can change the `model` parameter in `backend/worker-backend/src/index.js` to use different OpenAI models (e.g., other models compatible with the `/v1/completions` endpoint, or switch to `/v1/chat/completions` for models like `gpt-4` which would require changing the API endpoint and request/response structure).
*   **Frontend UI:** Modify the React components in `frontend/frontend-app/src/` to change the appearance and functionality.
*   **Worker Logic:** Extend the Cloudflare Worker in `backend/worker-backend/src/index.js` for more complex backend tasks.
```
