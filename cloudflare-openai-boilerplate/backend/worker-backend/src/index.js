import { normalizeTokenNames, normalizeTimestamps, normalizeBlockCypherTransactions, convertToUSD } from './normalizer.js';
// Added fetchTrendingCoins and fetchGlobalMarketData to the import below
import { getCurrentPrices, getHistoricalData, getCoinList, getTransactionHistory, getCoinsByBlockchain, getMarketChartData, fetchTrendingCoins, fetchGlobalMarketData } from './cryptoApi.js'; // Added getMarketChartData

// Define CORS headers - Added GET
const corsHeaders = {
  // IMPORTANT FOR PRODUCTION: Replace 'YOUR_FRONTEND_DOMAIN_HERE' with your actual frontend application's domain.
  // For local development, '*' can be used, but it's insecure for production.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', // Added GET
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handler for OPTIONS requests (remains the same, but uses updated corsHeaders)
function handleOptions(request) {
  // Always respond to OPTIONS requests with the full CORS headers.
  // This handles preflight requests for all methods (GET, POST, PUT, DELETE, etc.)
  // and ensures 'Access-Control-Allow-Origin' is always present.
  return new Response(null, { headers: corsHeaders });
}

// --- Budget Plan CRUD Helper Functions ---

/**
 * Creates a new budget plan.
 * @param {object} planData - The data for the new plan.
 * @param {object} env - The Cloudflare environment object.
 * @returns {object} The created budget plan.
 */
async function createBudgetPlan(planData, env) {
  if (!env.BUDGET_PLANS_KV) {
    throw new Error("BUDGET_PLANS_KV namespace not bound.");
  }
  const id = crypto.randomUUID();
  const categories = planData.categories.map(category => ({
    ...category,
    id: crypto.randomUUID(),
    spentAmount: 0,
  }));
  const newPlan = { ...planData, id, categories };
  await env.BUDGET_PLANS_KV.put(`plan_${id}`, JSON.stringify(newPlan));
  return newPlan;
}

/**
 * Retrieves a budget plan by its ID.
 * @param {string} id - The ID of the budget plan.
 * @param {object} env - The Cloudflare environment object.
 * @returns {object|null} The budget plan or null if not found.
 */
async function getBudgetPlan(id, env) {
  if (!env.BUDGET_PLANS_KV) {
    throw new Error("BUDGET_PLANS_KV namespace not bound.");
  }
  const plan = await env.BUDGET_PLANS_KV.get(`plan_${id}`);
  return plan ? JSON.parse(plan) : null;
}

/**
 * Retrieves all budget plans.
 * @param {object} env - The Cloudflare environment object.
 * @returns {Array<object>} An array of budget plans.
 * @todo Implement pagination or a more efficient listing mechanism for large datasets.
 */
async function getAllBudgetPlans(env) {
  if (!env.BUDGET_PLANS_KV) {
    throw new Error("BUDGET_PLANS_KV namespace not bound.");
  }
  const listResult = await env.BUDGET_PLANS_KV.list({ prefix: "plan_" });
  const plans = [];
  for (const key of listResult.keys) {
    const planData = await env.BUDGET_PLANS_KV.get(key.name);
    if (planData) {
      plans.push(JSON.parse(planData));
    }
  }
  return plans;
}

/**
 * Updates an existing budget plan.
 * @param {string} id - The ID of the budget plan to update.
 * @param {object} updatedData - The data to update the plan with.
 * @param {object} env - The Cloudflare environment object.
 * @returns {object|null} The updated budget plan or null if not found.
 */
async function updateBudgetPlan(id, updatedData, env) {
  if (!env.BUDGET_PLANS_KV) {
    throw new Error("BUDGET_PLANS_KV namespace not bound.");
  }
  const existingPlan = await getBudgetPlan(id, env);
  if (!existingPlan) {
    return null;
  }

  // Merge updatedData into existingPlan
  // Preserve existing category IDs and add new IDs for new categories
  const updatedCategories = updatedData.categories ? updatedData.categories.map(updatedCategory => {
    const existingCategory = existingPlan.categories.find(c => c.id === updatedCategory.id);
    if (existingCategory) {
      return { ...existingCategory, ...updatedCategory };
    }
    return { ...updatedCategory, id: crypto.randomUUID(), spentAmount: updatedCategory.spentAmount || 0 };
  }) : existingPlan.categories;

  const planToUpdate = {
    ...existingPlan,
    ...updatedData,
    categories: updatedCategories,
    id: existingPlan.id, // Ensure ID is not overwritten by updatedData
  };

  await env.BUDGET_PLANS_KV.put(`plan_${id}`, JSON.stringify(planToUpdate));
  return planToUpdate;
}

/**
 * Deletes a budget plan by its ID.
 * @param {string} id - The ID of the budget plan to delete.
 * @param {object} env - The Cloudflare environment object.
 * @returns {boolean} True if successful, false otherwise.
 */
async function deleteBudgetPlan(id, env) {
  if (!env.BUDGET_PLANS_KV) {
    throw new Error("BUDGET_PLANS_KV namespace not bound.");
  }
  const existingPlan = await getBudgetPlan(id, env);
  if (!existingPlan) {
    return false;
  }
  await env.BUDGET_PLANS_KV.delete(`plan_${id}`);
  return true;
}


export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const COINGECKO_API_KEY = env.COINGECKO_API_KEY || null;
    const OPENAI_MODEL = env.OPENAI_MODEL || 'gpt-3.5-turbo-instruct';

    // Ensure BUDGET_PLANS_KV is available if budget routes are accessed
    // We can check specifically for budget routes to make this check conditional
    if (url.pathname.startsWith('/api/budgets') && !env.BUDGET_PLANS_KV) {
      console.error('BUDGET_PLANS_KV namespace not bound or not configured in wrangler.toml.');
      return new Response(JSON.stringify({ error: 'Budget service is not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      // Routing based on path

      // --- Budget API Routes ---
      if (url.pathname === '/api/budgets' && request.method === 'POST') {
        try {
          const planData = await request.json();
          // Validation for POST
          if (!planData.name || typeof planData.name !== 'string' ||
              !planData.monthYear || typeof planData.monthYear !== 'string' ||
              !Array.isArray(planData.categories) || planData.categories.length === 0) {
            return new Response(JSON.stringify({ error: 'Missing or invalid required fields: name (string), monthYear (string), categories (non-empty array).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          for (const category of planData.categories) {
            if (!category.name || typeof category.name !== 'string' ||
                category.budgetedAmount === undefined || typeof category.budgetedAmount !== 'number' || category.budgetedAmount < 0) {
              return new Response(JSON.stringify({ error: 'Invalid category: Each category must have name (string) and budgetedAmount (non-negative number).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }

          const newPlan = await createBudgetPlan(planData, env);
          return new Response(JSON.stringify(newPlan), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (e) {
          // Catch JSON parsing errors or other unexpected issues
          if (e instanceof SyntaxError) {
            return new Response(JSON.stringify({ error: 'Invalid JSON in request body.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          console.error('Error creating budget plan:', e);
          return new Response(JSON.stringify({ error: e.message || 'Error creating budget plan.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else if (url.pathname === '/api/budgets' && request.method === 'GET') {
        try {
          const plans = await getAllBudgetPlans(env);
          return new Response(JSON.stringify(plans), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        } catch (e) {
          console.error('Error getting all budget plans:', e);
          return new Response(JSON.stringify({ error: e.message || 'Error retrieving budget plans.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else if (url.pathname.startsWith('/api/budgets/') && request.method === 'GET') {
        const id = url.pathname.split('/')[3];
        if (!id) {
          return new Response(JSON.stringify({ error: 'Budget plan ID missing in path.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        try {
          const plan = await getBudgetPlan(id, env);
          if (plan) {
            return new Response(JSON.stringify(plan), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          } else {
            return new Response(JSON.stringify({ error: 'Budget plan not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (e) {
          console.error(`Error getting budget plan ${id}:`, e);
          return new Response(JSON.stringify({ error: e.message || `Error retrieving budget plan ${id}.` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else if (url.pathname.startsWith('/api/budgets/') && request.method === 'PUT') {
        const id = url.pathname.split('/')[3];
        if (!id) {
          return new Response(JSON.stringify({ error: 'Budget plan ID missing in path.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        try {
          const updatedData = await request.json();

          // Validation for PUT (partial updates are allowed, but validate what's provided)
          if (updatedData.name !== undefined && typeof updatedData.name !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid name: must be a string.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          if (updatedData.monthYear !== undefined && typeof updatedData.monthYear !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid monthYear: must be a string.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          if (updatedData.categories !== undefined) {
            if (!Array.isArray(updatedData.categories)) {
              return new Response(JSON.stringify({ error: 'Invalid categories: must be an array.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            for (const category of updatedData.categories) {
              if (!category.name || typeof category.name !== 'string' ||
                  category.budgetedAmount === undefined || typeof category.budgetedAmount !== 'number' || category.budgetedAmount < 0) {
                 // Allow categories to be updated without an ID, ID will be preserved or created by updateBudgetPlan
                return new Response(JSON.stringify({ error: 'Invalid category in update: Each category must have name (string) and budgetedAmount (non-negative number).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
              }
            }
          }

          const updatedPlan = await updateBudgetPlan(id, updatedData, env);
          if (updatedPlan) {
            return new Response(JSON.stringify(updatedPlan), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          } else {
            return new Response(JSON.stringify({ error: 'Budget plan not found for update.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            return new Response(JSON.stringify({ error: 'Invalid JSON in request body.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          console.error(`Error updating budget plan ${id}:`, e);
          return new Response(JSON.stringify({ error: e.message || `Error updating budget plan ${id}.` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else if (url.pathname.startsWith('/api/budgets/') && request.method === 'DELETE') {
        const id = url.pathname.split('/')[3];
        if (!id) {
          return new Response(JSON.stringify({ error: 'Budget plan ID missing in path.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        try {
          const success = await deleteBudgetPlan(id, env);
          if (success) {
            return new Response(JSON.stringify({ message: 'Budget plan deleted successfully.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          } else {
            return new Response(JSON.stringify({ error: 'Budget plan not found or could not be deleted.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (e) {
          console.error(`Error deleting budget plan ${id}:`, e);
          return new Response(JSON.stringify({ error: e.message || `Error deleting budget plan ${id}.` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      // --- End of Budget API Routes ---

      // Existing Crypto API routes
      else if (url.pathname === '/api/crypto/current' && request.method === 'GET') {
        const coinIdsParam = url.searchParams.get('coins'); // e.g., "bitcoin,ethereum"
        const vsCurrenciesParam = url.searchParams.get('currencies'); // e.g., "usd,eur"

        if (!coinIdsParam || !vsCurrenciesParam) {
          return new Response('Missing "coins" or "currencies" query parameters', { status: 400, headers: corsHeaders });
        }
        const coinIds = coinIdsParam.split(',');
        const vsCurrencies = vsCurrenciesParam.split(',');

        const data = await getCurrentPrices(coinIds, vsCurrencies, COINGECKO_API_KEY);
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (url.pathname === '/api/crypto/historical' && request.method === 'GET') {
        const coinId = url.searchParams.get('coin'); // e.g., "bitcoin"
        const date = url.searchParams.get('date'); // e.g., "30-12-2023"
        // vsCurrency is part of the response structure from CoinGecko, not a direct query param for this specific history endpoint in cryptoApi.js

        if (!coinId || !date) {
          return new Response('Missing "coin" or "date" query parameters', { status: 400, headers: corsHeaders });
        }

        const data = await getHistoricalData(coinId, date, COINGECKO_API_KEY);
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (url.pathname === '/api/crypto/coinslist' && request.method === 'GET') {
        // Optional: Expose getCoinList for testing/utility
        const data = await getCoinList(COINGECKO_API_KEY);
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (url.pathname === '/api/crypto/enriched-historical-data' && request.method === 'GET') {
        const coinId = url.searchParams.get('coinId');
        const date = url.searchParams.get('date');

        if (!coinId || !date) {
          return new Response(JSON.stringify({ error: 'Missing "coinId" or "date" query parameters.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          // 1. Call getHistoricalData
          const historicalData = await getHistoricalData(coinId, date, COINGECKO_API_KEY);

          // Basic check to see if data is what we expect
          if (!historicalData || !historicalData.market_data) {
            // Log the unexpected structure for debugging
            console.error('Unexpected historicalData structure:', historicalData);
            return new Response(JSON.stringify({ error: 'Failed to retrieve or parse valid market data from CoinGecko.' }), {
              status: 502, // Bad Gateway, as it's an upstream issue
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // 2. Extract relevant market data (price, market cap, volume in USD)
          const price = historicalData.market_data.current_price && historicalData.market_data.current_price.usd;
          const marketCap = historicalData.market_data.market_cap && historicalData.market_data.market_cap.usd;
          const volume = historicalData.market_data.total_volume && historicalData.market_data.total_volume.usd;

          if (price === undefined || marketCap === undefined || volume === undefined) {
            console.error('Missing USD market data fields in historicalData:', historicalData.market_data);
            return new Response(JSON.stringify({ error: 'Required USD market data (price, market_cap, total_volume) not found in CoinGecko response.' }), {
              status: 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // 3. Check for OPENAI_API_KEY
          const OPENAI_API_KEY = env.OPENAI_API_KEY;
          if (!OPENAI_API_KEY) {
            console.error('OPENAI_API_KEY not configured');
            return new Response(JSON.stringify({ error: 'OpenAI API key is not configured.' }), {
              status: 500, // Internal Server Error
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // 4. Construct OpenAI Prompt
          const openAIPrompt = `
For the cryptocurrency ${coinId} on ${date}:
Market Price (USD): ${price}
Market Cap (USD): ${marketCap}
Total Volume (USD): ${volume}

Provide a brief summary of any significant news, events, or general sentiment regarding ${coinId} around ${date}.
Briefly comment on how this news/sentiment might relate to the provided market data.
Keep the entire response concise.
          `;

          // 5. Make POST request to OpenAI
          const openaiResponse = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: OPENAI_MODEL, // Already defined in outer scope
              prompt: openAIPrompt,
              max_tokens: 250, // Adjusted for a potentially more detailed summary
            }),
          });

          if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error('OpenAI API Error:', errorText);
            return new Response(JSON.stringify({ error: `OpenAI API request failed: ${openaiResponse.status} ${errorText}` }), {
              status: openaiResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const openaiData = await openaiResponse.json();
          const aiSummary = openaiData.choices && openaiData.choices[0] ? openaiData.choices[0].text.trim() : 'No summary received from AI.';

          // 6. Combine and return
          return new Response(JSON.stringify({
            coinGeckoData: historicalData, // Send the whole original object back
            openAiInsights: aiSummary,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error(`Error processing /api/crypto/enriched-historical-data for ${coinId} on ${date}:`, error);
          // Check if the error is from getHistoricalData itself (e.g., CoinGecko API down or invalid coin/date)
          // The getHistoricalData function in cryptoApi.js already throws an error that includes "CoinGecko API request failed"
          if (error.message && error.message.includes("CoinGecko API request failed")) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 502, // Bad Gateway, as it's an upstream API issue
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          // Generic error for other issues
          return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

      } else if (request.method === 'POST' && url.pathname === '/') { // Existing Etherscan/OpenAI functionality - ensure it's for the root path
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

        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!ethAddressRegex.test(walletAddress)) {
          return new Response('Invalid Ethereum wallet address format.', { status: 400, headers: corsHeaders });
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
Please provide a concise, human-readable summary of this wallet's activity.
In your summary, please also try to:
- Identify any frequently interacting addresses (common counterparties).
- Categorize the types of DApps or smart contracts primarily used (e.g., DeFi, NFT, DEX).
- Highlight any transactions that are notably large or small compared to the wallet's typical activity.
- Point out any patterns that might warrant a closer look for security reasons.
Focus on patterns, types of transactions, and potential insights.`;
          } else {
            openAIPrompt = `Wallet Address: ${walletAddress}
No transactions were found for this wallet.
Please provide a concise, human-readable summary of this wallet's activity.
In your summary, please also try to:
- Identify any frequently interacting addresses (common counterparties).
- Categorize the types of DApps or smart contracts primarily used (e.g., DeFi, NFT, DEX).
- Highlight any transactions that are notably large or small compared to the wallet's typical activity.
- Point out any patterns that might warrant a closer look for security reasons.
Focus on patterns, types of transactions, and potential insights.
Please also provide a general statement about what it means for a wallet to have no transaction history.`;
          }

          let openaiUrl = 'https://api.openai.com/v1/completions';
          let openaiPayload;

          const chatModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
          if (OPENAI_MODEL && chatModels.includes(OPENAI_MODEL)) {
            openaiUrl = 'https://api.openai.com/v1/chat/completions';
            openaiPayload = {
              model: OPENAI_MODEL,
              messages: [{ "role": "user", "content": openAIPrompt }],
              max_tokens: 250,
            };
          } else {
            openaiPayload = {
              model: OPENAI_MODEL,
              prompt: openAIPrompt,
              max_tokens: 250,
            };
          }

          const openaiResponse = await fetch(openaiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
            body: JSON.stringify(openaiPayload),
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
No transactions were found for this wallet according to Etherscan (${etherscanData.message || etherscanData.result}).
Please provide a concise, human-readable summary of this wallet's activity.
In your summary, please also try to:
- Identify any frequently interacting addresses (common counterparties).
- Categorize the types of DApps or smart contracts primarily used (e.g., DeFi, NFT, DEX).
- Highlight any transactions that are notably large or small compared to the wallet's typical activity.
- Point out any patterns that might warrant a closer look for security reasons.
Focus on patterns, types of transactions, and potential insights.
Please also provide a brief, general statement about what it means for a new or unused Ethereum wallet to have no transaction history.`;

          let openaiUrl = 'https://api.openai.com/v1/completions';
          let openaiPayload;

          const chatModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
          if (OPENAI_MODEL && chatModels.includes(OPENAI_MODEL)) {
            openaiUrl = 'https://api.openai.com/v1/chat/completions';
            openaiPayload = {
              model: OPENAI_MODEL,
              messages: [{ "role": "user", "content": openAIPrompt }],
              max_tokens: 150,
            };
          } else {
            openaiPayload = {
              model: OPENAI_MODEL,
              prompt: openAIPrompt,
              max_tokens: 150,
            };
          }

          const openaiResponse = await fetch(openaiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
            body: JSON.stringify(openaiPayload),
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
      // --- Transaction Analysis Route (New) ---
      } else if (url.pathname === '/api/crypto/transaction-analysis' && request.method === 'GET') {
        const coinSymbol = url.searchParams.get('coinSymbol');
        const walletAddress = url.searchParams.get('walletAddress');
        const blockcypherToken = env.BLOCKCYPHER_API_TOKEN || null;
        const openaiApiKey = env.OPENAI_API_KEY;
        // Use a chat model, default to gpt-3.5-turbo if OPENAI_MODEL is not set or is an older model
        const openaiModel = (env.OPENAI_MODEL && env.OPENAI_MODEL.startsWith('gpt-')) ? env.OPENAI_MODEL : 'gpt-3.5-turbo';


        if (!coinSymbol || !['btc', 'eth', 'ltc'].includes(coinSymbol.toLowerCase())) {
          return new Response(JSON.stringify({ error: 'Missing or invalid "coinSymbol" query parameter. Supported: btc, eth, ltc.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!walletAddress) {
          return new Response(JSON.stringify({ error: 'Missing "walletAddress" query parameter.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!openaiApiKey) {
            console.error('OPENAI_API_KEY not configured');
            return new Response(JSON.stringify({ error: 'OpenAI API key is not configured for the server.' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        try {
          const rawTransactions = await getTransactionHistory(coinSymbol, walletAddress, blockcypherToken);
          if (!rawTransactions || rawTransactions.length === 0) {
            return new Response(JSON.stringify({ analysis: "No transactions found for this address.", transactions: [] }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const normalizedTransactions = normalizeBlockCypherTransactions(rawTransactions, coinSymbol, walletAddress);

          // Construct OpenAI Prompt
          // For very long transaction lists, summarize or select a sample.
          let transactionSummaryForPrompt = JSON.stringify(normalizedTransactions.slice(0, 10), null, 2); // First 10 transactions
          if (normalizedTransactions.length > 10) {
            transactionSummaryForPrompt += `\n... and ${normalizedTransactions.length - 10} more transactions.`;
          }
          if (normalizedTransactions.length === 0) {
            transactionSummaryForPrompt = "No transactions found.";
          }


          const openAIPrompt = `
Analyze the following cryptocurrency transactions for address ${walletAddress} on the ${coinSymbol.toUpperCase()} network.
Focus on:
- Overall summary: Is it an active address? Predominantly sending or receiving?
- Total value: Approximate total value sent and received in ${coinSymbol.toUpperCase()} (if discernible from the data).
- Transaction volume: General observations on activity frequency. If timestamps allow, mention if activity is recent or spread out.
- Common counterparties: Any addresses that appear frequently as senders or receivers? (Be mindful of not overstating for change addresses).
- Notable patterns: Any large transactions, regular small transactions, or other observable patterns?

Transaction Data:
${transactionSummaryForPrompt}

Provide a concise, human-readable analysis.
          `;

          const openaiPayload = {
            model: openaiModel,
            messages: [{ role: "user", content: openAIPrompt }],
            max_tokens: 500, // Increased for a more detailed analysis
          };

          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify(openaiPayload),
          });

          if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error('OpenAI API Error:', errorText);
            return new Response(JSON.stringify({ error: `OpenAI API request failed: ${openaiResponse.status} ${errorText}` }), {
              status: openaiResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const openaiData = await openaiResponse.json();
          const aiAnalysis = openaiData.choices && openaiData.choices[0] && openaiData.choices[0].message
                             ? openaiData.choices[0].message.content.trim()
                             : 'No analysis received from AI.';

          return new Response(JSON.stringify({
            analysis: aiAnalysis,
            normalizedTransactions: normalizedTransactions, // Optionally return normalized data
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error(`Error in /api/crypto/transaction-analysis for ${coinSymbol} address ${walletAddress}:`, error);
          const errorMessage = error.message || 'An unexpected error occurred during transaction analysis.';
          let errorStatus = 500;
          if (error.message.includes("BlockCypher API request failed")) {
            errorStatus = 502; // Bad Gateway for upstream API errors
          }
          return new Response(JSON.stringify({ error: errorMessage }), {
            status: errorStatus,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } // <<< --- ADDED CLOSING BRACE HERE
      // --- End of Transaction Analysis Route ---

      // --- New Route for Coins by Blockchain ---
      else if (url.pathname === '/api/crypto/coins-by-blockchain' && request.method === 'GET') {
        const platform = url.searchParams.get('platform'); // e.g., 'ethereum', 'bsc', 'solana'
        const currency = url.searchParams.get('currency'); // e.g., 'usd'

        if (!platform || !currency) {
          return new Response(JSON.stringify({ error: 'Missing "platform" or "currency" query parameters.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Map platform parameter to CoinGecko asset_platform_id
        // Supported platforms: ethereum, binance-smart-chain, solana
        let assetPlatformId;
        switch (platform.toLowerCase()) {
          case 'ethereum':
            assetPlatformId = 'ethereum';
            break;
          case 'bsc':
          case 'binance-smart-chain':
            assetPlatformId = 'binance-smart-chain';
            break;
          case 'solana':
            assetPlatformId = 'solana';
            break;
          default:
            return new Response(JSON.stringify({ error: 'Invalid "platform". Supported platforms: ethereum, bsc, solana.' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        try {
          const data = await getCoinsByBlockchain(assetPlatformId, currency, COINGECKO_API_KEY);
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error(`Error fetching coins for platform ${platform}:`, error);
          // Check if the error is from getCoinsByBlockchain itself (e.g., CoinGecko API down)
          if (error.message && error.message.includes("CoinGecko API request failed")) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 502, // Bad Gateway for upstream API issues
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      // --- End of New Route ---

      // --- New Route for Crypto Market Chart ---
      else if (url.pathname.startsWith('/api/crypto/market-chart/') && request.method === 'GET') {
        const parts = url.pathname.split('/');
        const coinId = parts[4]; // Assuming path like /api/crypto/market-chart/bitcoin
        const days = url.searchParams.get('days') || '30'; // Default to 30 days if not specified

        if (!coinId) {
          return new Response(JSON.stringify({ error: 'Coin ID missing in path. Expected /api/crypto/market-chart/:coinId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const COINGECKO_API_KEY = env.COINGECKO_API_KEY || null;

        try {
          // IMPORTANT: We are assuming getMarketChartData will be created in cryptoApi.js in a subsequent step.
          const rawChartData = await getMarketChartData(coinId, days, COINGECKO_API_KEY);

          // CoinGecko's market_chart endpoint returns { prices: [[timestamp, price], ...], market_caps: ..., total_volumes: ... }
          if (rawChartData && Array.isArray(rawChartData.prices)) {
            const formattedPrices = rawChartData.prices.map(p => ({
              date: new Date(p[0]).toISOString().split('T')[0], // Convert timestamp to YYYY-MM-DD
              price: p[1],
            }));
            return new Response(JSON.stringify(formattedPrices), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            console.error(`No price data or unexpected format from getMarketChartData for ${coinId}, days ${days}:`, rawChartData);
            return new Response(JSON.stringify({ error: 'No chart data found or unexpected format from upstream API.' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (error) {
          console.error(`Error fetching market chart for ${coinId}, days ${days}:`, error);
          let errorStatus = 500;
          if (error.message && error.message.includes("CoinGecko API request failed")) {
            errorStatus = 502;
          }
          return new Response(JSON.stringify({ error: error.message || 'Error retrieving market chart data.' }), {
            status: errorStatus,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      // --- End of New Crypto Market Chart Route ---

      // --- New Route for Trending Coins ---
      else if (url.pathname === '/api/crypto/trending' && request.method === 'GET') {
        try {
          const data = await fetchTrendingCoins(COINGECKO_API_KEY);
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Error fetching trending coins:', error);
          // Check if the error is from fetchTrendingCoins itself
          if (error.message && error.message.includes("CoinGecko API request failed")) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 502, // Bad Gateway for upstream API issues
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      // --- End of New Route for Trending Coins ---

      // --- New Route for Global Market Data ---
      else if (url.pathname === '/api/crypto/global' && request.method === 'GET') {
        try {
          const data = await fetchGlobalMarketData(COINGECKO_API_KEY);
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Error fetching global market data:', error);
          if (error.message && error.message.includes("CoinGecko API request failed")) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 502, // Bad Gateway
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      // --- End of New Route for Global Market Data ---

      // --- New Route for Natural Language Stock Search ---
      else if (url.pathname === '/api/stocks/natural-search' && request.method === 'GET') {
        const naturalQuery = url.searchParams.get('q');
        const openaiApiKey = env.OPENAI_API_KEY;
        // Default to a model known for function calling, allow override via env
        const openaiModelForSearch = env.OPENAI_MODEL_SEARCH || 'gpt-3.5-turbo';
        const fmpApiKey = env.FMP_API_KEY;

        if (!openaiApiKey) {
          console.error('OPENAI_API_KEY not configured');
          return new Response(JSON.stringify({ error: 'OpenAI API key is not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!fmpApiKey) {
          console.error('FMP_API_KEY not configured');
          return new Response(JSON.stringify({ error: 'FMP API key is not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!naturalQuery) {
          return new Response(JSON.stringify({ error: 'Missing "q" query parameter for natural language search.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const financialQueryFunction = {
          name: "extract_financial_criteria",
          description: "Extracts financial criteria from a user's natural language query for stock searching.",
          parameters: {
            type: "object",
            properties: {
              sector: {
                type: "string",
                description: "The stock sector, e.g., Technology, Healthcare, Energy.",
              },
              pe_ratio_min: {
                type: "number",
                description: "The minimum desired P/E ratio.",
              },
              pe_ratio_max: {
                type: "number",
                description: "The maximum desired P/E ratio.",
              },
              market_cap_min: {
                type: "number",
                description: "The minimum desired market capitalization in USD, e.g., 1000000000 for $1 billion.",
              },
              market_cap_max: {
                type: "number",
                description: "The maximum desired market capitalization in USD, e.g., 50000000000 for $50 billion.",
              },
              dividend_yield_min: {
                  type: "number",
                  description: "The minimum desired dividend yield in percentage, e.g., 3 for 3%.",
              },
              dividend_yield_max: {
                  type: "number",
                  description: "The maximum desired dividend yield in percentage, e.g., 10 for 10%."
              },
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "Any specific keywords or company names mentioned, e.g., AI, renewable energy.",
              },
            },
            required: [], // Make parameters optional initially, OpenAI will only fill what it finds.
          },
        };

        try {
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: openaiModelForSearch,
              messages: [
                { role: "system", content: "You are a financial query parser. Extract stock screening criteria from the user's query using the provided function." },
                { role: "user", content: naturalQuery }
              ],
              functions: [financialQueryFunction],
              function_call: { name: "extract_financial_criteria" }, // Force the function call
            }),
          });

          if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error('OpenAI API Error for natural search:', errorText);
            return new Response(JSON.stringify({ error: `OpenAI API request failed: ${openaiResponse.status} ${errorText}` }), {
              status: openaiResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const openaiData = await openaiResponse.json();
          let searchCriteria = {};
          if (openaiData.choices && openaiData.choices[0].message.function_call && openaiData.choices[0].message.function_call.arguments) {
            searchCriteria = JSON.parse(openaiData.choices[0].message.function_call.arguments);
          } else {
            // Fallback or error if function call didn't happen as expected
            console.warn('OpenAI did not return a function call or arguments. Response:', openaiData);
            // For now, proceed with empty criteria, which might result in a broad FMP search or no search.
            // A more robust solution might try a non-function prompt or return an error.
             return new Response(JSON.stringify({ error: 'Could not parse financial criteria using OpenAI.', openAIResponse: openaiData }), {
                status: 500, // Or a more specific error like 502 Bad Gateway if OpenAI is the issue
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Construct FMP API query
          // Base URL for FMP stock screener
          let fmpScreenerUrl = `https://financialmodelingprep.com/api/v3/stock-screener?apikey=${fmpApiKey}`;

          // Map extracted criteria to FMP parameters (simplified)
          if (searchCriteria.sector) {
            fmpScreenerUrl += `&sector=${encodeURIComponent(searchCriteria.sector)}`;
          }
          if (searchCriteria.pe_ratio_min) {
            fmpScreenerUrl += `&priceEarningsRatioTTMMoreThan=${searchCriteria.pe_ratio_min}`;
          }
          if (searchCriteria.pe_ratio_max) {
            fmpScreenerUrl += `&priceEarningsRatioTTMLessThan=${searchCriteria.pe_ratio_max}`;
          }
          if (searchCriteria.market_cap_min) {
            fmpScreenerUrl += `&marketCapMoreThan=${searchCriteria.market_cap_min}`;
          }
          if (searchCriteria.market_cap_max) {
            fmpScreenerUrl += `&marketCapLowerThan=${searchCriteria.market_cap_max}`;
          }
          if (searchCriteria.dividend_yield_min) {
              // FMP uses 'dividendYieldMoreThan' but expects the raw decimal (e.g., 0.03 for 3%)
              // OpenAI function call asks for percentage (e.g., 3 for 3%)
              fmpScreenerUrl += `&dividendYieldMoreThan=${searchCriteria.dividend_yield_min / 100}`;
          }
          if (searchCriteria.dividend_yield_max) {
              fmpScreenerUrl += `&dividendYieldLessThan=${searchCriteria.dividend_yield_max / 100}`;
          }
          // Note: FMP screener is powerful but has many specific params.
          // Keywords are harder to directly map to FMP screener which is more field-based.
          // A general keyword search might use /api/v3/search?query=...&apikey=... but that's different from screening.
          // For now, keywords from OpenAI are not directly used in FMP screener unless they match a sector or other criteria.
          // We can add a limit to the number of results, e.g., &limit=50
          fmpScreenerUrl += `&limit=50`;


          const fmpResponse = await fetch(fmpScreenerUrl);
          if (!fmpResponse.ok) {
            const fmpErrorText = await fmpResponse.text();
            console.error('FMP API Error for stock screener:', fmpErrorText);
            return new Response(JSON.stringify({ error: `FMP API request failed: ${fmpResponse.status} ${fmpErrorText}`, fmpQuery: fmpScreenerUrl }), {
              status: fmpResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const fmpData = await fmpResponse.json();
          return new Response(JSON.stringify({
              openAICriteria: searchCriteria, // Return what OpenAI extracted for debugging/info
              fmpQuery: fmpScreenerUrl, // Return the query sent to FMP
              fmpResults: fmpData
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error('Error in /api/stocks/natural-search:', error);
          // Check if error is JSON parsing error from function call arguments
          if (error instanceof SyntaxError && error.message.includes("function_call.arguments")) {
             console.error('Failed to parse OpenAI function call arguments:', error);
             return new Response(JSON.stringify({ error: 'Failed to parse financial criteria from OpenAI response.' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      // --- End of Natural Language Stock Search Route ---

      // --- Stock Market API Routes ---
      else if (url.pathname.startsWith('/api/stocks/profile/') && request.method === 'GET') {
        const symbol = url.pathname.split('/')[4];
        const apiKey = env.FMP_API_KEY;

        if (!apiKey) {
          console.error('FMP_API_KEY not configured');
          return new Response(JSON.stringify({ error: 'Financial Modeling Prep API key not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!symbol) {
          return new Response(JSON.stringify({ error: 'Stock symbol missing in path.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const fmpUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`;
        try {
          const fmpResponse = await fetch(fmpUrl);
          if (!fmpResponse.ok) {
            console.error(`FMP API error for profile ${symbol}: ${fmpResponse.status} ${fmpResponse.statusText}`);
            return new Response(JSON.stringify({ error: `Failed to fetch company profile from FMP: ${fmpResponse.status}` }), { status: fmpResponse.status === 404 ? 404 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          const data = await fmpResponse.json();
          if (Array.isArray(data) && data.length > 0) {
            const profile = data[0];
            return new Response(JSON.stringify({
              symbol: profile.symbol,
              companyName: profile.companyName,
              image: profile.image,
              description: profile.description,
              industry: profile.industry,
              sector: profile.sector,
              marketCap: profile.mktCap, // Note: FMP uses mktCap
              exchangeShortName: profile.exchangeShortName,
              currency: profile.currency,
              website: profile.website,
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          } else {
            return new Response(JSON.stringify({ error: 'No profile data found for symbol or unexpected format.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (err) {
          console.error(`Error fetching/processing FMP profile for ${symbol}:`, err);
          return new Response(JSON.stringify({ error: 'Internal server error while fetching company profile.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      else if (url.pathname.startsWith('/api/stocks/quote/') && request.method === 'GET') {
        const symbol = url.pathname.split('/')[4];
        const apiKey = env.FMP_API_KEY;

        if (!apiKey) {
          console.error('FMP_API_KEY not configured');
          return new Response(JSON.stringify({ error: 'Financial Modeling Prep API key not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!symbol) {
          return new Response(JSON.stringify({ error: 'Stock symbol missing in path.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const fmpUrl = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`;
        try {
          const fmpResponse = await fetch(fmpUrl);
          if (!fmpResponse.ok) {
            console.error(`FMP API error for quote ${symbol}: ${fmpResponse.status} ${fmpResponse.statusText}`);
            return new Response(JSON.stringify({ error: `Failed to fetch stock quote from FMP: ${fmpResponse.status}` }), { status: fmpResponse.status === 404 ? 404 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          const data = await fmpResponse.json();
          if (Array.isArray(data) && data.length > 0) {
            const quote = data[0];
            return new Response(JSON.stringify({
              symbol: quote.symbol,
              name: quote.name,
              price: quote.price,
              changesPercentage: quote.changesPercentage,
              change: quote.change,
              dayLow: quote.dayLow,
              dayHigh: quote.dayHigh,
              yearHigh: quote.yearHigh,
              yearLow: quote.yearLow,
              marketCap: quote.marketCap,
              volume: quote.volume,
              avgVolume: quote.avgVolume,
              open: quote.open,
              previousClose: quote.previousClose,
              exchange: quote.exchange,
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          } else {
            return new Response(JSON.stringify({ error: 'No quote data found for symbol or unexpected format.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (err) {
          console.error(`Error fetching/processing FMP quote for ${symbol}:`, err);
          return new Response(JSON.stringify({ error: 'Internal server error while fetching stock quote.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      else if (url.pathname.startsWith('/api/stocks/historical/') && request.method === 'GET') {
        const symbol = url.pathname.split('/')[4];
        const apiKey = env.FMP_API_KEY;

        if (!apiKey) {
          console.error('FMP_API_KEY not configured');
          return new Response(JSON.stringify({ error: 'Financial Modeling Prep API key not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (!symbol) {
          return new Response(JSON.stringify({ error: 'Stock symbol missing in path.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Optional: Add &timeseries=365 for 1 year, or other values. Default is often 5 years.
        const fmpUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}`;
        try {
          const fmpResponse = await fetch(fmpUrl);
          if (!fmpResponse.ok) {
            console.error(`FMP API error for historical data ${symbol}: ${fmpResponse.status} ${fmpResponse.statusText}`);
            return new Response(JSON.stringify({ error: `Failed to fetch historical data from FMP: ${fmpResponse.status}` }), { status: fmpResponse.status === 404 ? 404 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          const data = await fmpResponse.json();
          // FMP historical data is usually an object like { symbol: "AAPL", historical: [...] }
          if (data && Array.isArray(data.historical) && data.historical.length > 0) {
            const historicalData = data.historical.map(item => ({
              date: item.date,
              close: item.close,
              volume: item.volume,
              // Add other fields if needed: open: item.open, high: item.high, low: item.low, change: item.change, changePercent: item.changePercent
            }));
            return new Response(JSON.stringify(historicalData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          } else if (Array.isArray(data) && data.length > 0 && data[0] && data[0].historical ) { // some symbols might return [{historical: []}]
             const historicalData = data[0].historical.map(item => ({
                date: item.date,
                close: item.close,
                volume: item.volume,
             }));
            return new Response(JSON.stringify(historicalData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

          }
          else {
            // Handle cases where FMP might return an empty object for a symbol it doesn't have full historical data for,
            // or if `data.historical` is empty.
            if (data && data.historical && data.historical.length === 0) {
                 return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); // Return empty array
            }
            console.warn(`No historical data array found for symbol ${symbol} or unexpected FMP format:`, data);
            return new Response(JSON.stringify({ error: 'No historical data found for symbol or unexpected format.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (err) {
          console.error(`Error fetching/processing FMP historical for ${symbol}:`, err);
          return new Response(JSON.stringify({ error: 'Internal server error while fetching historical stock data.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      // --- End of Stock Market API Routes ---

      // --- News API Route ---
      else if (url.pathname === '/api/news' && request.method === 'GET') {
        const newsApiKey = env.NEWS_API_KEY;
        const openaiApiKey = env.OPENAI_API_KEY;
        // Use a chat model for summarization/sentiment. Fallback to OPENAI_MODEL or a default.
        const openaiModelForNews = (env.OPENAI_MODEL && env.OPENAI_MODEL.startsWith('gpt-')) ? env.OPENAI_MODEL : 'gpt-3.5-turbo';

        if (!newsApiKey) {
          console.error('NEWS_API_KEY not configured');
          return new Response(JSON.stringify({ error: 'News API service is not configured by the server administrator.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (!openaiApiKey) {
          console.error('OPENAI_API_KEY not configured for news summarization');
          return new Response(JSON.stringify({ error: 'OpenAI API key is not configured for news processing.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const newsApiUrl = `https://newsapi.org/v2/top-headlines?country=us&category=business&pageSize=10&apiKey=${newsApiKey}`; // pageSize=10 to limit article count for now

        try {
          const newsResponse = await fetch(newsApiUrl, {
            headers: { 'User-Agent': 'DashboardApp/1.0 (Cloudflare Worker)' }
          });

          if (!newsResponse.ok) {
            const errorText = await newsResponse.text();
            console.error(`External News API error: ${newsResponse.status} ${newsResponse.statusText}`, errorText);
            return new Response(JSON.stringify({ error: `Failed to fetch news from external source: ${newsResponse.status}` }), {
              status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const newsData = await newsResponse.json();
          let rawArticles = [];
          if (newsData.articles) {
            rawArticles = newsData.articles.map(article => ({
              title: article.title,
              description: article.description, // This will be used as content for OpenAI
              content: article.content, // Some APIs provide full content here
              url: article.url,
              source: article.source ? article.source.name : 'Unknown Source',
              publishedAt: article.publishedAt,
              imageUrl: article.urlToImage,
            }));
          } else {
            console.warn("News API response did not contain an 'articles' array. Data:", newsData);
          }

          const processedArticles = [];
          for (const article of rawArticles) {
            const contentToAnalyze = article.description || article.content || ""; // Prefer description or content
            let aiSummary = "Content too short to analyze.";
            let sentiment = "N/A";

            if (contentToAnalyze.length < 50) { // Minimum length for meaningful analysis
                 processedArticles.push({ ...article, aiSummary, sentiment });
                 continue;
            }

            // Truncate content if too long to avoid excessive token usage
            const maxContentLength = 2000; // Characters, roughly maps to tokens
            const truncatedContent = contentToAnalyze.substring(0, maxContentLength);

            const openAIPrompt = `
Article Title: ${article.title}
Article Snippet/Content: ${truncatedContent}

Based on the above, please provide:
1. A very concise summary (1-2 sentences).
2. The overall sentiment (Positive, Negative, or Neutral).

Return your response as a JSON object with keys "summary" and "sentiment".
For example:
{
  "summary": "...",
  "sentiment": "Positive"
}`;
            try {
              const openaiApiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                  model: openaiModelForNews,
                  messages: [{ role: "user", content: openAIPrompt }],
                  // Attempt to use JSON response mode if supported by the model (e.g. gpt-3.5-turbo-1106+)
                  // response_format: { type: "json_object" }, // Uncomment if model explicitly supports it
                }),
              });

              if (openaiApiResponse.ok) {
                const openaiJson = await openaiApiResponse.json();
                // Check if response_format: { type: "json_object" } was used and successful
                let extractedText = openaiJson.choices?.[0]?.message?.content;

                if (extractedText) {
                    try {
                        // Attempt to parse the string as JSON
                        const parsedJson = JSON.parse(extractedText);
                        aiSummary = parsedJson.summary || "Could not extract summary.";
                        sentiment = parsedJson.sentiment || "Could not extract sentiment.";
                    } catch (parseError) {
                        console.error(`Error parsing OpenAI JSON response for article "${article.title}":`, parseError, "Raw text:", extractedText);
                        aiSummary = "AI response format error.";
                        sentiment = "Error";
                    }
                } else {
                    aiSummary = "No content from AI.";
                    sentiment = "Error";
                }

              } else {
                const errorText = await openaiApiResponse.text();
                console.error(`OpenAI API Error for article "${article.title}": ${openaiApiResponse.status} ${errorText}`);
                aiSummary = "OpenAI API error.";
                sentiment = "Error";
              }
            } catch (e) {
              console.error(`Exception during OpenAI call for article "${article.title}":`, e);
              aiSummary = "Processing exception.";
              sentiment = "Error";
            }
            processedArticles.push({ ...article, aiSummary, sentiment });
          }

          return new Response(JSON.stringify(processedArticles), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (err) {
          console.error('Error fetching or processing news data with OpenAI:', err);
          return new Response(JSON.stringify({ error: 'Internal server error while fetching and processing news.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      // --- End of News API Route ---

      // Fallback for unhandled paths or methods must be the FINAL else in the chain
      else {
        let supportedEndpoints = 'GET /api/crypto/current, GET /api/crypto/historical, GET /api/crypto/coinslist, GET /api/crypto/enriched-historical-data, GET /api/crypto/transaction-analysis, POST / (for Etherscan/OpenAI), GET /api/crypto/coins-by-blockchain, GET /api/crypto/market-chart/:coinId?days=:days, GET /api/crypto/trending, GET /api/crypto/global';
        supportedEndpoints += ', POST /api/budgets, GET /api/budgets, GET /api/budgets/:id, PUT /api/budgets/:id, DELETE /api/budgets/:id';
        supportedEndpoints += ', GET /api/stocks/natural-search, GET /api/stocks/profile/:symbol, GET /api/stocks/quote/:symbol, GET /api/stocks/historical/:symbol';
        supportedEndpoints += ', GET /api/news'; // Added news endpoint
        return new Response(`Not Found. Supported endpoints: ${supportedEndpoints}`, { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Error processing request in worker:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      let status = 500; // Default to Internal Server Error

      if (errorMessage.includes("CoinGecko API request failed") || errorMessage.includes("BlockCypher API request failed")) {
        // Specific error for upstream API failures - return 502 Bad Gateway
        status = 502;
      }
      // For other errors, 500 is appropriate.

      return new Response(JSON.stringify({ error: `Error processing your request: ${errorMessage}` }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};
