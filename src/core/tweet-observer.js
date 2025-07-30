class TweetObserver {
  constructor() {
    this.observer = null;
    this.isObserving = false;
    this.processedTweets = new WeakSet();
    this.replyButtonComponent = new ReplyButtonComponent();
    this.processNewTweets = DOMUtils.throttle(
      this.processNewTweets.bind(this),
      100
    );
  }

  startObserving() {
    if (this.isObserving) return;

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.isObserving = true;
    this.processExistingTweets();
  }

  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isObserving = false;
    // Clear processed tweets to ensure fresh start when re-enabled
    this.processedTweets = new WeakSet();
  }

  handleMutations(mutations) {
    let hasNewTweets = false;

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            this.containsTweets(node)
          ) {
            hasNewTweets = true;
            this.processNewTweets(node);
          }
        }
      }
    }
  }

  containsTweets(node) {
    if (DOMUtils.matchesAnySelector(node, CONSTANTS.SELECTORS.TWEET)) {
      return true;
    }
    const tweets = DOMUtils.findElements(node, CONSTANTS.SELECTORS.TWEET);
    return tweets.length > 0;
  }

  processNewTweets(container) {
    let tweetContainers = DOMUtils.findElements(
      container,
      CONSTANTS.SELECTORS.TWEET
    );

    if (DOMUtils.matchesAnySelector(container, CONSTANTS.SELECTORS.TWEET)) {
      tweetContainers.push(container);
    }

    for (const tweet of tweetContainers) {
      this.processSingleTweet(tweet);
    }
  }

  processExistingTweets() {
    const existingTweets = DOMUtils.findElements(
      document,
      CONSTANTS.SELECTORS.TWEET
    );
    for (const tweet of existingTweets) {
      this.processSingleTweet(tweet);
    }
  }

  processSingleTweet(tweetElement) {
    if (!tweetElement || !tweetElement.isConnected) {
      return;
    }

    if (
      this.processedTweets.has(tweetElement) ||
      TweetScrapingService.hasReplyButton(tweetElement)
    ) {
      return;
    }

    // Double-check that we don't already have a button for this tweet
    const existingButton = tweetElement.querySelector(
      `[data-testid="${CONSTANTS.DATA_ATTRIBUTES.REPLY_GENERATOR_BTN}"]`
    );
    if (existingButton) {
      this.processedTweets.add(tweetElement);
      return;
    }

    const button = this.replyButtonComponent.createReplyButton(tweetElement);
    if (button) {
      this.processedTweets.add(tweetElement);
    }
  }

  injectAllButtons() {
    this.processExistingTweets();
  }

  removeAllButtons() {
    this.replyButtonComponent.removeAllButtons();
    // Clear processed tweets to ensure fresh processing when re-enabled
    this.processedTweets = new WeakSet();
  }

  isActive() {
    return this.isObserving;
  }

  restart() {
    this.stopObserving();
    this.removeAllButtons();
    // Ensure complete cleanup before restarting
    setTimeout(() => {
      this.startObserving();
    }, 100);
  }

  getStats() {
    const allTweets = DOMUtils.findElements(
      document,
      CONSTANTS.SELECTORS.TWEET
    );
    const tweetsWithButtons = document.querySelectorAll(
      `[data-testid="${CONSTANTS.DATA_ATTRIBUTES.REPLY_GENERATOR_BTN}"]`
    );

    return {
      totalTweets: allTweets.length,
      tweetsWithButtons: tweetsWithButtons.length,
      observing: this.isObserving,
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TweetObserver;
} else {
  window.TweetObserver = TweetObserver;
}
