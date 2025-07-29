// Background Service Worker for Twitter Reply Generator

console.log('Background script loading...');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Twitter Reply Generator extension installed');
    
    // Set default settings
    chrome.storage.sync.set({
      enabled: true,
      geminiApiKey: '',
      maxSuggestions: 5,
      useGemini: true,
      stats: {
        tweetsProcessed: 0,
        repliesGenerated: 0
      }
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  if (request.action === 'generateReplies') {
    // Generate replies using Gemini API
    handleGenerateReplies(request.data)
      .then(suggestions => sendResponse({ success: true, suggestions }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Keep the message channel open for async response
  } else if (request.action === 'getSettings') {
    chrome.storage.sync.get(['enabled', 'geminiApiKey', 'maxSuggestions', 'useGemini'], (result) => {
      sendResponse({ success: true, settings: result });
    });
    return true;
  } else if (request.action === 'testGeminiAPI') {
    testGeminiAPI(request.apiKey)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'updateStats') {
    updateStats(request.stats);
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'ping') {
    // Simple ping handler for testing
    sendResponse({ success: true, message: 'Background script is working' });
    return true;
  }
});

// Test Gemini API connection
async function testGeminiAPI(apiKey) {
  try {
    console.log('Testing Gemini API with key:', apiKey.substring(0, 10) + '...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Generate exactly 3 short Twitter reply suggestions for this tweet: 'Hello world! This is a test tweet.' Each reply should be under 100 characters and be engaging and conversational. Return only the replies, one per line, without numbering."
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 200
        }
      })
    });

    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw new Error(`Gemini API test failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response data:', data);
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('No text in API response:', data);
      throw new Error('No response text from Gemini API');
    }

    console.log('Generated text:', generatedText);
    
    // Parse the response into suggestions
    const suggestions = parseGeminiResponse(generatedText, 3);
    
    if (suggestions.length === 0) {
      throw new Error('No valid suggestions generated');
    }

    return { 
      success: true, 
      suggestions: suggestions,
      message: `Successfully generated ${suggestions.length} suggestions`
    };
  } catch (error) {
    console.error('Gemini API test error:', error);
    throw new Error(`Gemini API test failed: ${error.message}`);
  }
}

// Update statistics
async function updateStats(newStats) {
  const currentStats = await chrome.storage.sync.get(['stats']);
  const stats = currentStats.stats || { tweetsProcessed: 0, repliesGenerated: 0 };
  
  stats.tweetsProcessed += newStats.tweetsProcessed || 0;
  stats.repliesGenerated += newStats.repliesGenerated || 0;
  
  await chrome.storage.sync.set({ stats });
}

// Enhanced function for Gemini API integration
async function handleGenerateReplies(tweetData) {
  try {
    // Get settings
    const settings = await chrome.storage.sync.get(['geminiApiKey', 'maxSuggestions', 'useGemini']);
    
    // Update stats
    await updateStats({ tweetsProcessed: 1 });
    
    // If Gemini API is configured and enabled, use it
    if (settings.useGemini && settings.geminiApiKey) {
      const suggestions = await callGeminiAPI(tweetData, settings);
      await updateStats({ repliesGenerated: suggestions.length });
      return suggestions;
    } else {
      // Use local generation as fallback
      const suggestions = await generateLocalReplies(tweetData);
      await updateStats({ repliesGenerated: suggestions.length });
      return suggestions;
    }
  } catch (error) {
    console.error('Error generating replies:', error);
    // Fallback to local generation
    const suggestions = await generateLocalReplies(tweetData);
    await updateStats({ repliesGenerated: suggestions.length });
    return suggestions;
  }
}

// Function to call Gemini API
async function callGeminiAPI(tweetData, settings) {
  const apiKey = settings.geminiApiKey;
  const maxSuggestions = settings.maxSuggestions || 5;
  
  // Create the prompt for Gemini
  const prompt = createGeminiPrompt(tweetData);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    // Parse the generated text into suggestions
    const suggestions = parseGeminiResponse(generatedText, maxSuggestions);
    return suggestions;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// Create prompt for Gemini API
function createGeminiPrompt(tweetData) {
  const prompt = `You are a helpful assistant that generates engaging, human-like Twitter reply suggestions. 
  
Given the following tweet, generate 3-5 short, natural reply suggestions that are:
- Engaging and conversational
- Appropriate for the tweet's content and tone
- Under 280 characters each
- Not overly formal or robotic
- Contextually relevant

Tweet: "${tweetData.text || 'No text content'}"
Hashtags: ${tweetData.hashtags?.join(', ') || 'None'}
Mentions: ${tweetData.mentions?.join(', ') || 'None'}
Author: ${tweetData.author || 'Unknown'}

Generate only the reply suggestions, one per line, without numbering or additional text.`;

  return prompt;
}

// Parse Gemini API response
function parseGeminiResponse(responseText, maxSuggestions) {
  // Split by lines and clean up
  const lines = responseText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.length <= 280)
    .filter(line => !line.match(/^\d+\./)) // Remove numbered lines
    .filter(line => !line.toLowerCase().includes('suggestion')) // Remove meta text
    .slice(0, maxSuggestions);

  // If we don't have enough suggestions, add some fallbacks
  if (lines.length < 3) {
    const fallbacks = [
      "Great point! Thanks for sharing this.",
      "Interesting perspective on this topic.",
      "I completely agree with you on this.",
      "This is really insightful, thanks!",
      "Love the way you put this together."
    ];
    
    lines.push(...fallbacks.slice(0, maxSuggestions - lines.length));
  }

  return lines;
}

// Enhanced local reply generation (fallback)
async function generateLocalReplies(tweetData) {
  const suggestions = [];
  
  // Generate context-aware suggestions based on content
  if (tweetData.text.length > 0) {
    const text = tweetData.text.toLowerCase();
    
    // Question-based responses
    if (text.includes('?')) {
      suggestions.push("Great question! I'd love to hear more about this.");
      suggestions.push("That's an interesting point to consider.");
      suggestions.push("I'm curious about your thoughts on this too.");
    }
    
    // Hashtag-based responses
    if (tweetData.hashtags.length > 0) {
      suggestions.push(`Love the ${tweetData.hashtags[0]} vibes!`);
      suggestions.push("Thanks for sharing this perspective.");
      suggestions.push(`Great use of ${tweetData.hashtags[0]}!`);
    }
    
    // Length-based responses
    if (tweetData.text.length < 50) {
      suggestions.push("Short and sweet! Thanks for sharing.");
      suggestions.push("Appreciate you posting this.");
      suggestions.push("Concise and to the point!");
    } else {
      suggestions.push("This is really insightful, thanks for sharing!");
      suggestions.push("Great point! I completely agree with you.");
      suggestions.push("Well said! Thanks for the detailed perspective.");
    }
    
    // Sentiment-based responses
    if (text.includes('love') || text.includes('amazing') || text.includes('great')) {
      suggestions.push("I feel the same way about this!");
      suggestions.push("Couldn't agree more!");
    }
    
    if (text.includes('hate') || text.includes('terrible') || text.includes('awful')) {
      suggestions.push("I understand your frustration.");
      suggestions.push("That's definitely concerning.");
    }
  }

  // Add some generic but engaging responses
  suggestions.push("Interesting perspective on this topic.");
  suggestions.push("Thanks for sharing this with us!");
  suggestions.push("I appreciate you bringing this up.");
  suggestions.push("This is worth thinking about.");
  suggestions.push("Thanks for the insight!");

  // Shuffle and limit suggestions
  const shuffled = suggestions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5);
}

// Handle extension action click
chrome.action.onClicked.addListener((tab) => {
  // Open popup or inject content script if needed
  if (tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleExtension' });
  }
});

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
    
    // Check if content script is already injected
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not injected yet, inject it
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['config.js', 'content.js']
        }).catch(error => {
          console.log('Content script injection failed:', error);
        });
      }
    });
  }
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    // Notify content scripts of setting changes
    chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'settingsChanged', 
          changes: changes 
        }).catch(() => {
          // Tab might not have content script loaded
        });
      });
    });
  }
});

console.log('Background script loaded successfully'); 