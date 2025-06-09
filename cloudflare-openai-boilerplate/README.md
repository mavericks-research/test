# Full-Stack Boilerplate: React + Vite Frontend, Cloudflare Worker Backend with Etherscan & OpenAI Integration

This project provides a boilerplate for a full-stack application with a React + Vite frontend and a Cloudflare Worker backend. The backend fetches Ethereum wallet transaction data from Etherscan, normalizes it, and then uses the OpenAI API to generate a human-readable summary of the wallet's activity.

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
*   **OpenAI API Key:** Obtain an API key from [OpenAI](https://platform.openai.com/account/api-keys). This is required for summarizing wallet activity.
*   **Etherscan API Key:** Obtain an API key from [Etherscan](https://etherscan.io/myapikey). This is required for fetching transaction data. A free plan is usually sufficient for development purposes.
*   **CoinGecko API Key (Optional but Recommended):** For more stable access to cryptocurrency data, sign up for a free "Demo API Key" at [CoinGecko API](https://www.coingecko.com/en/api/pricing) (choose the Demo plan). This key will be set as `COINGECKO_API_KEY`.
*   **Wrangler CLI:** Install the Cloudflare Wrangler CLI globally: `npm install -g wrangler` (or use `npx wrangler` for commands).

### Moralis API Key (Required for Wallet Features)

The application uses Moralis to fetch detailed wallet information, including token balances (ERC20 and native) and transaction history. This is primarily utilized by the functions in `backend/worker-backend/src/cryptoApi.js`. A Moralis API key is required for these features to work. If the key is missing or invalid, you may encounter errors like "Error: Moralis API key is missing. Please configure it in the backend."

**1. Obtaining a Moralis API Key:**

*   Visit the [Moralis website](https://moralis.io/) and create an account or log in.
*   Navigate to your dashboard to get your API Key. You can typically register for a free plan to start: [Moralis Signup](https://admin.moralis.com/register).
*   For more detailed information on Moralis APIs, refer to their [official documentation](https://docs.moralis.com/).

**2. Setting the API Key:**

You need to configure the `MORALIS_API_KEY` for both local development and your deployed Cloudflare Worker.

**a. Local Development (`wrangler dev`):**

*   In the `cloudflare-openai-boilerplate/backend/worker-backend/` directory, ensure you have a `.dev.vars` file (create it if it doesn't exist).
*   Add the following line to your `.dev.vars` file, replacing `YOUR_MORALIS_API_KEY_HERE` with your actual API key:
    ```ini
    MORALIS_API_KEY="YOUR_MORALIS_API_KEY_HERE"
    ```
*   The `.dev.vars` file should be in your `.gitignore` to prevent committing secrets.

**b. Deployed Cloudflare Worker (Production):**

*   Navigate to the `cloudflare-openai-boilerplate/backend/worker-backend/` directory in your terminal.
*   Store your Moralis API key securely using Wrangler secrets. You will be prompted to enter the key:
    ```bash
    npx wrangler secret put MORALIS_API_KEY
    ```
*   This command uploads the secret to Cloudflare, where your deployed worker can access it.

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

**c. Configure API Key Secrets:**
Store your API keys securely using Wrangler secrets. You'll be prompted to enter each key.
```bash
# For OpenAI
npx wrangler secret put OPENAI_API_KEY

# For Etherscan
npx wrangler secret put ETHERSCAN_API_KEY

# For CoinGecko (Optional, but recommended for stability)
npx wrangler secret put COINGECKO_API_KEY
```
Alternatively, for local development with `wrangler dev`, you can create a `.dev.vars` file in the `backend/worker-backend` directory with the following content:
```
OPENAI_API_KEY="your-openai-api-key-here"
ETHERSCAN_API_KEY="your-etherscan-api-key-here"
COINGECKO_API_KEY="your-coingecko-demo-api-key-here" # Add this line
```
**Note:** The `wrangler.toml` file has placeholders for these keys in its `[vars]` section. For production, always use secrets. For local development, `.dev.vars` is convenient.

**c.1. Configure Cloudflare KV for Budget Planner:**
The Budget Planner feature uses Cloudflare KV to store budget plan data. You need to create KV namespaces and link them to your worker.

*   **Step 1: Create KV Namespaces in Cloudflare Dashboard**
    1.  Navigate to your Cloudflare Dashboard.
    2.  Go to **Workers & Pages** > **KV**.
    3.  Click **Create a namespace**.
    4.  Enter a name for your production namespace (e.g., `BUDGET_PLANS_KV`) and click **Add**. Note the **ID** that is generated for this namespace.
    5.  It's highly recommended to create a separate namespace for local development and testing. Click **Create a namespace** again.
    6.  Enter a name for your preview/development namespace (e.g., `BUDGET_PLANS_KV_PREVIEW`) and click **Add**. Note its **ID**.

*   **Step 2: Update `wrangler.toml`**
    Open the `backend/worker-backend/wrangler.toml` file. Add or ensure the following configuration block is present, replacing the placeholder IDs with the actual IDs you obtained in Step 1:

    ```toml
    [[kv_namespaces]]
    binding = "BUDGET_PLANS_KV"
    id = "your_production_kv_namespace_id_here" # Replace with ID from step 1.4
    preview_id = "your_preview_kv_namespace_id_here" # Replace with ID from step 1.6
    ```
    *   The `binding` value (`BUDGET_PLANS_KV`) is how you'll access the KV store in your worker code (e.g., `env.BUDGET_PLANS_KV`).
    *   `id` is used when your worker is deployed (`npx wrangler deploy`).
    *   `preview_id` is used when you run your worker locally with `npx wrangler dev`.
    *   **Note:** If you only created one KV namespace (e.g., for a quick test), you can use its ID for both `id` and `preview_id`. However, be cautious if this is your production namespace, as local development would then directly affect production data.

*   **Step 3: Redeploy Worker (if already deployed)**
    If you have previously deployed your worker, you need to redeploy it for the KV binding changes in `wrangler.toml` to take effect:
    ```bash
    npx wrangler deploy
    ```
    If you are running `npx wrangler dev`, restart the development server to pick up the changes.

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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Updated
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
5.  Configure the build settings. There are two common ways to set this up for a project within a subdirectory:

    **Option 1 (Recommended for Simplicity): Set Root Directory in Pages**
    *   **Framework preset:** Select `Vite`.
    *   **Root directory:** `frontend/frontend-app`
        *   _This tells Cloudflare Pages to change to this directory before running the build command._
    *   **Build command:** `npm run build` (or `vite build`)
    *   **Build output directory:** `dist`
        *   _This is relative to the "Root directory". So, Pages will look for `frontend/frontend-app/dist`._
    *   **Environment Variables (optional but good practice):**
        *   `NODE_VERSION`: `18` or `20` (or your preferred recent Node.js version)

    **Option 2: Adjust Build Command and Output Path (if Root Directory cannot be set)**
    If your hosting platform does not allow setting a "Root directory" for the build, you might need to adjust your build command and output path from the repository root:
    *   **Framework preset:** `Vite`
    *   **Build command:** `cd frontend/frontend-app && npm run build`
    *   **Build output directory:** `frontend/frontend-app/dist`
    *   **Environment Variables (optional but good practice):**
        *   `NODE_VERSION`: `18` or `20`

    Choose the option that best fits your Cloudflare Pages project configuration flow. Option 1 is generally cleaner if available.
6.  Deploy!

**Example: Deploying to Netlify**

1.  Push your project to a GitHub (or GitLab, Bitbucket) repository.
2.  Log in to your Netlify account.
3.  Click on "Add new site" (or "Import from Git") and choose your Git provider.
4.  Select your repository.
5.  Configure the build settings.
    **Note:** This repository includes a `netlify.toml` file in the root directory which pre-configures these settings for you. Netlify should automatically detect and use it. If you need to configure manually or understand the settings, they are typically:

    **Recommended Configuration (as in `netlify.toml`):**
    *   **Base directory:** `frontend/frontend-app`
        *   _This is the most important setting. It tells Netlify to change its working directory to `frontend/frontend-app` before running the build command. Ensure this exact path from your repository root is entered._
    *   **Build command:** `npm run build` (or `vite build`)
        *   _This command will be executed *inside* the Base directory specified above._
    *   **Publish directory:** `dist`
        *   _This path is relative to the Base directory. So, Netlify will look for `frontend/frontend-app/dist`._
    *   Ensure there are no typos in these path settings in the Netlify UI.

    **Alternative Configuration (if the above causes issues):**
    If you continue to have problems with the "Base directory" setting, try this:
    *   **Base directory:** (leave this blank or set to the repository root)
    *   **Build command:** `cd frontend/frontend-app && npm run build`
        *   _This manually changes the directory before building._
    *   **Publish directory:** `frontend/frontend-app/dist`
        *   _This path must be specified from the repository root._

    You might also need to set `NODE_VERSION` in "Site settings" > "Build & deploy" > "Environment" > "Environment variables" (e.g., `NODE_VERSION` to `18` or `20`).

6.  Click "Deploy site". After deployment, check the deploy log on Netlify for any errors.

## How it Works

1.  The React frontend makes a POST request to the Cloudflare Worker endpoint (`WORKER_URL`) with a JSON body containing the `walletAddress`.
2.  The Cloudflare Worker receives the request and extracts the `walletAddress`.
3.  It calls the Etherscan API (using your `ETHERSCAN_API_KEY` secret) to fetch the list of normal transactions for the given address.
4.  The fetched transaction data is then normalized:
    *   **Token Names:** Known token contract addresses are mapped to their symbols (e.g., USDC, USDT).
    *   **USD Values (Placeholder):** A `valueUSD` field is added. Currently, this is a placeholder and directly copies the transaction's `value` (in Wei for ETH). True USD conversion would require price feeds.
    *   **Timestamps:** Unix timestamps are converted to ISO 8601 format.
5.  A detailed prompt is constructed using the normalized transaction summary (number of transactions, total value, tokens involved, date range).
6.  This prompt is sent to the OpenAI API (using your `OPENAI_API_KEY` secret) to generate a human-readable summary of the wallet's activity.
7.  The Cloudflare Worker sends OpenAI's summary (along with the normalized transaction data) back to the React frontend.
8.  The frontend displays the received summary and can optionally display the transaction data.

## Etherscan & OpenAI Wallet Summary API

The backend worker expects a POST request with a JSON body.

**Request:**
*   **URL:** Your deployed worker URL (e.g., `https://worker-backend.<your-cloudflare-subdomain>.workers.dev`)
*   **Method:** `POST`
*   **Headers:** `Content-Type: application/json`
*   **Body:**
    ```json
    {
      "walletAddress": "0xYourEthereumWalletAddressHere"
    }
    ```

**Response (Success):**
*   **Status Code:** `200 OK`
*   **Body:**
    ```json
    {
      "message": "AI summary generated successfully", // Or a message indicating no transactions, etc.
      "summary": "This is a human-readable summary generated by OpenAI based on the wallet's transaction history...",
      "transactionData": [
        // Array of normalized transaction objects
        {
          "hash": "0x...",
          "from": "0x...",
          "to": "0x...",
          "value": "1000000000000000000", // Value in Wei
          "timeStamp": "1672531200",
          // Added by normalizer.js:
          "tokenInvolved": "USDC", // If applicable
          "valueUSD": "1000000000000000000", // Placeholder, currently same as value
          "dateTime": "2023-01-01T00:00:00.000Z"
        },
        // ... other transactions
      ]
    }
    ```

**Response (Error):**
*   **Status Code:** Varies (e.g., 400 for bad request, 500 for server errors).
*   **Body:** Plain text or JSON describing the error. For example:
    ```json
    "Missing \"walletAddress\" in request body"
    ```
    or
    ```json
    "OPENAI_API_KEY not configured. Please set it in wrangler.toml or as a secret."
    ```

## CoinGecko Cryptocurrency Data API

The backend worker also provides endpoints to fetch cryptocurrency data from CoinGecko. If you are using a CoinGecko Demo API Key (recommended), ensure it's set as the `COINGECKO_API_KEY` secret or in your `.dev.vars` file. If not set, requests will be made without an API key and rely on IP-based rate limiting from CoinGecko, which may be less reliable.

### 1. Get Current Cryptocurrency Prices

*   **URL:** Your deployed worker URL + `/api/crypto/current`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `coins`: Comma-separated list of coin IDs (e.g., `bitcoin,ethereum`). You can find coin IDs using the `/api/crypto/coinslist` endpoint or on the CoinGecko website.
    *   `currencies`: Comma-separated list of currency codes to get prices in (e.g., `usd,eur`).
*   **Example Request (using curl):**
    ```bash
    curl "https://your-worker-url.workers.dev/api/crypto/current?coins=bitcoin,ethereum&currencies=usd,gbp"
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "bitcoin": {
        "usd": 68000.50,
        "gbp": 54000.20
      },
      "ethereum": {
        "usd": 3400.75,
        "gbp": 2700.60
      }
    }
    ```

### 2. Get Historical Cryptocurrency Data

*   **URL:** Your deployed worker URL + `/api/crypto/historical`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `coin`: A single coin ID (e.g., `bitcoin`).
    *   `date`: The date for historical data in `dd-mm-yyyy` format (e.g., `15-10-2023`).
        *   Note: The CoinGecko Public API (free tier) limits historical data to the last 365 days.
*   **Example Request (using curl):**
    ```bash
    curl "https://your-worker-url.workers.dev/api/crypto/historical?coin=bitcoin&date=15-10-2023"
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "id": "bitcoin",
      "symbol": "btc",
      "name": "Bitcoin",
      "localization": { /* ... */ },
      "image": { /* ... */ },
      "market_data": {
        "current_price": {
          "usd": 26873.00
          // ... other currencies if available on that date
        },
        "market_cap": {
          "usd": 523853000000.00
          // ...
        },
        "total_volume": {
          "usd": 6758000000.00
          // ...
        }
      },
      "community_data": { /* ... */ },
      "developer_data": { /* ... */ },
      "public_interest_stats": { /* ... */ }
    }
    ```

### 3. Get Full Coin List (Utility)

*   **URL:** Your deployed worker URL + `/api/crypto/coinslist`
*   **Method:** `GET`
*   **Purpose:** Retrieves a list of all coins supported by CoinGecko, along with their IDs, symbols, and names. Useful for finding the correct `id` to use in other API calls.
*   **Example Request (using curl):**
    ```bash
    curl "https://your-worker-url.workers.dev/api/crypto/coinslist"
    ```
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": "01coin",
        "symbol": "zoc",
        "name": "01coin"
      },
      {
        "id": "bitcoin",
        "symbol": "btc",
        "name": "Bitcoin"
      }
      // ... many more coins
    ]
    ```

## Customization

*   **OpenAI Model:** The default model is `gpt-3.5-turbo-instruct`. You can change the `model` parameter in `backend/worker-backend/src/index.js` to use different OpenAI models. For chat models like `gpt-4` or `gpt-3.5-turbo`, you would need to change the API endpoint to `/v1/chat/completions` and adjust the request/response structure accordingly.
*   **Transaction Normalization:** The logic in `backend/worker-backend/src/normalizer.js` can be expanded:
    *   Add more token contract addresses to `TOKEN_CONTRACTS`.
    *   Implement actual USD conversion in `convertToUSD` by fetching price data for ETH and tokens.
    *   Enhance ERC20 detection in `normalizeTokenNames` by decoding transaction input data if necessary.
*   **Frontend UI:** Modify the React components in `frontend/frontend-app/src/` to change the appearance and functionality, for example, to better display the transaction list or AI summary.
*   **Worker Logic:** Extend the Cloudflare Worker in `backend/worker-backend/src/index.js` for more complex backend tasks, such as supporting different types of Etherscan queries (e.g., token transactions, internal transactions) or adding more data sources.
```
