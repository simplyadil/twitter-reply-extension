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

const backgroundState = {
  stats: { tweetsProcessed: 0, repliesGenerated: 0 },
  isInitialized: false,
};

function initializeBackground() {
  if (backgroundState.isInitialized) return;

  setupEventListeners();
  backgroundState.isInitialized = true;
}

function setupEventListeners() {
  chrome.runtime.onInstalled.addListener(handleInstallation);
  chrome.runtime.onMessage.addListener(handleMessage);
}

function handleInstallation(details) {
  if (details.reason === "install") {
    setDefaultSettings();
  }
}

function setDefaultSettings() {
  const defaultSettings = {
    enabled: CONSTANTS.DEFAULTS.ENABLED,
    geminiApiKey: CONSTANTS.DEFAULTS.GEMINI_API_KEY,
    openaiApiKey: CONSTANTS.DEFAULTS.OPENAI_API_KEY,
    maxSuggestions: CONSTANTS.DEFAULTS.MAX_SUGGESTIONS,
    useGemini: CONSTANTS.DEFAULTS.USE_GEMINI,
    useOpenAI: CONSTANTS.DEFAULTS.USE_OPENAI,
    aiProvider: CONSTANTS.DEFAULTS.AI_PROVIDER,
    stats: { tweetsProcessed: 0, repliesGenerated: 0 },
  };

  chrome.storage.sync.set(defaultSettings, () => {
    if (chrome.runtime.lastError) {
      console.error(
        "Error setting default settings:",
        chrome.runtime.lastError
      );
    }
  });
}

function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case CONSTANTS.MESSAGES.ACTIONS.GENERATE_REPLIES:
        handleGenerateReplies(request.data, sendResponse);
        return true;
      case CONSTANTS.MESSAGES.ACTIONS.GET_SETTINGS:
        handleGetSettings(sendResponse);
        return true;
      case CONSTANTS.MESSAGES.ACTIONS.SAVE_SETTINGS:
        handleSaveSettings(request.settings, sendResponse);
        return true;
      case CONSTANTS.MESSAGES.ACTIONS.TEST_GEMINI_API:
        handleTestGeminiAPI(request.apiKey, sendResponse);
        return true;
      case CONSTANTS.MESSAGES.ACTIONS.TEST_OPENAI_API:
        handleTestOpenAIAPI(request.apiKey, sendResponse);
        return true;
      case CONSTANTS.MESSAGES.ACTIONS.UPDATE_STATS:
        handleUpdateStats(request.stats, sendResponse);
        return false;
      case CONSTANTS.MESSAGES.ACTIONS.PING:
        sendResponse({ success: true, active: true });
        return false;
      default:
        sendResponse({ success: false, error: "Unknown action" });
        return false;
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
    return false;
  }
}

