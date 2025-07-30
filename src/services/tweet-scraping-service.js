class TweetScrapingService {
  static scrapeTweetContent(tweetElement) {
    if (!tweetElement) {
      return this.createEmptyTweetData();
    }

    const textContent = this.extractTweetText(tweetElement);
    const hashtags = this.extractHashtags(tweetElement);
    const mentions = this.extractMentions(tweetElement);
    const author = this.extractAuthor(tweetElement);

    const tweetData = {
      text: textContent,
      hashtags,
      mentions,
      author,
      fullContent: `${textContent} ${hashtags.join(" ")} ${mentions.join(
        " "
      )}`.trim(),
    };

    return tweetData;
  }

  static extractTweetText(tweetElement) {
    let text = "";
    let textElement = null;

    for (const selector of CONSTANTS.SELECTORS.TWEET_TEXT) {
      const element = tweetElement.querySelector(selector);
      if (element && this.isValidTextElement(element, tweetElement)) {
        textElement = element;
        text = element.textContent.trim();
        break;
      }
    }

    if (!text) {
      text = this.extractTextFallback(tweetElement);
    }

    return TextUtils.cleanText(text);
  }

  static isValidTextElement(element, tweetElement) {
    const mediaContainer = tweetElement.querySelector('[data-testid*="media"]');
    if (mediaContainer && mediaContainer.contains(element)) {
      return false;
    }

    const text = element.textContent.trim();
    return text.length > 0;
  }

  static extractTextFallback(tweetElement) {
    const tweetContent = tweetElement.querySelector('[data-testid="tweet"]');
    if (!tweetContent) return "";

    const textNodes = tweetContent.querySelectorAll("div[lang], span[lang]");

    for (const node of textNodes) {
      if (!this.isInMediaContainer(node) && node.textContent.trim()) {
        return node.textContent.trim();
      }
    }

    return "";
  }

  static isInMediaContainer(element) {
    return !!(
      element.closest('[data-testid*="media"]') ||
      element.closest('[data-testid*="video"]') ||
      element.closest('[data-testid*="image"]')
    );
  }

  static extractHashtags(tweetElement) {
    const hashtagLinks = tweetElement.querySelectorAll(
      CONSTANTS.SELECTORS.HASHTAG_LINKS
    );
    return Array.from(hashtagLinks)
      .map((link) => link.textContent.trim())
      .filter((tag) => tag.startsWith("#"));
  }

  static extractMentions(tweetElement) {
    const mentionLinks = tweetElement.querySelectorAll(
      CONSTANTS.SELECTORS.MENTION_LINKS
    );
    return Array.from(mentionLinks)
      .map((link) => link.textContent.trim())
      .filter((mention) => mention.startsWith("@"));
  }

  static extractAuthor(tweetElement) {
    const authorElement = DOMUtils.findElement(tweetElement, [
      CONSTANTS.SELECTORS.USER_NAME,
      'a[href^="/"][role="link"]',
    ]);

    return authorElement ? authorElement.textContent.trim() : "";
  }

  static createEmptyTweetData() {
    return {
      text: "",
      hashtags: [],
      mentions: [],
      author: "",
      fullContent: "",
    };
  }

  static hasValidContent(tweetElement) {
    if (!tweetElement) return false;
    const tweetData = this.scrapeTweetContent(tweetElement);
    return TextUtils.isValidTweetContent(tweetData);
  }

  static hasReplyButton(tweetElement) {
    return !!tweetElement.querySelector(
      `[data-testid="${CONSTANTS.DATA_ATTRIBUTES.REPLY_GENERATOR_BTN}"]`
    );
  }

  static findActionBar(tweetElement) {
    let actionBar = tweetElement.querySelector(CONSTANTS.SELECTORS.ACTION_BAR);

    if (!actionBar) {
      const groups = tweetElement.querySelectorAll('[role="group"]');
      for (const group of groups) {
        if (
          group.querySelector('[data-testid="reply"], [data-testid="like"]')
        ) {
          actionBar = group;
          break;
        }
      }
    }

    return actionBar;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TweetScrapingService;
} else {
  window.TweetScrapingService = TweetScrapingService;
}
