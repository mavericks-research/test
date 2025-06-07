import { normalizeTokenNames, convertToUSD, normalizeTimestamps } from './normalizer.js';
import { getCurrentPrices, getHistoricalData, getCoinList } from './cryptoApi.js'; // Added getCoinList for potential future use or testing

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
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    return new Response(null, { headers: corsHeaders });
  } else {
    return new Response(null, { headers: { Allow: 'GET, POST, PUT, DELETE, OPTIONS' } }); // Added GET
  }
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
          return new Response(JSON.stringify(plans), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
Please provide a concise, human-readable summary of this wallet's activity. Focus on patterns, types of transactions, and potential insights.`;
          } else {
            openAIPrompt = `Wallet Address: ${walletAddress}
No transactions were found for this wallet. Please provide a general statement about what it means for a wallet to have no transaction history.`;
          }


          const openaiResponse = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
            body: JSON.stringify({ model: OPENAI_MODEL, prompt: openAIPrompt, max_tokens: 250 }),
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
            body: JSON.stringify({ model: OPENAI_MODEL, prompt: openAIPrompt, max_tokens: 150 }),
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
        let supportedEndpoints = 'GET /api/crypto/current, GET /api/crypto/historical, POST / (for Etherscan/OpenAI)';
        supportedEndpoints += ', POST /api/budgets, GET /api/budgets, GET /api/budgets/:id, PUT /api/budgets/:id, DELETE /api/budgets/:id';
        return new Response(`Not Found. Supported endpoints: ${supportedEndpoints}`, { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Error processing request in worker:', error);
      // Ensure error.message is a string.
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Ensure generic errors also return JSON with CORS
      return new Response(JSON.stringify({ error: `Error processing your request: ${errorMessage}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  },
};
