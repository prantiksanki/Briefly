import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import MainComponent from './components/mainComponent.jsx';
import './index.css';

document.addEventListener('DOMContentLoaded', function() {
  // Create a container that takes up more space
  const container = document.createElement('div');
  container.id = 'briefly-extension-root';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    width: 400px;
    min-height: 300px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <MainComponent />
    </StrictMode>
  );
});