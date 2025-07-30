class TwitterReplyGenerator {
  constructor() {
    this.isEnabled = true;
    this.stats = { tweetsProcessed: 0, repliesGenerated: 0 };
    this.tweetObserver = new TweetObserver();
    this.messageHandlers = new Map();
    this.init();
  }

  init() {
    this.setupMessageHandlers();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    if (this.isEnabled) {
      this.start();
    }
    this.setupNavigationHandling();
  }

  start() {
    // Ensure we're completely stopped before starting
    this.stop();
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      this.tweetObserver.startObserving();
    }, 50);
  }

  stop() {
    this.tweetObserver.stopObserving();
    this.tweetObserver.removeAllButtons();
  }

  setupMessageHandlers() {
    const handlers = {
      [CONSTANTS.MESSAGES.ACTIONS.TOGGLE_EXTENSION]:
        this.handleToggleExtension.bind(this),
      [CONSTANTS.MESSAGES.ACTIONS.PING]: this.handlePing.bind(this),
      [CONSTANTS.MESSAGES.ACTIONS.SETTINGS_CHANGED]:
        this.handleSettingsChanged.bind(this),
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      this.messageHandlers.set(action, handler);
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handler = this.messageHandlers.get(request.action);
      if (handler) {
        try {
          const result = handler(request, sender);
          if (result instanceof Promise) {
            result
              .then((response) => sendResponse(response))
              .catch((error) =>
                sendResponse({ success: false, error: error.message })
              );
            return true;
          } else {
            sendResponse(result);
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: "Unknown action" });
      }
    });
  }

  handleToggleExtension(request) {
    this.isEnabled = request.enabled;
    if (this.isEnabled) {
      // Force complete cleanup before starting
      this.stop();
      setTimeout(() => {
        this.start();
        // Force refresh all buttons after a short delay
        setTimeout(() => {
          this.refreshButtons();
        }, 200);
      }, 100);
    } else {
      this.stop();
    }
    return { success: true, enabled: this.isEnabled };
  }

  handlePing() {
    return {
      success: true,
      active: true,
      enabled: this.isEnabled,
      stats: this.getStats(),
    };
  }

  handleSettingsChanged(request) {
    if (request.changes?.enabled !== undefined) {
      this.isEnabled = request.changes.enabled;
      if (this.isEnabled) {
        this.start();
      } else {
        this.stop();
      }
    }
    return { success: true };
  }

  setupNavigationHandling() {
    let currentUrl = window.location.href;
    const urlChangeHandler = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        if (this.isEnabled) {
          setTimeout(() => this.tweetObserver.restart(), 500);
        }
      }
    };

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(urlChangeHandler, 100);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(urlChangeHandler, 100);
    };

    window.addEventListener("popstate", urlChangeHandler);
    setInterval(urlChangeHandler, 2000);
  }

  updateStats(newStats) {
    this.stats = { ...this.stats, ...newStats };
    chrome.runtime.sendMessage({
      action: CONSTANTS.MESSAGES.ACTIONS.UPDATE_STATS,
      stats: this.stats,
    });
  }

  getStats() {
    const observerStats = this.tweetObserver.getStats();
    return {
      ...this.stats,
      ...observerStats,
      enabled: this.isEnabled,
      url: window.location.href,
    };
  }

  getStatus() {
    return {
      enabled: this.isEnabled,
      observing: this.tweetObserver.isActive(),
      stats: this.getStats(),
      version: chrome.runtime.getManifest()?.version || "unknown",
    };
  }

  refreshButtons() {
    if (this.isEnabled) {
      console.log("Refreshing buttons...");
      this.tweetObserver.removeAllButtons();
      // Clear processed tweets to force reprocessing
      this.tweetObserver.processedTweets = new WeakSet();
      setTimeout(() => {
        this.tweetObserver.injectAllButtons();
        console.log("Buttons refreshed");
      }, 100);
    }
  }

  destroy() {
    this.stop();
    this.messageHandlers.clear();
    DOMUtils.removeElements(`.${CONSTANTS.CSS_CLASSES.POPUP}`);
  }
}

if (typeof window !== "undefined" && !window.twitterReplyGenerator) {
  window.twitterReplyGenerator = new TwitterReplyGenerator();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TwitterReplyGenerator;
} else {
  window.TwitterReplyGenerator = TwitterReplyGenerator;
}
