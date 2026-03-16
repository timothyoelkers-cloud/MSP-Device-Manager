/**
 * MSP Device Manager — PWA Registration Module
 * Handles service worker lifecycle, install prompt, and update notifications.
 */

const PWA = (() => {
  let _deferredPrompt = null;
  let _registration = null;
  let _isInstalledMode = false;

  // ─── Helpers ─────────────────────────────────────────────────────

  function _showToast(message, type) {
    // Use the global toast system if available, otherwise create a simple one
    if (typeof State !== 'undefined' && State.showToast) {
      State.showToast(message, type || 'info');
      return;
    }
    _fallbackToast(message);
  }

  function _fallbackToast(message) {
    const existing = document.getElementById('pwa-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'pwa-toast';
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '1.5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1e293b',
      color: '#fff',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '100000',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Register the service worker and set up all PWA event listeners.
   */
  async function init() {
    // Detect if running as installed PWA
    _isInstalledMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    // Capture the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _deferredPrompt = e;
      _updateInstallButtons(true);
    });

    // Detect successful install
    window.addEventListener('appinstalled', () => {
      _deferredPrompt = null;
      _isInstalledMode = true;
      _updateInstallButtons(false);
      _showToast('App installed successfully!', 'success');
    });

    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service workers are not supported in this browser.');
      return;
    }

    try {
      _registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('[PWA] Service worker registered, scope:', _registration.scope);

      // Listen for new service worker waiting to activate
      _registration.addEventListener('updatefound', () => {
        const newWorker = _registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version is waiting — prompt user
            _showUpdateNotification();
          } else if (newWorker.state === 'activated' && !navigator.serviceWorker.controller) {
            // First install — app is now available offline
            _showToast('App is ready for offline use.', 'success');
          }
        });
      });

      // When the new service worker takes over, notify the user
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        _showToast('App updated! Refresh to see changes.', 'info');
      });

    } catch (err) {
      console.error('[PWA] Service worker registration failed:', err);
    }
  }

  /**
   * Manually check for a service worker update.
   * @returns {Promise<boolean>} True if an update was found.
   */
  async function checkForUpdate() {
    if (!_registration) return false;
    try {
      await _registration.update();
      return !!(_registration.waiting);
    } catch (err) {
      console.error('[PWA] Update check failed:', err);
      return false;
    }
  }

  /**
   * Returns true if the app is running in standalone / installed mode.
   * @returns {boolean}
   */
  function isInstalled() {
    return _isInstalledMode;
  }

  /**
   * Show the native install prompt (if available).
   * @returns {Promise<string>} The user's choice: 'accepted' or 'dismissed'.
   */
  async function showInstallPrompt() {
    if (!_deferredPrompt) {
      console.warn('[PWA] Install prompt is not available.');
      return 'dismissed';
    }
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    _deferredPrompt = null;
    _updateInstallButtons(false);
    return outcome;
  }

  /**
   * Returns HTML string for an "Install App" button.
   * Hidden if the app is already installed or prompt is unavailable.
   * @returns {string}
   */
  function renderInstallButton() {
    const hidden = _isInstalledMode || !_deferredPrompt;
    return `<button
      id="pwa-install-btn"
      class="btn btn-secondary"
      onclick="PWA.showInstallPrompt()"
      style="display:${hidden ? 'none' : 'inline-flex'};align-items:center;gap:0.4rem;font-size:0.85rem"
      title="Install MSP Device Manager as a desktop app">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 2v8M5 7l3 3 3-3M3 12h10"/>
      </svg>
      Install App
    </button>`;
  }

  // ─── Internal ────────────────────────────────────────────────────

  function _updateInstallButtons(visible) {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = visible ? 'inline-flex' : 'none';
  }

  function _showUpdateNotification() {
    // If there is a waiting worker, prompt user to activate it
    if (typeof State !== 'undefined' && State.showToast) {
      State.showToast('A new version is available. Refresh to update.', 'info');
    } else {
      _fallbackToast('A new version is available. Refresh to update.');
    }
  }

  // ─── Expose ──────────────────────────────────────────────────────

  return {
    init,
    checkForUpdate,
    isInstalled,
    showInstallPrompt,
    renderInstallButton
  };
})();
