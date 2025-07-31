const CONSTANTS = {
  API: {
    GEMINI: {
      ENDPOINT:
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      TIMEOUT: 10000,
      MAX_RETRIES: 3,
      GENERATION_CONFIG: {
        temperature: 0.7,
        maxOutputTokens: 500,
        topP: 0.8,
        topK: 40,
      },
      TEST_MODEL: "gpt-4o-mini", // For testing purposes
    },
    OPENAI: {
      ENDPOINT: "https://api.openai.com/v1/chat/completions",
      TIMEOUT: 10000,
      MAX_RETRIES: 3,
      MODEL: "gpt-4o-mini",
      GENERATION_CONFIG: {
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.8,
      },
      TEST_MODEL: "gpt-4", // For testing purposes
    },
  },

  DEFAULTS: {
    MAX_SUGGESTIONS: 5,
    ENABLED: true,
    USE_GEMINI: true,
    USE_OPENAI: false,
    AI_PROVIDER: "gemini", // "gemini" or "openai"
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
  },

  SELECTORS: {
    TWEET: [
      '[data-testid="tweet"]',
      'article[data-testid="tweet"]',
      '[data-testid="cellInnerDiv"]',
    ],
    TWEET_TEXT: [
      '[data-testid="tweetText"]',
      '[data-testid="tweet"] [data-testid="tweetText"]',
      'div[data-testid="tweetText"]',
      '[data-testid="tweet"] div[lang]',
      'div[lang]:not([data-testid*="media"])',
    ],
    ACTION_BAR: '[role="group"]',
    REPLY_BUTTON: '[data-testid="reply"]',
    HASHTAG_LINKS: 'a[href^="/hashtag/"]',
    MENTION_LINKS: 'a[href^="/"]',
    USER_NAME: '[data-testid="User-Name"]',
  },

  CSS_CLASSES: {
    BUTTON_CONTAINER: "flex items-center mx-1",
    REPLY_BUTTON:
      "flex items-center justify-center w-[34.75px] h-[34.75px] rounded-full bg-transparent border-none cursor-pointer relative outline-none text-[#536471] hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] focus:outline-2 focus:outline-[#1d9bf0] focus:outline-offset-2 active:scale-95 transition-all duration-200 ease-in-out font-sans",
    AI_GENERATING: "animate-pulse-slow",
    POPUP: "suggestions-popup-overlay",
    POPUP_CONTENT: "suggestions-popup-content",
    POPUP_HEADER: "suggestions-popup-header",
    SUGGESTIONS_LIST: "suggestions-popup-list",
    SUGGESTION_ITEM: "suggestions-popup-item",
  },

  DATA_ATTRIBUTES: {
    REPLY_GENERATOR_BTN: "reply-generator-btn",
  },

  PROMPTS: {
    REPLY_GENERATION: `You are a helpful assistant that generates engaging, human-like Twitter reply suggestions. 

Given the following tweet, generate 3-5 short, natural reply suggestions that are:
- Engaging and conversational
- Appropriate for the tweet's content and tone
- Under 280 characters each
- Not overly formal or robotic
- Contextually relevant

Tweet: "{tweetText}"
Hashtags: {hashtags}
Mentions: {mentions}
Author: {author}

Generate only the reply suggestions, one per line, without numbering or additional text.`,
    TEST_PROMPT: "Generate a simple test reply to: 'Hello world!'",
  },

  FALLBACK_SUGGESTIONS: [
    "Great point! Thanks for sharing this.",
    "Interesting perspective on this topic.",
    "I completely agree with you on this.",
    "This is really insightful, thanks!",
    "Love the way you put this together.",
    "Thanks for bringing this up!",
    "This resonates with me completely.",
    "Appreciate you sharing your thoughts.",
  ],

  CONTEXTUAL_SUGGESTIONS: {
    QUESTION: [
      "Great question! I'd love to hear more about this.",
      "That's an interesting point to consider.",
      "Thanks for bringing this up - it's worth discussing.",
    ],
    HASHTAG: [
      "Love the {hashtag} vibes!",
      "Thanks for sharing this perspective.",
    ],
    SHORT_TWEET: [
      "Short and sweet! Thanks for sharing.",
      "Appreciate you posting this.",
    ],
    LONG_TWEET: [
      "This is really insightful, thanks for sharing!",
      "Great point! I completely agree with you.",
    ],
    MENTION: ["Thanks for the mention {mention}!"],
    MINIMAL: [
      "Thanks for sharing this!",
      "Interesting perspective!",
      "Appreciate you posting this.",
    ],
  },

  ANIMATIONS: {
    BUTTON_STATE_CHANGE: 100,
    SUCCESS_DISPLAY: 1000,
    ERROR_DISPLAY: 2000,
    NOTIFICATION_DISPLAY: 3000,
  },

  MESSAGES: {
    ACTIONS: {
      TOGGLE_EXTENSION: "toggleExtension",
      PING: "ping",
      SETTINGS_CHANGED: "settingsChanged",
      GENERATE_REPLIES: "generateReplies",
      GET_SETTINGS: "getSettings",
      TEST_GEMINI_API: "testGeminiAPI",
      TEST_OPENAI_API: "testOpenAIAPI",
      UPDATE_STATS: "updateStats",
    },
  },

  LIMITS: {
    MAX_TWEET_LENGTH: 280,
    MIN_TWEET_LENGTH: 50,
    MAX_SUGGESTIONS: 5,
    MIN_SUGGESTIONS: 3,
  },

  ERROR_MESSAGES: {
    API_KEY_EMPTY: "API key is empty",
    API_REQUEST_TIMEOUT: "API request timed out",
    INVALID_RESPONSE_FORMAT: "Invalid response format from API",
    NO_SUGGESTIONS_GENERATED: "No suggestions generated",
    INVALID_TWEET_CONTENT: "Invalid tweet content",
    BACKGROUND_SCRIPT_TIMEOUT: "Background script communication timeout",
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONSTANTS;
} else {
  window.CONSTANTS = CONSTANTS;
}
