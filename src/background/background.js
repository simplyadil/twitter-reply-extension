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
    enabled: true,
    geminiApiKey: "",
    openaiApiKey: "",
    maxSuggestions: 5,
    useGemini: true,
    useOpenAI: false,
    aiProvider: "gemini", // "gemini" or "openai"
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
      case "generateReplies":
        handleGenerateReplies(request.data, sendResponse);
        return true;
      case "getSettings":
        handleGetSettings(sendResponse);
        return true;
      case "saveSettings":
        handleSaveSettings(request.settings, sendResponse);
        return true;
      case "testGeminiAPI":
        handleTestGeminiAPI(request.apiKey, sendResponse);
        return true;
      case "testOpenAIAPI":
        handleTestOpenAIAPI(request.apiKey, sendResponse);
        return true;
      case "updateStats":
        handleUpdateStats(request.stats, sendResponse);
        return false;
      case "ping":
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
    const useGemini = settings.aiProvider === "gemini" && settings.geminiApiKey;
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
        settings.maxSuggestions || 5
      );
    }

    // Ensure we have suggestions
    if (!suggestions || suggestions.length === 0) {
      throw new Error("No suggestions generated");
    }

    await updateStorageStats({
      tweetsProcessed: 1,
      repliesGenerated: suggestions.length,
    });

    console.log("Background: Sending response with suggestions:", suggestions);
    sendResponse({
      success: true,
      suggestions: suggestions.slice(0, settings.maxSuggestions || 5),
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
  const prompt = formatPromptForGemini(tweetData);

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
      settings.geminiApiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.8,
          topK: 40,
        },
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
    throw new Error("Invalid response from Gemini API");
  }

  const generatedText = data.candidates[0].content.parts[0].text;
  const suggestions = generatedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length <= 280)
    .slice(0, settings.maxSuggestions || 5);

  return suggestions;
}

async function generateWithOpenAI(tweetData, settings) {
  const prompt = formatPromptForOpenAI(tweetData);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
      top_p: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid response from OpenAI API");
  }

  const generatedText = data.choices[0].message.content;
  const suggestions = generatedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length <= 280)
    .slice(0, settings.maxSuggestions || 5);

  return suggestions;
}

function formatPromptForGemini(tweetData) {
  return `You are a helpful assistant that generates engaging, human-like Twitter reply suggestions. 

Given the following tweet, generate 3-5 short, natural reply suggestions that are:
- Engaging and conversational
- Appropriate for the tweet's content and tone
- Under 280 characters each
- Not overly formal or robotic
- Contextually relevant

Tweet: "${tweetData.text || ""}"
Hashtags: ${tweetData.hashtags ? tweetData.hashtags.join(", ") : "None"}
Mentions: ${tweetData.mentions ? tweetData.mentions.join(", ") : "None"}
Author: ${tweetData.author || "Unknown"}

Generate only the reply suggestions, one per line, without numbering or additional text.`;
}

function formatPromptForOpenAI(tweetData) {
  return `You are a helpful assistant that generates engaging, human-like Twitter reply suggestions. 

Given the following tweet, generate 3-5 short, natural reply suggestions that are:
- Engaging and conversational
- Appropriate for the tweet's content and tone
- Under 280 characters each
- Not overly formal or robotic
- Contextually relevant

Tweet: "${tweetData.text || ""}"
Hashtags: ${tweetData.hashtags ? tweetData.hashtags.join(", ") : "None"}
Mentions: ${tweetData.mentions ? tweetData.mentions.join(", ") : "None"}
Author: ${tweetData.author || "Unknown"}

Generate only the reply suggestions, one per line, without numbering or additional text, don't return a list - at the beginning of the response.`;
}

function generateLocalSuggestions(tweetData, maxSuggestions = 5) {
  const suggestions = [];
  const text = tweetData.text || "";

  // Always start with some basic suggestions
  const baseSuggestions = [
    "Great point! Thanks for sharing this.",
    "Interesting perspective on this topic.",
    "I completely agree with you on this.",
    "This is really insightful, thanks!",
    "Love the way you put this together.",
    "Thanks for bringing this up!",
    "This resonates with me completely.",
    "Appreciate you sharing your thoughts.",
  ];

  // Add contextual suggestions based on tweet content
  if (text.includes("?")) {
    suggestions.push(
      "Great question! I'd love to hear more about this.",
      "That's an interesting point to consider.",
      "Thanks for bringing this up - it's worth discussing."
    );
  } else if (tweetData.hashtags?.length) {
    suggestions.push(`Love the ${tweetData.hashtags[0]} vibes!`);
    suggestions.push("Thanks for sharing this perspective.");
  } else if (text.length < 50) {
    suggestions.push("Short and sweet! Thanks for sharing.");
    suggestions.push("Appreciate you posting this.");
  } else {
    suggestions.push("This is really insightful, thanks for sharing!");
    suggestions.push("Great point! I completely agree with you.");
  }

  // Add mentions if present
  if (tweetData.mentions?.length) {
    suggestions.push(`Thanks for the mention ${tweetData.mentions[0]}!`);
  }

  // Combine and ensure we have enough suggestions
  const allSuggestions = [...suggestions, ...baseSuggestions];
  const uniqueSuggestions = [...new Set(allSuggestions)];

  // Ensure we return at least 3 suggestions
  if (uniqueSuggestions.length < 3) {
    uniqueSuggestions.push(
      "Thanks for sharing this!",
      "Interesting perspective!",
      "Appreciate you posting this."
    );
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
      sendResponse({ success: false, error: "API key is empty" });
      return;
    }

    const testPrompt = "Generate a simple test reply to: 'Hello world!'";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
          apiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: testPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 100 },
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
            error: "Invalid response format from API",
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
        sendResponse({ success: false, error: "API request timed out" });
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
      sendResponse({ success: false, error: "API key is empty" });
      return;
    }

    const testPrompt = "Generate a simple test reply to: 'Hello world!'";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [{ role: "user", content: testPrompt }],
            max_tokens: 100,
            temperature: 0.7,
          }),
          signal: controller.signal,
        }
      );

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
            error: "Invalid response format from API",
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
        sendResponse({ success: false, error: "API request timed out" });
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
