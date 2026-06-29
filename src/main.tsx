import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initDemoMode } from './services/gemini';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

const root = createRoot(container);

initDemoMode().finally(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
