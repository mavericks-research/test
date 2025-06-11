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

## Stock Market Data (Alpha Vantage)

This application uses Alpha Vantage for providing stock market data, including company profiles, real-time quotes, and historical price data.

### Alpha Vantage API Key

To ensure reliable access to stock market data and to avoid the limitations of public API access, an Alpha Vantage API key is required.

1.  **Obtain an API Key**: Visit [Alpha Vantage](https://www.alphavantage.co) and click on "GET YOUR FREE API KEY TODAY" to claim your free API key.
2.  **API Call Limits**: Standard free keys from Alpha Vantage often have limitations, such as 25 requests per day and up to 5 requests per minute. For more demanding applications, you might need to consider their premium plans. Please refer to the [Alpha Vantage documentation](https://www.alphavantage.co/documentation/) for the most current information on API call limits and usage policies.

### Setting the API Key

You need to configure the `ALPHA_VANTAGE_API_KEY` environment variable for both local development and your deployed Cloudflare Worker.

#### Local Development (`wrangler dev`)

When running the backend worker locally using `wrangler dev`:

1.  In the `cloudflare-openai-boilerplate/backend/worker-backend/` directory, create or open the `.dev.vars` file.
2.  Add the following line, replacing `YOUR_ALPHA_VANTAGE_KEY_HERE` with your actual API key:
    ```ini
    ALPHA_VANTAGE_API_KEY="YOUR_ALPHA_VANTAGE_KEY_HERE"
    ```
3.  Ensure `.dev.vars` is listed in your `.gitignore` file to prevent committing your API key.

#### Deployed Cloudflare Worker

When your worker is deployed to Cloudflare:

1.  Go to your Cloudflare Dashboard.
2.  Select your Worker.
3.  Navigate to **Settings > Variables**.
4.  Under **Environment Variables**, click **Add variable**.
    -   Set **Variable name** to `ALPHA_VANTAGE_API_KEY`.
    -   Set **Variable value** to your actual Alpha Vantage API key.
    -   It's recommended to **Encrypt** the API key for security.
5.  Save the changes.

### Natural Language Stock Search

The `/api/stocks/natural-search` endpoint utilizes OpenAI to interpret natural language queries and then uses Alpha Vantage's `SYMBOL_SEARCH` functionality to find matching stock symbols. This search is based on keywords (like company names or tickers) and can also consider the sector if specified in the query. It provides a list of potential matches rather than performing a multi-criteria financial screen.

## AdSense Configuration

This application includes a banner ad component designed for Google AdSense, located at `cloudflare-openai-boilerplate/frontend/frontend-app/src/components/AdBanner.jsx`. To enable ads, you need to configure it with your Google AdSense account details.

### Prerequisites

1.  **Google AdSense Account**: You must have an active and approved Google AdSense account.
2.  **Ad Unit Created**: Within your AdSense account, you should create an ad unit for this banner. A responsive display ad unit is generally suitable. Note down your Publisher ID and the Ad Slot ID for this unit.

### Configuration Steps

1.  **Provide AdSense Script in `index.html` (Recommended Method):**
    *   The most common way to include AdSense is by adding their script to the `<head>` of your main HTML file.
    *   Open `cloudflare-openai-boilerplate/frontend/frontend-app/index.html`.
    *   Add the AdSense script tag provided by Google, replacing `ca-pub-YOUR_PUBLISHER_ID` with your actual Publisher ID. It looks like this:
        ```html
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID"
             crossorigin="anonymous"></script>
        ```

2.  **Update `AdBanner.jsx` Component:**
    *   Open the ad banner component file: `cloudflare-openai-boilerplate/frontend/frontend-app/src/components/AdBanner.jsx`.
    *   Locate the placeholder `div` with the class `ad-banner-placeholder`.
    *   Replace this placeholder (or the content within `ad-banner-container` if you prefer more control) with the ad unit code provided by AdSense. It usually looks like an `<ins>` tag:
        ```jsx
        // Inside the return statement of AdBanner.jsx
        <div className="ad-banner-container">
          <ins className="adsbygoogle"
               style={{ display: 'block' }} // Or other styles recommended by AdSense
               data-ad-client="ca-pub-YOUR_PUBLISHER_ID" // Replace with your Publisher ID
               data-ad-slot="YOUR_AD_SLOT_ID"       // Replace with your Ad Slot ID
               data-ad-format="auto"                 // Or specific format like 'horizontal'
               data-full-width-responsive="true"></ins>
        </div>
        ```
    *   Replace `ca-pub-YOUR_PUBLISHER_ID` with your Publisher ID and `YOUR_AD_SLOT_ID` with the specific Ad Slot ID for this banner.

3.  **Initialize Ads (if not using auto-init):**
    *   The `AdBanner.jsx` component contains a `useEffect` hook. If your AdSense implementation requires an explicit push to `window.adsbygoogle` after the component mounts (and after the main AdSense script has loaded), you can uncomment and use the example code provided in that `useEffect`:
        ```javascript
        useEffect(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            console.log('AdSense ad pushed.');
          } catch (e) {
            console.error('AdSense initialization error:', e);
          }
        }, []);
        ```
    *   Often, if the main AdSense script and the `<ins>` tag are correctly placed, ads will load automatically. This step is for cases where manual initialization is needed or preferred.

4.  **Adjust Styling and Padding:**
    *   The ad banner is styled in `cloudflare-openai-boilerplate/frontend/frontend-app/src/components/AdBanner.css`.
    *   The main application layout in `cloudflare-openai-boilerplate/frontend/frontend-app/src/App.jsx` has a `paddingBottom` style applied to its main container div to prevent the ad banner from overlapping content. This padding is currently set to `50px`. If your ad banner renders at a different height, you may need to adjust this `paddingBottom` value in `App.jsx` to match the actual height of the loaded ad.

After following these steps and deploying your updated application, the AdSense banner should appear at the bottom of your site. Monitor your AdSense dashboard for performance and any policy notifications.
