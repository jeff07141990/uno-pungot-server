import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// DEBUG: Catch any uncaught errors and render them visibly on the page
window.onerror = (message, source, lineno, colno, error) => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:red;color:white;padding:16px;font-size:14px;font-family:monospace;white-space:pre-wrap;max-height:50vh;overflow:auto;';
  el.textContent = `UNCAUGHT ERROR:\n${message}\nSource: ${source}:${lineno}:${colno}\nStack: ${error?.stack || 'N/A'}`;
  document.body.appendChild(el);
};
window.addEventListener('unhandledrejection', (event) => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:orange;color:black;padding:16px;font-size:14px;font-family:monospace;white-space:pre-wrap;max-height:50vh;overflow:auto;';
  el.textContent = `UNHANDLED PROMISE REJECTION:\n${event.reason?.stack || event.reason}`;
  document.body.appendChild(el);
});

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e: any) {
  document.body.innerHTML = `<div style="color:white;background:red;padding:20px;font-family:monospace;white-space:pre-wrap">RENDER CRASH:\n${e?.stack || e}</div>`;
}
