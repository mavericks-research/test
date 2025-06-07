# test

## Running Tests

This section provides instructions on how to run the tests for both the frontend and backend parts of the application.

### Frontend

The frontend tests are located in `cloudflare-openai-boilerplate/frontend/frontend-app/src/components/CryptoDisplay.test.jsx`. These tests are designed to verify the functionality of React components.

To run the frontend unit tests:
1.  Navigate to the frontend application directory:
    ```bash
    cd cloudflare-openai-boilerplate/frontend/frontend-app
    ```
2.  Ensure you have Jest and React Testing Library installed (usually as dev dependencies).
3.  You can run the tests using a Jest-compatible test runner. If Jest is configured in your `package.json` scripts (e.g., as `test`), you can use:
    ```bash
    npm test
    ```
    Alternatively, you can run Jest directly (you might need to install `jest` globally or use `npx`):
    ```bash
    npx jest
    ```

For linting the frontend code, navigate to the `cloudflare-openai-boilerplate/frontend/frontend-app` directory and run:
```bash
npm run lint
```

### Backend

The backend integration tests are conceptually located in `cloudflare-openai-boilerplate/backend/worker-backend/tests/`. These tests are designed to verify the Cloudflare worker API endpoints.

To run the backend tests:
1.  Navigate to the backend worker directory:
    ```bash
    cd cloudflare-openai-boilerplate/backend/worker-backend
    ```
2.  Ensure you have your testing framework (e.g., Jest) and Miniflare (for local worker simulation) installed.
3.  If tests are configured in your `package.json` scripts (e.g., as `test`), you can use:
    ```bash
    npm test
    ```
    or
    ```bash
    yarn test
    ```
    This command should execute the test files located in the `tests/` directory.

## API Key Configuration

For the cryptocurrency features of this application to function reliably and to avoid rate limits with the public CoinGecko API, it is highly recommended to use a CoinGecko API key.

### Obtaining a CoinGecko API Key

1.  Visit [CoinGecko](https://www.coingecko.com).
2.  Create a free account.
3.  Navigate to your Developer Dashboard (or API section) to obtain your API Key. CoinGecko typically offers a free "Demo" plan with generous rate limits suitable for development and small applications.

### Setting the API Key

You need to configure the `COINGECKO_API_KEY` environment variable for both local development and your deployed Cloudflare Worker.

#### Local Development (`wrangler dev`)

When running the backend worker locally using `wrangler dev`:

1.  In the `cloudflare-openai-boilerplate/backend/worker-backend/` directory, create a file named `.dev.vars` if it does not already exist.
2.  Add the following line to your `.dev.vars` file, replacing `YOUR_API_KEY_HERE` with the actual API key you obtained from CoinGecko:
    ```ini
    COINGECKO_API_KEY="YOUR_API_KEY_HERE"
    ```
3.  The `.dev.vars` file is typically included in `.gitignore` to prevent accidental commit of sensitive credentials. Ensure it is if you are managing your project with Git.

#### Deployed Cloudflare Worker

When your worker is deployed to Cloudflare:

1.  Go to your Cloudflare Dashboard.
2.  Select your Worker.
3.  Navigate to **Settings > Variables**.
4.  Under **Environment Variables**, click **Add variable**.
    -   Set **Variable name** to `COINGECKO_API_KEY`.
    -   Set **Variable value** to your actual CoinGecko API key.
    -   It's recommended to **Encrypt** the API key for security.
5.  Alternatively, you can set it as a **Secret** if you prefer that mechanism, though environment variables are common for API keys.
6.  Save the changes. The worker will automatically pick up this environment variable.

By configuring this API key, the backend worker will use it when making requests to the CoinGecko API, reducing the likelihood of encountering public rate limits.