async function handleGenerateReplies(tweetData, sendResponse) {
  try {
    console.log("Background: Generating replies for tweet:", tweetData);

    const settings = await getStorageData([
      "geminiApiKey",
      "openaiApiKey",
      "maxSuggestions",
      "useGemini",
      "useOpenAI",
      "aiProvider",
    ]);
    let suggestions = [];

    // Determine which API to use
    const useGemini =
      settings.aiProvider === CONSTANTS.DEFAULTS.AI_PROVIDER &&
      settings.geminiApiKey;
    const useOpenAI = settings.aiProvider === "openai" && settings.openaiApiKey;

    if (useGemini) {
      try {
        suggestions = await generateWithGemini(tweetData, settings);
        console.log("Background: Generated with Gemini:", suggestions);
      } catch (error) {
        console.warn("Background: Gemini failed, throwing error:", error);
        throw error;
      }
    } else if (useOpenAI) {
      try {
        suggestions = await generateWithOpenAI(tweetData, settings);
        console.log("Background: Generated with OpenAI:", suggestions);
      } catch (error) {
        console.warn("Background: OpenAI failed, throwing error:", error);
        throw error;
      }
    } else {
      // Only use local suggestions if no AI provider is configured
      suggestions = generateLocalSuggestions(
        tweetData,
        settings.maxSuggestions || CONSTANTS.DEFAULTS.MAX_SUGGESTIONS
      );
    }

    // Ensure we have suggestions
    if (!suggestions || suggestions.length === 0) {
      throw new Error(CONSTANTS.ERROR_MESSAGES.NO_SUGGESTIONS_GENERATED);
    }

    await updateStorageStats({
      tweetsProcessed: 1,
      repliesGenerated: suggestions.length,
    });

    console.log("Background: Sending response with suggestions:", suggestions);
    sendResponse({
      success: true,
      suggestions: suggestions.slice(
        0,
        settings.maxSuggestions || CONSTANTS.DEFAULTS.MAX_SUGGESTIONS
      ),
    });
  } catch (error) {
    console.error("Background: Error generating replies:", error);
    // Send error response instead of fallback suggestions
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

async function generateWithGemini(tweetData, settings) {
  const prompt = formatPrompt(tweetData);

  const response = await fetch(
    `${CONSTANTS.API.GEMINI.ENDPOINT}?key=${settings.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: CONSTANTS.API.GEMINI.GENERATION_CONFIG,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Gemini API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content) {
    throw new Error(CONSTANTS.ERROR_MESSAGES.INVALID_RESPONSE_FORMAT);
  }

  const generatedText = data.candidates[0].content.parts[0].text;
  const suggestions = generatedText
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && line.length <= CONSTANTS.LIMITS.MAX_TWEET_LENGTH
    )
    .slice(0, settings.maxSuggestions || CONSTANTS.DEFAULTS.MAX_SUGGESTIONS);

  return suggestions;
}

async function generateWithOpenAI(tweetData, settings) {
  const prompt = formatPrompt(tweetData);

  const response = await fetch(CONSTANTS.API.OPENAI.ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: CONSTANTS.API.OPENAI.MODEL,
      messages: [{ role: "user", content: prompt }],
      ...CONSTANTS.API.OPENAI.GENERATION_CONFIG,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error(CONSTANTS.ERROR_MESSAGES.INVALID_RESPONSE_FORMAT);
  }

  const generatedText = data.choices[0].message.content;
  const suggestions = generatedText
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && line.length <= CONSTANTS.LIMITS.MAX_TWEET_LENGTH
    )
    .slice(0, settings.maxSuggestions || CONSTANTS.DEFAULTS.MAX_SUGGESTIONS);

  return suggestions;
}

function formatPrompt(tweetData) {
  return CONSTANTS.PROMPTS.REPLY_GENERATION.replace(
    "{tweetText}",
    tweetData.text || ""
  )
    .replace("{hashtags}", tweetData.hashtags?.join(", ") || "None")
    .replace("{mentions}", tweetData.mentions?.join(", ") || "None")
    .replace("{author}", tweetData.author || "Unknown");
}

function generateLocalSuggestions(
  tweetData,
  maxSuggestions = CONSTANTS.DEFAULTS.MAX_SUGGESTIONS
) {
  const suggestions = [];
  const text = tweetData.text || "";

  // Always start with some basic suggestions
  const baseSuggestions = [...CONSTANTS.FALLBACK_SUGGESTIONS];

  // Add contextual suggestions based on tweet content
  if (text.includes("?")) {
    suggestions.push(...CONSTANTS.CONTEXTUAL_SUGGESTIONS.QUESTION);
  } else if (tweetData.hashtags?.length) {
    suggestions.push(
      CONSTANTS.CONTEXTUAL_SUGGESTIONS.HASHTAG[0].replace(
        "{hashtag}",
        tweetData.hashtags[0]
      ),
      CONSTANTS.CONTEXTUAL_SUGGESTIONS.HASHTAG[1]
    );
  } else if (text.length < CONSTANTS.LIMITS.MIN_TWEET_LENGTH) {
    suggestions.push(...CONSTANTS.CONTEXTUAL_SUGGESTIONS.SHORT_TWEET);
  } else {
    suggestions.push(...CONSTANTS.CONTEXTUAL_SUGGESTIONS.LONG_TWEET);
  }

  // Add mentions if present
  if (tweetData.mentions?.length) {
    suggestions.push(
      CONSTANTS.CONTEXTUAL_SUGGESTIONS.MENTION[0].replace(
        "{mention}",
        tweetData.mentions[0]
      )
    );
  }

  // Combine and ensure we have enough suggestions
  const allSuggestions = [...suggestions, ...baseSuggestions];
  const uniqueSuggestions = [...new Set(allSuggestions)];

  // Ensure we return at least 3 suggestions
  if (uniqueSuggestions.length < CONSTANTS.LIMITS.MIN_SUGGESTIONS) {
    uniqueSuggestions.push(...CONSTANTS.CONTEXTUAL_SUGGESTIONS.MINIMAL);
  }

  return uniqueSuggestions.slice(0, maxSuggestions);
}

async function handleGetSettings(sendResponse) {
  try {
    const settings = await getStorageData([
      "enabled",
      "geminiApiKey",
      "openaiApiKey",
      "maxSuggestions",
      "useGemini",
      "useOpenAI",
      "aiProvider",
      "stats",
    ]);
    sendResponse({ success: true, settings });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveSettings(newSettings, sendResponse) {
  try {
    await setStorageData(newSettings);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleTestGeminiAPI(apiKey, sendResponse) {
  try {
    if (!apiKey?.trim()) {
      sendResponse({
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.API_KEY_EMPTY,
      });
      return;
    }

    const testPrompt = CONSTANTS.PROMPTS.TEST_PROMPT;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONSTANTS.API.GEMINI.TIMEOUT
    );

    try {
      const response = await fetch(
        `${CONSTANTS.API.GEMINI.ENDPOINT}?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: testPrompt }] }],
            generationConfig: {
              temperature: CONSTANTS.API.GEMINI.GENERATION_CONFIG.temperature,
              maxOutputTokens: 100,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.candidates?.[0]?.content) {
          sendResponse({
            success: true,
            result: "API key is valid and working",
            testResponse: data.candidates[0].content.parts[0].text,
          });
        } else {
          sendResponse({
            success: false,
            error: CONSTANTS.ERROR_MESSAGES.INVALID_RESPONSE_FORMAT,
          });
        }
      } else {
        let errorMessage = `API error: ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          // Use default error message
        }

        sendResponse({ success: false, error: errorMessage });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        sendResponse({
          success: false,
          error: CONSTANTS.ERROR_MESSAGES.API_REQUEST_TIMEOUT,
        });
      } else {
        sendResponse({ success: false, error: fetchError.message });
      }
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleTestOpenAIAPI(apiKey, sendResponse) {
  try {
    if (!apiKey?.trim()) {
      sendResponse({
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.API_KEY_EMPTY,
      });
      return;
    }

    const testPrompt = CONSTANTS.PROMPTS.TEST_PROMPT;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONSTANTS.API.OPENAI.TIMEOUT
    );

    try {
      const response = await fetch(CONSTANTS.API.OPENAI.ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: CONSTANTS.API.OPENAI.TEST_MODEL,
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 100,
          temperature: CONSTANTS.API.OPENAI.GENERATION_CONFIG.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          sendResponse({
            success: true,
            result: "API key is valid and working",
            testResponse: data.choices[0].message.content,
          });
        } else {
          sendResponse({
            success: false,
            error: CONSTANTS.ERROR_MESSAGES.INVALID_RESPONSE_FORMAT,
          });
        }
      } else {
        let errorMessage = `API error: ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          // Use default error message
        }

        sendResponse({ success: false, error: errorMessage });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        sendResponse({
          success: false,
          error: CONSTANTS.ERROR_MESSAGES.API_REQUEST_TIMEOUT,
        });
      } else {
        sendResponse({ success: false, error: fetchError.message });
      }
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

function handleUpdateStats(newStats, sendResponse) {
  updateStorageStats(newStats)
    .then(() => {
      backgroundState.stats = { ...backgroundState.stats, ...newStats };
      sendResponse({ success: true });
    })
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
}

function getStorageData(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

function setStorageData(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

async function updateStorageStats(newStats) {
  try {
    const currentData = await getStorageData(["stats"]);
    const currentStats = currentData.stats || {
      tweetsProcessed: 0,
      repliesGenerated: 0,
    };

    const updatedStats = {
      tweetsProcessed:
        currentStats.tweetsProcessed + (newStats.tweetsProcessed || 0),
      repliesGenerated:
        currentStats.repliesGenerated + (newStats.repliesGenerated || 0),
    };

    await setStorageData({ stats: updatedStats });
  } catch (error) {
    throw error;
  }
}

initializeBackground();
