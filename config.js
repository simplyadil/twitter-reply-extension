
const CONFIG = {
  // Gemini API Configuration
  GEMINI_API_KEY: 'api key goes here',
  GEMINI_API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  
  // Default settings
  DEFAULT_MAX_SUGGESTIONS: 5,
  DEFAULT_ENABLED: true,
  
  // API settings
  API_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  
  // Prompt template
  PROMPT_TEMPLATE: `You are a helpful assistant that generates engaging, human-like Twitter reply suggestions. 
  
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
  
  // Fallback suggestions if API fails
  FALLBACK_SUGGESTIONS: [
    "Great point! Thanks for sharing this.",
    "Interesting perspective on this topic.",
    "I completely agree with you on this.",
    "This is really insightful, thanks!",
    "Love the way you put this together."
  ]
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
} 