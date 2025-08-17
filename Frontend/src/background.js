const ports = new Set();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === '@crx/client') {
    ports.add(port);
    
    port.onMessage.addListener((msg) => {
      try {
        // Handle ping messages
        if (msg.data === 'ping') {
          port.postMessage({ data: 'pong' });
          return;
        }

        // Forward messages to other ports
        ports.forEach(p => {
          if (p !== port && p.name === '@crx/client') {
            try {
              p.postMessage(msg);
            } catch (err) {
              console.error('Port messaging error:', err);
              ports.delete(p);
            }
          }
        });
      } catch (error) {
        console.error('Message handling error:', error);
      }
    });

    port.onDisconnect.addListener(() => {
      ports.delete(port);
    });
  }
});