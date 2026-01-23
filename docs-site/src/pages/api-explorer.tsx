import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

export default function ApiExplorer(): JSX.Element {
  const [apiKey, setApiKey] = useState('');

  return (
    <Layout title="API Explorer" description="Interactive API playground for Ephemera">
      <div className="container" style={{ padding: '2rem 0' }}>
        <Heading as="h1">API Explorer</Heading>
        <p>Test the Ephemera API directly from your browser.</p>

        <div className="api-playground">
          <div className="api-key-input">
            <label htmlFor="api-key" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              API Key
            </label>
            <input
              id="api-key"
              type="password"
              placeholder="Enter your API key to make requests"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--ifm-background-surface-color)', borderRadius: '8px' }}>
            <p style={{ marginBottom: '1rem' }}>
              <strong>Note:</strong> The interactive Swagger UI will be loaded here once you configure your API key.
            </p>
            <p>
              For now, you can view the{' '}
              <a href="/openapi.yaml" target="_blank" rel="noopener noreferrer">
                OpenAPI specification
              </a>{' '}
              or use the API reference in the documentation.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
