class TextUtils {
  static cleanText(text) {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  static extractHashtags(source) {
    const hashtags = [];

    if (typeof source === "string") {
      const hashtagRegex = /#[a-zA-Z0-9_]+/g;
      const matches = source.match(hashtagRegex);
      if (matches) {
        hashtags.push(...matches);
      }
    } else if (source?.querySelectorAll) {
      const hashtagLinks = source.querySelectorAll(
        CONSTANTS.SELECTORS.HASHTAG_LINKS
      );
      hashtags.push(
        ...Array.from(hashtagLinks)
          .map((link) => link.textContent.trim())
          .filter((tag) => tag.startsWith("#"))
      );
    }

    return hashtags;
  }

  static extractMentions(source) {
    const mentions = [];

    if (typeof source === "string") {
      const mentionRegex = /@[a-zA-Z0-9_]+/g;
      const matches = source.match(mentionRegex);
      if (matches) {
        mentions.push(...matches);
      }
    } else if (source?.querySelectorAll) {
      const mentionLinks = source.querySelectorAll(
        CONSTANTS.SELECTORS.MENTION_LINKS
      );
      mentions.push(
        ...Array.from(mentionLinks)
          .map((link) => link.textContent.trim())
          .filter((mention) => mention.startsWith("@"))
      );
    }

    return mentions;
  }

  static truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  static isQuestion(text) {
    if (!text) return false;
    return (
      text.includes("?") ||
      text
        .toLowerCase()
        .match(
          /^(what|how|why|when|where|who|which|do|does|did|can|could|would|will|should|is|are|was|were)/
        )
    );
  }

  static detectSentiment(text) {
    if (!text) return "neutral";

    const positiveWords = [
      "good",
      "great",
      "awesome",
      "amazing",
      "love",
      "like",
      "happy",
      "excited",
      "wonderful",
      "fantastic",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "hate",
      "sad",
      "angry",
      "disappointed",
      "frustrated",
      "horrible",
    ];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter((word) =>
      lowerText.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      lowerText.includes(word)
    ).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  static generateContextualSuggestions(tweetData) {
    const suggestions = [];
    const { text, hashtags, mentions } = tweetData;

    if (!text) return CONSTANTS.FALLBACK_SUGGESTIONS.slice(0, 3);

    const sentiment = this.detectSentiment(text);
    const isQuestion = this.isQuestion(text);

    if (isQuestion) {
      suggestions.push(
        "Great question! I'd love to hear more about this.",
        "That's an interesting point to consider.",
        "Thanks for bringing this up - it's worth discussing."
      );
    } else if (sentiment === "positive") {
      suggestions.push(
        "Love this perspective! Thanks for sharing.",
        "This made my day - appreciate you posting this!",
        "Completely agree with this positive outlook."
      );
    } else if (sentiment === "negative") {
      suggestions.push(
        "Thanks for sharing your thoughts on this.",
        "I can understand that perspective.",
        "Appreciate you bringing attention to this issue."
      );
    }

    if (hashtags?.length) {
      suggestions.push(`Love the ${hashtags[0]} vibes!`);
    }

    if (text.length < 50) {
      suggestions.push("Short and sweet! Thanks for sharing.");
    } else {
      suggestions.push(
        "This is really insightful, thanks for the detailed thoughts!"
      );
    }

    suggestions.push(
      "This resonates with me completely.",
      "Thanks for taking the time to share this.",
      "Interesting perspective on this topic."
    );

    return [...new Set(suggestions)].slice(0, 5);
  }

  static isValidTweetContent(tweetData) {
    if (!tweetData?.text) return false;

    const cleanedText = this.cleanText(tweetData.text);
    if (cleanedText.length < 3) return false;

    const urlRegex = /https?:\/\/[^\s]+/g;
    const textWithoutUrls = cleanedText.replace(urlRegex, "");
    return textWithoutUrls.trim().length >= 3;
  }

  static escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  static formatForDisplay(text, maxLength = 100) {
    if (!text) return "";
    const cleaned = this.cleanText(text);
    const escaped = this.escapeHtml(cleaned);
    return this.truncate(escaped, maxLength);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TextUtils;
} else {
  window.TextUtils = TextUtils;
}
