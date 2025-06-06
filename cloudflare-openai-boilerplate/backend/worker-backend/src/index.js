import { normalizeTokenNames, convertToUSD, normalizeTimestamps } from './normalizer.js';
import { getCurrentPrices, getHistoricalData, getCoinList } from './cryptoApi.js'; // Added getCoinList for potential future use or testing

// Define CORS headers - Added GET
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For local dev, '*' is fine. For prod, restrict this to your frontend domain.
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Added GET
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handler for OPTIONS requests (remains the same, but uses updated corsHeaders)
function handleOptions(request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    return new Response(null, { headers: corsHeaders });
  } else {
    return new Response(null, { headers: { Allow: 'GET, POST, OPTIONS' } }); // Added GET
  }
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);

    try {
      // Routing based on path
      if (url.pathname === '/api/crypto/current' && request.method === 'GET') {
        const coinIdsParam = url.searchParams.get('coins'); // e.g., "bitcoin,ethereum"
        const vsCurrenciesParam = url.searchParams.get('currencies'); // e.g., "usd,eur"

        if (!coinIdsParam || !vsCurrenciesParam) {
          return new Response('Missing "coins" or "currencies" query parameters', { status: 400, headers: corsHeaders });
        }
        const coinIds = coinIdsParam.split(',');
        const vsCurrencies = vsCurrenciesParam.split(',');

        const data = await getCurrentPrices(coinIds, vsCurrencies);
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (url.pathname === '/api/crypto/historical' && request.method === 'GET') {
        const coinId = url.searchParams.get('coin'); // e.g., "bitcoin"
        const date = url.searchParams.get('date'); // e.g., "30-12-2023"
        // vsCurrency is part of the response structure from CoinGecko, not a direct query param for this specific history endpoint in cryptoApi.js

        if (!coinId || !date) {
          return new Response('Missing "coin" or "date" query parameters', { status: 400, headers: corsHeaders });
        }

        const data = await getHistoricalData(coinId, date);
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (url.pathname === '/api/crypto/coinslist' && request.method === 'GET') {
        // Optional: Expose getCoinList for testing/utility
        const data = await getCoinList();
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (request.method === 'POST') { // Existing Etherscan/OpenAI functionality
        // Ensure the request has a JSON body for POST requests
        let requestBody;
        try {
          requestBody = await request.json();
        } catch (error) {
          return new Response('Invalid JSON body for POST request', { status: 400, headers: corsHeaders });
        }

        const { walletAddress } = requestBody;

        if (!walletAddress) {
          return new Response('Missing "walletAddress" in request body for POST request', { status: 400, headers: corsHeaders });
        }

        if (!env.OPENAI_API_KEY) {
          console.error('OPENAI_API_KEY not configured');
          return new Response('OPENAI_API_KEY not configured.', { status: 500, headers: corsHeaders });
        }

        if (!env.ETHERSCAN_API_KEY) {
          console.error('ETHERSCAN_API_KEY not configured');
          return new Response('ETHERSCAN_API_KEY not configured.', { status: 500, headers: corsHeaders });
        }

        const etherscanApiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${env.ETHERSCAN_API_KEY}`;
        const etherscanResponse = await fetch(etherscanApiUrl);

        if (!etherscanResponse.ok) {
          const errorText = await etherscanResponse.text();
          console.error('Etherscan API Error:', errorText);
          return new Response(`Etherscan API request failed: ${etherscanResponse.status} ${errorText}`, { status: etherscanResponse.status, headers: corsHeaders });
        }

        let etherscanData = await etherscanResponse.json();

        if (etherscanData.status === "1" && Array.isArray(etherscanData.result)) {
          let transactions = etherscanData.result;
          transactions = normalizeTokenNames(transactions);
          transactions = convertToUSD(transactions); // Note: This function might need adjustment if prices are from CoinGecko
          transactions = normalizeTimestamps(transactions);

          let openAIPrompt = '';
          // ... (rest of existing OpenAI prompt construction logic)
          if (transactions.length > 0) {
            const numTransactions = transactions.length;
            const totalValueUSDPlaceholder = transactions.reduce((sum, tx) => sum + BigInt(tx.valueUSD), BigInt(0)).toString(); // valueUSD is placeholder
            const uniqueTokens = [...new Set(transactions.map(tx => tx.tokenInvolved).filter(t => t))];
            const firstTxDate = transactions[0]?.dateTime;
            const lastTxDate = transactions[transactions.length - 1]?.dateTime;

            openAIPrompt = `Wallet Address: ${walletAddress}
Transaction Summary:
`;
            openAIPrompt += `- Total Transactions: ${numTransactions}
`;
            openAIPrompt += `- Total Value Transacted (in Wei, placeholder for USD): ${totalValueUSDPlaceholder}
`;
            if (uniqueTokens.length > 0) {
              openAIPrompt += `- Tokens Involved: ${uniqueTokens.join(', ')}
`;
            } else {
              openAIPrompt += `- No specific tokens (ETH transactions or non-token contract interactions) were identified.
`;
            }
            if (firstTxDate && lastTxDate) {
              openAIPrompt += `- Transaction Period: ${firstTxDate} to ${lastTxDate}
`;
            }
            openAIPrompt += `
Please provide a concise, human-readable summary of this wallet's activity. Focus on patterns, types of transactions, and potential insights.`;
          } else {
            openAIPrompt = `Wallet Address: ${walletAddress}
No transactions were found for this wallet. Please provide a general statement about what it means for a wallet to have no transaction history.`;
          }


          const openaiResponse = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
            body: JSON.stringify({ model: 'gpt-3.5-turbo-instruct', prompt: openAIPrompt, max_tokens: 250 }),
          });

          if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error('OpenAI API Error:', errorText);
            return new Response(`OpenAI API request failed: ${openaiResponse.status} ${errorText}`, { status: openaiResponse.status, headers: corsHeaders });
          }

          const openaiData = await openaiResponse.json();
          const aiSummary = openaiData.choices && openaiData.choices[0] ? openaiData.choices[0].text.trim() : 'No summary received from AI.';
          return new Response(JSON.stringify({ message: "AI summary generated successfully", summary: aiSummary, transactionData: transactions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        } else if (etherscanData.status === "0") {
          const openAIPrompt = `Wallet Address: ${walletAddress}
No transactions were found for this wallet according to Etherscan (${etherscanData.message || etherscanData.result}). Please provide a brief, general statement about what it means for a new or unused Ethereum wallet to have no transaction history.`;
          const openaiResponse = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
            body: JSON.stringify({ model: 'gpt-3.5-turbo-instruct', prompt: openAIPrompt, max_tokens: 150 }),
          });

          if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            return new Response(`OpenAI API request failed: ${openaiResponse.status} ${errorText}`, { status: openaiResponse.status, headers: corsHeaders });
          }
          const openaiData = await openaiResponse.json();
          const aiSummary = openaiData.choices && openaiData.choices[0] ? openaiData.choices[0].text.trim() : 'No summary received from AI.';
          return new Response(JSON.stringify({ message: etherscanData.message || "No transactions found", summary: aiSummary, transactionData: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json'} });
        } else {
          return new Response('Unexpected response from Etherscan API', { status: 500, headers: corsHeaders });
        }
        // End of existing POST logic
      } else {
        // Fallback for unhandled paths or methods
        return new Response('Not Found. Supported endpoints: GET /api/crypto/current, GET /api/crypto/historical, POST /', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Error processing request in worker:', error);
      // Ensure error.message is a string.
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new Response(`Error processing your request: ${errorMessage}`, { status: 500, headers: corsHeaders });
    }
  },
};
