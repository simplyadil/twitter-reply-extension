// Twitter Reply Generator Content Script
class TwitterReplyGenerator {
  constructor() {
    this.observer = null;
    this.isEnabled = true;
    this.stats = { tweetsProcessed: 0, repliesGenerated: 0 };
    this.init();
  }

  init() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleExtension') {
        this.isEnabled = request.enabled;
        if (this.isEnabled) {
          this.injectButtons();
        } else {
          this.removeAllButtons();
        }
      } else if (request.action === 'ping') {
        sendResponse({ active: true });
      } else if (request.action === 'settingsChanged') {
        // Handle settings changes if needed
        console.log('Settings changed:', request.changes);
      }
    });
  }

  setup() {
    if (this.isEnabled) {
      this.injectButtons();
      this.setupMutationObserver();
    }
  }

  setupMutationObserver() {
    // Watch for new tweets being added dynamically
    this.observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.processNewTweets(node);
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  processNewTweets(container) {
    // Look for tweet containers in the added content
    const tweetSelectors = [
      '[data-testid="tweet"]',
      '[data-testid="cellInnerDiv"]',
      'article[data-testid="tweet"]'
    ];
    
    let tweetContainers = [];
    
    tweetSelectors.forEach(selector => {
      const found = container.querySelectorAll ? 
        container.querySelectorAll(selector) : [];
      tweetContainers = tweetContainers.concat(Array.from(found));
    });
    
    if (container.matches && tweetSelectors.some(selector => container.matches(selector))) {
      tweetContainers.push(container);
    }

    tweetContainers.forEach(tweet => {
      if (!tweet.querySelector('.twitter-reply-btn')) {
        this.addReplyButton(tweet);
      }
    });
  }

  injectButtons() {
    // Find all existing tweets with multiple selectors
    const tweetSelectors = [
      '[data-testid="tweet"]',
      'article[data-testid="tweet"]'
    ];
    
    let allTweets = [];
    tweetSelectors.forEach(selector => {
      const tweets = document.querySelectorAll(selector);
      allTweets = allTweets.concat(Array.from(tweets));
    });
    
    allTweets.forEach(tweet => {
      if (!tweet.querySelector('.twitter-reply-btn')) {
        this.addReplyButton(tweet);
      }
    });
  }

  removeAllButtons() {
    const buttons = document.querySelectorAll('.twitter-reply-btn');
    buttons.forEach(btn => btn.remove());
  }

  addReplyButton(tweet) {
    // First, check if this tweet has actual text content (not just media)
    const tweetContent = this.scrapeTweetContent(tweet);
    
    // Only add button if there's actual text content
    if (!tweetContent.text || tweetContent.text.trim().length === 0) {
      console.log('Skipping tweet with no text content');
      return;
    }

    // Find the action bar (where reply, retweet, like buttons are)
    const actionBar = tweet.querySelector('[role="group"]') || 
                     tweet.querySelector('[data-testid="tweet"] [role="group"]');
    
    if (!actionBar) {
      // Try alternative selectors for action bar
      const alternativeBars = tweet.querySelectorAll('[role="group"]');
      if (alternativeBars.length > 0) {
        alternativeBars.forEach(bar => {
          if (bar.querySelector('[data-testid="reply"], [data-testid="like"]')) {
            this.insertButtonIntoBar(bar, tweet);
          }
        });
      }
      return;
    }

    this.insertButtonIntoBar(actionBar, tweet);
  }

  insertButtonIntoBar(actionBar, tweet) {
    // Create reply button
    const replyBtn = document.createElement('button');
    replyBtn.className = 'twitter-reply-btn';
    replyBtn.innerHTML = '💬';
    replyBtn.title = 'Generate reply suggestions';
    replyBtn.setAttribute('data-testid', 'reply-generator-btn');

    // Insert after the existing reply button
    const existingReplyBtn = actionBar.querySelector('[data-testid="reply"]');
    if (existingReplyBtn) {
      existingReplyBtn.parentNode.insertBefore(replyBtn, existingReplyBtn.nextSibling);
    } else {
      actionBar.appendChild(replyBtn);
    }

    // Add click handler
    replyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleReplyClick(tweet);
    });
  }

  async handleReplyClick(tweet) {
    try {
      // Show loading state
      const button = tweet.querySelector('.twitter-reply-btn');
      const originalContent = button.innerHTML;
      button.innerHTML = '⏳';
      button.style.opacity = '0.7';

      // Scrape tweet content
      const tweetContent = this.scrapeTweetContent(tweet);
      
      // Generate reply suggestions using background script
      const suggestions = await this.generateComments(tweetContent);
      
      // Update stats
      this.stats.tweetsProcessed++;
      this.stats.repliesGenerated += suggestions.length;
      this.updateStats();
      
      // Restore button
      button.innerHTML = originalContent;
      button.style.opacity = '1';
      
      // Show popup with suggestions
      this.showSuggestionsPopup(tweet, suggestions);
    } catch (error) {
      console.error('Error generating replies:', error);
      // Restore button on error
      const button = tweet.querySelector('.twitter-reply-btn');
      if (button) {
        button.innerHTML = '💬';
        button.style.opacity = '1';
      }
    }
  }

  updateStats() {
    chrome.runtime.sendMessage({
      action: 'updateStats',
      stats: this.stats
    });
  }

  scrapeTweetContent(tweet) {
    // Find the tweet text content with more specific selectors
    // Focus on the actual tweet text, not media descriptions or other content
    const textSelectors = [
      '[data-testid="tweetText"]',
      '[data-testid="tweet"] [data-testid="tweetText"]',
      'div[data-testid="tweetText"]',
      // Look for text within the main tweet content area
      '[data-testid="tweet"] div[lang]',
      // Fallback to any div with lang attribute that's not in media
      'div[lang]:not([data-testid*="media"])'
    ];
    
    let text = '';
    let textElement = null;
    
    // Try to find the main tweet text content
    for (const selector of textSelectors) {
      const element = tweet.querySelector(selector);
      if (element) {
        // Make sure this element is actually text content, not media description
        const parent = element.closest('[data-testid="tweet"]');
        if (parent) {
          // Check if this element is not inside a media container
          const mediaContainer = parent.querySelector('[data-testid*="media"]');
          if (!mediaContainer || !mediaContainer.contains(element)) {
            textElement = element;
            text = element.textContent.trim();
            break;
          }
        }
      }
    }

    // If we still don't have text, try a more targeted approach
    if (!text) {
      // Look for the main tweet content area specifically
      const tweetContent = tweet.querySelector('[data-testid="tweet"]');
      if (tweetContent) {
        // Find all text nodes that are direct children or in text containers
        const textNodes = tweetContent.querySelectorAll('div[lang], span[lang]');
        for (const node of textNodes) {
          // Skip if this is inside media or other non-text containers
          const isInMedia = node.closest('[data-testid*="media"]') || 
                           node.closest('[data-testid*="video"]') ||
                           node.closest('[data-testid*="image"]');
          
          if (!isInMedia && node.textContent.trim()) {
            text = node.textContent.trim();
            textElement = node;
            break;
          }
        }
      }
    }

    // Clean up the text - remove extra whitespace and normalize
    if (text) {
      text = text.replace(/\s+/g, ' ').trim();
    }

    // Find hashtags (only from the main text content)
    const hashtags = [];
    if (textElement) {
      const hashtagLinks = textElement.querySelectorAll('a[href^="/hashtag/"]');
      hashtags.push(...Array.from(hashtagLinks)
        .map(link => link.textContent.trim())
        .filter(tag => tag.startsWith('#')));
    }

    // Find mentions (only from the main text content)
    const mentions = [];
    if (textElement) {
      const mentionLinks = textElement.querySelectorAll('a[href^="/"]');
      mentions.push(...Array.from(mentionLinks)
        .map(link => link.textContent.trim())
        .filter(mention => mention.startsWith('@')));
    }

    // Get tweet author info
    const authorElement = tweet.querySelector('[data-testid="User-Name"]') || 
                         tweet.querySelector('a[href^="/"][role="link"]');
    const author = authorElement ? authorElement.textContent.trim() : '';

    // Log what we found for debugging
    console.log('Scraped tweet content:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      hashtags,
      mentions,
      author,
      hasText: !!text
    });

    return {
      text,
      hashtags,
      mentions,
      author,
      fullContent: `${text} ${hashtags.join(' ')} ${mentions.join(' ')}`.trim()
    };
  }

  async generateComments(tweetData) {
    // Use background script to generate replies (Gemini API or local fallback)
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'generateReplies',
        data: tweetData
      }, (response) => {
        if (response && response.success) {
          resolve(response.suggestions);
        } else {
          console.error('Failed to generate replies:', response?.error);
          // Fallback to local suggestions
          resolve(this.getFallbackSuggestions(tweetData));
        }
      });
    });
  }

  getFallbackSuggestions(tweetData) {
    // Local fallback suggestions
    const suggestions = [];
    
    if (tweetData.text.length > 0) {
      if (tweetData.text.includes('?')) {
        suggestions.push("Great question! I'd love to hear more about this.");
        suggestions.push("That's an interesting point to consider.");
      } else if (tweetData.hashtags.length > 0) {
        suggestions.push(`Love the ${tweetData.hashtags[0]} vibes!`);
        suggestions.push("Thanks for sharing this perspective.");
      } else if (tweetData.text.length < 50) {
        suggestions.push("Short and sweet! Thanks for sharing.");
        suggestions.push("Appreciate you posting this.");
      } else {
        suggestions.push("This is really insightful, thanks for sharing!");
        suggestions.push("Great point! I completely agree with you.");
      }
    }

    suggestions.push("Interesting perspective on this topic.");
    suggestions.push("Thanks for sharing this with us!");
    suggestions.push("I appreciate you bringing this up.");

    return suggestions.slice(0, 5);
  }

  showSuggestionsPopup(tweet, suggestions) {
    // Remove existing popup if any
    const existingPopup = document.querySelector('.twitter-reply-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'twitter-reply-popup';
    
    const popupContent = document.createElement('div');
    popupContent.className = 'twitter-reply-popup-content';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'twitter-reply-popup-header';
    header.innerHTML = '<h3>💬 Reply Suggestions</h3><button class="close-btn">×</button>';
    popupContent.appendChild(header);

    // Add suggestions
    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'twitter-reply-suggestions';
    
    suggestions.forEach((suggestion, index) => {
      const suggestionBtn = document.createElement('button');
      suggestionBtn.className = 'twitter-reply-suggestion';
      suggestionBtn.textContent = suggestion;
      suggestionBtn.addEventListener('click', () => {
        this.selectReply(tweet, suggestion);
        popup.remove();
      });
      suggestionsList.appendChild(suggestionBtn);
    });

    popupContent.appendChild(suggestionsList);
    popup.appendChild(popupContent);
    document.body.appendChild(popup);

    // Close button handler
    const closeBtn = popup.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => popup.remove());

    // Close on outside click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.remove();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function escapeHandler(e) {
      if (e.key === 'Escape') {
        popup.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    });

    // Let CSS handle the centering - no manual positioning needed
    console.log('Popup created and should be centered by CSS');
  }

  async selectReply(tweet, replyText) {
    try {
      console.log('=== SELECTING REPLY ===');
      console.log('Reply text:', replyText);
      
      // 1. Click the reply button to open the reply modal
      const replyButton = tweet.querySelector('[data-testid="reply"]');
      if (!replyButton) {
        console.error('❌ Reply button not found');
        return;
      }
      
      console.log('Clicking reply button...');
      replyButton.click();
      
      // 2. Copy the reply text to clipboard
      console.log('Copying text to clipboard...');
      try {
        await navigator.clipboard.writeText(replyText);
        console.log('✅ Text copied to clipboard successfully!');
        
        // Show a small notification to the user
        this.showClipboardNotification(replyText);
        
      } catch (error) {
        console.error('❌ Failed to copy to clipboard:', error);
        // Fallback: try the old clipboard API
        this.fallbackCopyToClipboard(replyText);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  showClipboardNotification(replyText) {
    // Create a small notification to let the user know the text was copied
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1d9bf0;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      word-wrap: break-word;
    `;
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">📋 Reply copied to clipboard!</div>
      <div style="font-size: 12px; opacity: 0.9;">"${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"</div>
      <div style="font-size: 11px; margin-top: 8px;">Click Ctrl+V in the reply field to paste</div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  fallbackCopyToClipboard(text) {
    // Fallback method for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log('✅ Text copied to clipboard (fallback method)!');
      this.showClipboardNotification(text);
    } catch (error) {
      console.error('❌ Fallback copy failed:', error);
    }
    
    document.body.removeChild(textArea);
  }
}

// Initialize the extension
new TwitterReplyGenerator(); 