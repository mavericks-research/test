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

    const { prompt } = requestBody;

    if (!prompt) {
      return new Response('Missing "prompt" in request body', { status: 400, headers: corsHeaders });
    }

    if (!env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response('OPENAI_API_KEY not configured', { status: 500, headers: corsHeaders });
    }

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo-instruct', // You can change the model as needed
          prompt: prompt,
          max_tokens: 150,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI API Error:', errorText);
        return new Response(`OpenAI API request failed: ${openaiResponse.status} ${errorText}`, { status: openaiResponse.status, headers: corsHeaders });
      }

      const openaiData = await openaiResponse.json();
      // Ensure CORS headers are on the actual response too
      const responseHeaders = {
        ...corsHeaders,
        'Content-Type': 'application/json',
      };
      return new Response(JSON.stringify(openaiData), { headers: responseHeaders });

    } catch (error) {
      console.error('Error calling OpenAI API:', error);
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
