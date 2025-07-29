# Twitter Reply Generator Chrome Extension

A Chrome extension that adds intelligent reply suggestions to Twitter (X) posts using Google's Gemini AI. Click the 💬 button next to any tweet to get context-aware reply suggestions and automatically submit them.

## Features

✅ **Core Functionality:**
- Adds a 💬 button next to each tweet on Twitter/X
- Scrapes tweet content (text, hashtags, mentions)
- Generates context-aware reply suggestions using Gemini AI
- Displays suggestions in a clean popup interface
- Auto-types and submits selected replies
- Works with dynamically loaded tweets (infinite scroll)

✅ **AI-Powered Reply Generation:**
- Powered by Google's Gemini AI
- Context-aware suggestions based on tweet content
- Question detection for appropriate responses
- Hashtag-aware replies
- Sentiment-based suggestions
- Length-appropriate responses
- Fallback to local generation if API unavailable

✅ **User Experience:**
- Minimal UI that blends with Twitter's design
- Dark mode support
- Responsive design for mobile
- Loading states and error handling
- Keyboard shortcuts (Escape to close popup)


## Installation

### Method 1: Load as Unpacked Extension

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your extensions list

### Method 2: Build from Source

```bash
# Clone the repository
git clone <repository-url>
cd twitter-reply-extension

# The extension is ready to load - no build step required
```

## Setup

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure the Extension

1. Click the extension icon in your browser
2. Enter your Gemini API key in the settings
3. Toggle "Use Gemini AI" to enable AI-powered suggestions
4. Set the number of suggestions (1-10)
5. Test the API connection

## Usage

1. **Navigate to Twitter/X**: Go to `twitter.com` or `x.com`
2. **Find the 💬 button**: Look for the blue chat bubble icon next to tweets
3. **Click to generate**: Click the 💬 button to get AI-powered reply suggestions
4. **Select a reply**: Click on any suggestion to auto-reply
5. **Customize settings**: Click the extension icon to access settings


## File Structure

```
twitter-reply-extension/
├── manifest.json          # Extension configuration
├── config.js             # Configuration and API settings
├── content.js            # Main content script
├── background.js         # Background service worker
├── popup.html           # Extension popup UI
├── popup.js             # Popup functionality
├── styles.css           # Styling for buttons and popup
└── README.md           # This file
```

## Technical Details

### Content Script (`content.js`)
- Injects 💬 buttons next to tweets
- Scrapes tweet content using multiple selectors
- Handles dynamic content loading
- Manages popup UI and reply submission

### Background Script (`background.js`)
- Handles Gemini API communication
- Manages extension settings
- Tracks usage statistics
- Provides fallback reply generation

### Popup (`popup.html` + `popup.js`)
- Extension settings interface
- Gemini API configuration
- Statistics display
- Enable/disable controls

### Styling (`styles.css`)
- Twitter-native design
- Dark mode support
- Responsive layout
- Smooth animations

## API Integration

The extension uses Google's Gemini AI API for generating reply suggestions. The API call includes:

```json
{
  "contents": [{
    "parts": [{
      "text": "You are a helpful assistant that generates engaging, human-like Twitter reply suggestions..."
    }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 500
  }
}
```

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Other Chromium-based browsers

## Privacy & Security

- **No Data Collection**: The extension doesn't collect or store personal data
- **API Key Security**: Your Gemini API key is stored locally in Chrome's sync storage
- **Local Fallback**: Works without API key using local generation
- **No Tracking**: No analytics or tracking mechanisms

## Troubleshooting

### Extension Not Working

1. **Check if enabled**: Ensure the extension is enabled in popup
2. **Refresh Twitter**: Reload the Twitter page
3. **Check console**: Open DevTools to see any error messages
4. **Reinstall**: Try removing and re-adding the extension

### Buttons Not Appearing

1. **Wait for page load**: Ensure Twitter has fully loaded
2. **Scroll down**: New tweets may need time to load
3. **Check selectors**: Twitter may have updated their DOM structure

### Gemini API Issues

1. **Verify API key**: Check your Gemini API key in settings
2. **Test connection**: Use the "Test Gemini API Connection" button
3. **Check quota**: Ensure you haven't exceeded your API quota
4. **Local mode**: Toggle off Gemini AI to use local generation

### API Key Issues

1. **Get new key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Check format**: API keys should be a long string of characters
3. **Enable API**: Ensure Gemini API is enabled in your Google Cloud project
4. **Check billing**: Some API calls may require billing setup

## Development

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension
4. Test on Twitter

### Adding Features

- **New reply types**: Modify `generateLocalReplies()` in `background.js`
- **UI changes**: Update `styles.css` and popup files
- **API integration**: Extend `callGeminiAPI()` in `background.js`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the technical documentation

---

**Note**: This extension is not affiliated with Twitter/X or Google. Use responsibly and in accordance with Twitter's Terms of Service and Google's API terms. 