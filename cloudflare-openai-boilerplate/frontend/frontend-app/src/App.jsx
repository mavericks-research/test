import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Assume the Cloudflare Worker is deployed at this URL
// The user will need to replace this with their actual worker URL.
const WORKER_URL = 'https://worker-backend.lumexai.workers.dev'; // Placeholder

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setLoading(true);
    setError('');
    setResponse('');

    try {
      // IMPORTANT: Replace WORKER_URL with the actual deployed Cloudflare Worker URL
      // For local development, this might be 'http://localhost:8787' if running `wrangler dev`
      const result = await axios.post(WORKER_URL, { prompt });

      if (result.data && result.data.choices && result.data.choices[0]) {
        setResponse(result.data.choices[0].text);
      } else {
        setResponse('No response text found.');
      }
    } catch (err) {
      console.error('Error calling worker:', err);
      let errorMessage = 'Failed to fetch response from the worker.';
      if (err.response) {
        errorMessage += ` Status: ${err.response.status} - ${err.response.data}`;
      } else if (err.request) {
        errorMessage += ' No response received from server. Check worker URL and if the worker is running.';
      } else {
        errorMessage += ` ${err.message}`;
      }
      setError(errorMessage);
      setResponse(''); // Clear any previous successful response
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cloudflare Worker + OpenAI</h1>
        <p>Enter a prompt for OpenAI:</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Write a short poem about clouds"
          rows="3"
          cols="50"
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Loading...' : 'Submit to OpenAI'}
        </button>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {response && (
          <div className="response-area">
            <h2>Response from OpenAI:</h2>
            <pre>{response}</pre>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
