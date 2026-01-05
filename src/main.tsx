import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./sw-register";

// Error handler for white screen debugging
window.onerror = function (msg, url, line, col, error) {
    const root = document.getElementById("root");
    if (root) {
        root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h2>App Error:</h2>
        <p>${msg}</p>
        <p>Line: ${line}, Col: ${col}</p>
        <p>URL: ${url}</p>
        <pre>${error?.stack || ''}</pre>
      </div>
    `;
    }
    return false;
};

window.onunhandledrejection = function (event) {
    const root = document.getElementById("root");
    if (root) {
        root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h2>Promise Rejection:</h2>
        <pre>${event.reason?.stack || event.reason}</pre>
      </div>
    `;
    }
};

try {
    createRoot(document.getElementById("root")!).render(<App />);
} catch (err: any) {
    const root = document.getElementById("root");
    if (root) {
        root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h2>Render Error:</h2>
        <pre>${err?.stack || err}</pre>
      </div>
    `;
    }
}
