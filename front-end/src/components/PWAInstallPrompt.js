import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiSmartphone } from 'react-icons/fi';
import { isAppInstalled, isIOS } from '../serviceWorkerRegistration';

/**
 * PWA Install Prompt Component
 * Shows a banner to users prompting them to install the app
 */
function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isAppInstalled()) {
      return;
    }

    // Check if user has dismissed the prompt recently
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(parseInt(dismissedAt));
      const daysSinceDismissed = (Date.now() - dismissedDate) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show for 7 days after dismissal
      }
    }

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show instructions after a delay
    if (isIOS() && !isAppInstalled()) {
      const timer = setTimeout(() => {
        setShowIOSInstructions(true);
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    } else {
      // User dismissed, remember for 7 days
      localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-banner">
      <div className="pwa-install-content">
        <div className="pwa-install-icon">
          <FiSmartphone size={24} />
        </div>
        <div className="pwa-install-text">
          <strong>Install Splitzy</strong>
          {showIOSInstructions ? (
            <span>
              Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong>
            </span>
          ) : (
            <span>Add to home screen for quick access</span>
          )}
        </div>
        <div className="pwa-install-actions">
          {!showIOSInstructions && (
            <button className="pwa-install-btn" onClick={handleInstall}>
              <FiDownload size={16} />
              Install
            </button>
          )}
          <button className="pwa-dismiss-btn" onClick={handleDismiss}>
            <FiX size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;

