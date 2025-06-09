// backend/worker-backend/src/openAIService.js

const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-3.5-turbo'; // Or consider 'gpt-4' if available/preferred

/**
 * Generates a financial report narrative using OpenAI's API.
 *
 * @param {object} financialData - Object containing 'holdings' array and 'summary' object.
 * @param {object} behavioralData - Object containing 'tags' array and 'metrics' object. Can be null or have empty/default values if transaction data was unavailable.
 * @param {object} env - The Cloudflare worker environment variables. Expected to contain OPENAI_API_KEY.
 * @returns {Promise<string>} A promise that resolves to an AI-generated report narrative.
 */
async function generateReport(financialData, behavioralData, env) {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('OpenAI API key is missing from environment variables.');
    // Return a specific message that can be displayed to the user on the frontend.
    // Throwing an error here would be caught by the calling function in cryptoApi.js,
    // which then would be caught by index.js and returned as a generic 500 error.
    // Returning a message allows for more specific error handling if desired.
    return "Error: OpenAI API key is missing. Please configure it in the backend.";
  }

  // Ensure financialData and its properties are defined before trying to access them
  const holdings = financialData && financialData.holdings ? financialData.holdings : [];
  const summary = financialData && financialData.summary ? financialData.summary : {};

  // Construct the user message
  let userMessageContent = "Financial Portfolio Overview:\n";
  userMessageContent += `Total Portfolio Value: $${summary.totalPortfolioValueUSD || '0.00'} USD\n`;
  userMessageContent += `Number of Unique Assets: ${summary.numberOfUniqueAssets || 0}\n`;
  if (summary.topAssetsMessage) {
    userMessageContent += `${summary.topAssetsMessage}\n`;
  }
  userMessageContent += "\nKey Holdings (Top 7 by value, if available):\n";

  if (holdings && holdings.length > 0) {
    holdings.slice(0, 7).forEach(token => {
      userMessageContent += `- ${token.name} (${token.symbol}): ${token.balance} units, Value: $${token.value_usd} USD (${token.percentageAllocation} of portfolio)\n`;
    });
    if (holdings.length > 7) {
      userMessageContent += `- And ${holdings.length - 7} more token(s).\n`;
    }
  } else {
    userMessageContent += "No detailed holdings data available or portfolio is empty.\n";
  }

  // Conditionally add Behavioral Profile
  if (behavioralData && behavioralData.tags && behavioralData.tags.length > 0) {
    userMessageContent += "\n\nWallet Behavioral Profile:\n";
    userMessageContent += `Identified Behaviors (Tags): ${behavioralData.tags.join(', ')}\n`;

    // Add some key metrics that support the tags or provide interesting context
    let keyMetricsStrings = [];
    if (behavioralData.metrics) {
        if (behavioralData.metrics.totalTransactions > 0) {
            keyMetricsStrings.push(`Total Transactions: ${behavioralData.metrics.totalTransactions}`);
        }
        if (behavioralData.metrics.dexInteractionCount > 0) {
            keyMetricsStrings.push(`DEX Interactions: ${behavioralData.metrics.dexInteractionCount}`);
        }
        if (behavioralData.metrics.nftInteractionCount > 0) {
            keyMetricsStrings.push(`NFT Interactions: ${behavioralData.metrics.nftInteractionCount}`);
        }
        if (behavioralData.metrics.transactionPeriodDays > 0) {
            keyMetricsStrings.push(`Activity Period: ~${behavioralData.metrics.transactionPeriodDays} days`);
        }
        if (behavioralData.metrics.avgTransactionsPerDay > 0) {
            keyMetricsStrings.push(`Avg. Transactions/Day: ${behavioralData.metrics.avgTransactionsPerDay.toFixed(2)}`);
        }
    }
    if (keyMetricsStrings.length > 0) {
        userMessageContent += `Key Metrics: ${keyMetricsStrings.join('; ')}\n`;
    }
  } else {
    userMessageContent += "\n\nNo specific behavioral patterns identified from transaction history or transaction history was not available/analyzed.\n";
  }

  userMessageContent += "\nPlease provide a concise, narrative report based on all the above information.";


  const systemMessage = {
    role: "system",
    content: "You are a financial analyst. You will receive financial data (portfolio holdings, summary) and, if available, a behavioral analysis (tags describing user activities, key metrics). Generate a concise, narrative report (around 150-200 words) that synthesizes these insights. If behavioral data is present, try to connect it to the financial holdings or activity patterns. Do not just list tags; weave them into a coherent profile. Focus on objective observations based *only* on the provided data. Do not give financial advice or predict future prices."
  };

  const userMessage = {
    role: "user",
    content: userMessageContent
  };

  const requestBody = {
    model: OPENAI_MODEL,
    messages: [systemMessage, userMessage],
    max_tokens: 250, // Adjusted for a bit more detail if needed, but keeping it concise
    temperature: 0.5, // Lower temperature for more deterministic, less "creative" output
  };

  console.log('Attempting to call OpenAI API. Prompt includes:', userMessageContent.substring(0, 100) + "..."); // Log snippet

  try {
    const response = await fetch(OPENAI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try to parse error, default to empty obj
      const errorDetails = errorData.error ? JSON.stringify(errorData.error) : `HTTP status ${response.status}`;
      console.error(`OpenAI API Error: ${response.status} ${response.statusText}`, errorData);
      // Return a specific error message to be displayed on the frontend
      return `Error generating AI report: OpenAI API request failed. Details: ${errorDetails}.`;
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      console.log('Successfully received AI-generated report from OpenAI.');
      return data.choices[0].message.content.trim();
    } else {
      console.error('OpenAI API Error: Unexpected response structure.', data);
      return "Error generating AI report: Received an unexpected response structure from OpenAI.";
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // This catches network errors or issues with fetch itself
    return `Error generating AI report: Could not connect to OpenAI service. Details: ${error.message}.`;
  }
}

export { generateReport };
