export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Expected POST request', { status: 405 });
    }

    // Ensure the request has a JSON body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return new Response('Invalid JSON body', { status: 400 });
    }

    const { prompt } = requestBody;

    if (!prompt) {
      return new Response('Missing "prompt" in request body', { status: 400 });
    }

    if (!env.OPENAI_API_KEY) {
      return new Response('OPENAI_API_KEY not configured', { status: 500 });
    }

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-davinci-003', // You can change the model as needed
          prompt: prompt,
          max_tokens: 150,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI API Error:', errorText);
        return new Response(`OpenAI API request failed: ${openaiResponse.status} ${errorText}`, { status: openaiResponse.status });
      }

      const openaiData = await openaiResponse.json();
      return new Response(JSON.stringify(openaiData), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Add CORS header
      });

    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return new Response('Error processing your request', { status: 500 });
    }
  },
};
