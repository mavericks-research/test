import { normalizeTokenNames, convertToUSD, normalizeTimestamps } from './normalizer.js';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    if (request.method !== 'POST') {
      return new Response('Expected POST request', { status: 405, headers: corsHeaders });
    }

    // Ensure the request has a JSON body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
    }

    const { walletAddress } = requestBody;

    if (!walletAddress) {
      return new Response('Missing "walletAddress" in request body', { status: 400, headers: corsHeaders });
    }

    if (!env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response('OPENAI_API_KEY not configured. Please set it in wrangler.toml or as a secret.', { status: 500, headers: corsHeaders });
    }

    if (!env.ETHERSCAN_API_KEY) {
      console.error('ETHERSCAN_API_KEY not configured');
      return new Response('ETHERSCAN_API_KEY not configured. Please set it in wrangler.toml or as a secret.', { status: 500, headers: corsHeaders });
    }

    // Construct the Etherscan API URL
    // Documentation: https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address
    const etherscanApiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${env.ETHERSCAN_API_KEY}`;

    try {
      const etherscanResponse = await fetch(etherscanApiUrl);

      if (!etherscanResponse.ok) {
        const errorText = await etherscanResponse.text();
        console.error('Etherscan API Error:', errorText);
        return new Response(`Etherscan API request failed: ${etherscanResponse.status} ${errorText}`, { status: etherscanResponse.status, headers: corsHeaders });
      }

      let etherscanData = await etherscanResponse.json();

      // Etherscan API returns status "0" if no transactions, or an error.
      // And "1" for success. The actual transactions are in the "result" field.
      if (etherscanData.status === "1" && Array.isArray(etherscanData.result)) {
        let transactions = etherscanData.result;

        // Normalize transactions
        transactions = normalizeTokenNames(transactions);
        transactions = convertToUSD(transactions);
        transactions = normalizeTimestamps(transactions);

        console.log('Normalized transactions:', JSON.stringify(transactions, null, 2));

        // Construct prompt for OpenAI
        let openAIPrompt = '';
        if (transactions.length > 0) {
          const numTransactions = transactions.length;
          // Note: valueUSD is currently a placeholder copying 'value' in Wei.
          // For a real sum, this would need to be converted to a common unit like ETH or actual USD.
          const totalValueUSDPlaceholder = transactions.reduce((sum, tx) => sum + BigInt(tx.valueUSD), BigInt(0)).toString();
          const uniqueTokens = [...new Set(transactions.map(tx => tx.tokenInvolved).filter(t => t))];
          const firstTxDate = transactions[0]?.dateTime;
          const lastTxDate = transactions[transactions.length - 1]?.dateTime;

          openAIPrompt = `Wallet Address: ${walletAddress}\nTransaction Summary:\n`;
          openAIPrompt += `- Total Transactions: ${numTransactions}\n`;
          openAIPrompt += `- Total Value Transacted (in Wei, placeholder for USD): ${totalValueUSDPlaceholder}\n`;
          if (uniqueTokens.length > 0) {
            openAIPrompt += `- Tokens Involved: ${uniqueTokens.join(', ')}\n`;
          } else {
            openAIPrompt += `- No specific tokens (ETH transactions or non-token contract interactions) were identified.\n`;
          }
          if (firstTxDate && lastTxDate) {
            openAIPrompt += `- Transaction Period: ${firstTxDate} to ${lastTxDate}\n`;
          }
          openAIPrompt += `\nPlease provide a concise, human-readable summary of this wallet's activity. Focus on patterns, types of transactions, and potential insights.`;
        } else {
          openAIPrompt = `Wallet Address: ${walletAddress}\nNo transactions were found for this wallet. Please provide a general statement about what it means for a wallet to have no transaction history.`;
        }

        console.log("OpenAI Prompt:", openAIPrompt);

        // Call OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo-instruct', // Or another suitable model
            prompt: openAIPrompt,
            max_tokens: 250, // Adjust as needed
          }),
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
        // Still generate an OpenAI prompt for "no transactions"
        const openAIPrompt = `Wallet Address: ${walletAddress}\nNo transactions were found for this wallet according to Etherscan (${etherscanData.message || etherscanData.result}). Please provide a brief, general statement about what it means for a new or unused Ethereum wallet to have no transaction history.`;
        console.log("OpenAI Prompt (no transactions):", openAIPrompt);

        const openaiResponse = await fetch('https://api.openai.com/v1/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify({ model: 'gpt-3.5-turbo-instruct', prompt: openAIPrompt, max_tokens: 150 }),
        });

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error('OpenAI API Error (no transactions flow):', errorText);
          return new Response(`OpenAI API request failed: ${openaiResponse.status} ${errorText}`, { status: openaiResponse.status, headers: corsHeaders });
        }
        const openaiData = await openaiResponse.json();
        const aiSummary = openaiData.choices && openaiData.choices[0] ? openaiData.choices[0].text.trim() : 'No summary received from AI.';
        return new Response(JSON.stringify({ message: etherscanData.message || "No transactions found", summary: aiSummary, transactionData: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json'} });
      } else {
        console.error('Unexpected Etherscan API response structure:', etherscanData);
        return new Response('Unexpected response from Etherscan API', { status: 500, headers: corsHeaders });
      }

    } catch (error) {
      console.error('Error processing request:', error);
      return new Response('Error processing your request', { status: 500, headers: corsHeaders });
    }
  },
};

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For local dev, '*' is fine. For prod, restrict this to your frontend domain.
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handler for OPTIONS requests
function handleOptions(request) {
  // Make sure the necessary headers are present
  // for this to be a valid preflight request
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS preflight requests.
    return new Response(null, {
      headers: corsHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    // If you don't want to allow standard OPTIONS, you can throw an error here.
    return new Response(null, {
      headers: {
        Allow: 'POST, OPTIONS',
      },
    });
  }
}
