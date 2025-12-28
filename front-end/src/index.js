import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import './index.css';
import { store } from './store';
import App from './App';
import './output.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Provider store={store}>
        <App />
    </Provider>
);

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('[PWA] App ready for offline use');
  },
  onUpdate: (registration) => {
    console.log('[PWA] New version available');
    // IMPORTANT: don't reload immediately — wait for the new SW to take control,
    // otherwise you can reload into the old cached bundle again.
    const doUpdate = () => {
      let hasReloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasReloaded) return;
        hasReloaded = true;
        window.location.reload();
      });

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // Fallback: if we can't access waiting, just reload once.
        window.location.reload();
      }
    };

    // Show update notification to user
    if (window.confirm('A new version of Splitzy is available. Refresh to update?')) {
      doUpdate();
    }
  }
});
