import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import MainComponent from './components/mainComponent.jsx';
import './index.css'; // Import the CSS file

document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded and parsed");

  // Find the element where you want to insert your component
  const targetElement = document.querySelector('#__next'); // Or any other suitable selector

  if (targetElement) {
    const root = document.createElement("div");
    root.id = "briefly-root---------------------------";
    targetElement.appendChild(root);

    try {
      const reactRoot = createRoot(root); // Create the root
      reactRoot.render( // Then render
        <StrictMode>
          <MainComponent />
        </StrictMode>
      );
    } catch (error) {
      console.error("React rendering error:", error);
    }
  } else {
    console.error("Target element not found on LeetCode!");
  }
});