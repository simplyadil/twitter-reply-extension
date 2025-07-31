class AIReplyService {
  static async generateReplies(tweetData) {
    try {
      if (!TextUtils.isValidTweetContent(tweetData)) {
        throw new Error(CONSTANTS.ERROR_MESSAGES.INVALID_TWEET_CONTENT);
      }

      // Try background script first
      try {
        const suggestions = await this.generateWithBackgroundScript(tweetData);
        if (suggestions?.length) {
          return suggestions;
        }
      } catch (bgError) {
        console.warn(
          "Background script failed, trying contextual suggestions:",
          bgError
        );
        // Don't fall back to demo suggestions, throw the error
        throw bgError;
      }

      // Fallback to contextual suggestions
      const contextualSuggestions =
        this.generateContextualSuggestions(tweetData);
      if (contextualSuggestions?.length) {
        return contextualSuggestions;
      }

      // If we get here, no suggestions were generated
      throw new Error(CONSTANTS.ERROR_MESSAGES.NO_SUGGESTIONS_GENERATED);
    } catch (error) {
      console.error("Error generating replies:", error);
      // Re-throw the error instead of falling back to demo suggestions
      throw error;
    }
  }

  static generateWithBackgroundScript(tweetData) {
    return new Promise((resolve, reject) => {
      try {
        // Add timeout for background script communication
        const timeout = setTimeout(() => {
          reject(new Error(CONSTANTS.ERROR_MESSAGES.BACKGROUND_SCRIPT_TIMEOUT));
        }, CONSTANTS.API.GEMINI.TIMEOUT);

        chrome.runtime.sendMessage(
          {
            action: CONSTANTS.MESSAGES.ACTIONS.GENERATE_REPLIES,
            data: tweetData,
          },
          (response) => {
            clearTimeout(timeout);

            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            console.log("Response from background script:", response);

            if (response?.success && response.suggestions?.length) {
              resolve(response.suggestions);
            } else {
              // Handle error response from background script
              const errorMessage =
                response?.error ||
                CONSTANTS.ERROR_MESSAGES.NO_SUGGESTIONS_GENERATED;
              reject(new Error(errorMessage));
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  static generateContextualSuggestions(tweetData) {
    return TextUtils.generateContextualSuggestions(tweetData);
  }

  static generateFallbackSuggestions(tweetData) {
    const suggestions = [...CONSTANTS.FALLBACK_SUGGESTIONS];

    if (tweetData.hashtags?.length) {
      suggestions.unshift(
        CONSTANTS.CONTEXTUAL_SUGGESTIONS.HASHTAG[0].replace(
          "{hashtag}",
          tweetData.hashtags[0]
        )
      );
    }

    if (TextUtils.isQuestion(tweetData.text)) {
      suggestions.unshift(CONSTANTS.CONTEXTUAL_SUGGESTIONS.QUESTION[0]);
    }

    // Ensure we always return at least 3 suggestions
    const finalSuggestions = suggestions.slice(
      0,
      CONSTANTS.DEFAULTS.MAX_SUGGESTIONS
    );
    if (finalSuggestions.length < CONSTANTS.LIMITS.MIN_SUGGESTIONS) {
      finalSuggestions.push(...CONSTANTS.CONTEXTUAL_SUGGESTIONS.MINIMAL);
    }

    return finalSuggestions.slice(0, CONSTANTS.DEFAULTS.MAX_SUGGESTIONS);
  }

  static formatPrompt(tweetData) {
    return CONSTANTS.PROMPTS.REPLY_GENERATION.replace(
      "{tweetText}",
      tweetData.text || ""
    )
      .replace("{hashtags}", tweetData.hashtags?.join(", ") || "None")
      .replace("{mentions}", tweetData.mentions?.join(", ") || "None")
      .replace("{author}", tweetData.author || "Unknown");
  }

  static validateSuggestions(suggestions) {
    if (!Array.isArray(suggestions)) return [];

    return suggestions
      .filter((suggestion) => typeof suggestion === "string")
      .map((suggestion) => TextUtils.cleanText(suggestion))
      .filter(
        (suggestion) =>
          suggestion.length > 0 &&
          suggestion.length <= CONSTANTS.LIMITS.MAX_TWEET_LENGTH
      )
      .slice(0, CONSTANTS.DEFAULTS.MAX_SUGGESTIONS);
  }

  static async isServiceAvailable() {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: CONSTANTS.MESSAGES.ACTIONS.PING },
          (response) => resolve(response)
        );
      });

      return response?.active;
    } catch (error) {
      return false;
    }
  }

  static async getServiceStatus() {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: CONSTANTS.MESSAGES.ACTIONS.GET_SETTINGS },
          (response) => resolve(response)
        );
      });

      return {
        available: response?.success,
        settings: response?.settings || {},
        error: response?.error,
      };
    } catch (error) {
      return {
        available: false,
        settings: {},
        error: error.message,
      };
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AIReplyService;
} else {
  window.AIReplyService = AIReplyService;
}
