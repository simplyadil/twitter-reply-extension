class SuggestionsPopupComponent {
  static currentPopup = null;

  static show(tweetElement, suggestions, errorMessage = null) {
    console.log(
      "Showing popup with suggestions:",
      suggestions,
      "error:",
      errorMessage
    );
    this.hide();

    // If we have an error message, show error popup instead of suggestions
    if (errorMessage) {
      const popup = this.createErrorPopup(tweetElement, errorMessage);
      document.body.appendChild(popup);
      this.currentPopup = popup;
      this.attachEventListeners(popup, tweetElement);
      console.log("Error popup created and attached to DOM");
      return;
    }

    if (!suggestions?.length) {
      console.warn("No suggestions provided to show popup");
      return;
    }

    const popup = this.createPopup(tweetElement, suggestions);
    document.body.appendChild(popup);
    this.currentPopup = popup;
    this.attachEventListeners(popup, tweetElement);
    console.log("Popup created and attached to DOM");
  }

  static showError(tweetElement, errorMessage) {
    this.show(tweetElement, null, errorMessage);
  }

  static hide() {
    if (this.currentPopup) {
      this.currentPopup.remove();
      this.currentPopup = null;
    }
    // Remove any remaining popups
    const existingPopups = document.querySelectorAll(
      ".suggestions-popup-overlay"
    );
    existingPopups.forEach((popup) => popup.remove());
  }

  static createPopup(tweetElement, suggestions) {
    console.log("Creating popup for suggestions:", suggestions.length);

    const popup = DOMUtils.createElement("div", {
      className: "suggestions-popup-overlay",
    });

    const content = DOMUtils.createElement("div", {
      className: "suggestions-popup-content",
    });

    content.appendChild(this.createHeader());
    content.appendChild(this.createSuggestionsList(suggestions, tweetElement));
    popup.appendChild(content);

    console.log("Popup created successfully");
    return popup;
  }

  static createHeader() {
    return DOMUtils.createElement("div", {
      className: "suggestions-popup-header",
      innerHTML: `
        <h3 class="suggestions-popup-title">
          Reply Suggestions
        </h3>
        <button class="suggestions-popup-close-btn close-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"/>
          </svg>
        </button>
      `,
    });
  }

  static createSuggestionsList(suggestions, tweetElement) {
    const list = DOMUtils.createElement("div", {
      className: "suggestions-popup-list",
    });

    suggestions.forEach((suggestion, index) => {
      const item = this.createSuggestionItem(suggestion, index, tweetElement);
      list.appendChild(item);
    });

    return list;
  }

  static createSuggestionItem(suggestion, index, tweetElement) {
    const button = DOMUtils.createElement("button", {
      className: "suggestions-popup-item",
      innerHTML: `
        <div class="suggestions-popup-number">
          ${index + 1}
        </div>
        <div class="suggestions-popup-text">
          ${TextUtils.escapeHtml(suggestion)}
        </div>
      `,
      attributes: {
        "data-suggestion": suggestion,
        "data-index": index.toString(),
      },
    });

    // Add click event listener
    button.addEventListener("click", () => {
      this.selectSuggestion(tweetElement, suggestion);
      this.hide();
    });

    return button;
  }

  static createErrorPopup(tweetElement, errorMessage) {
    console.log("Creating error popup with message:", errorMessage);

    const popup = DOMUtils.createElement("div", {
      className: "suggestions-popup-overlay",
    });

    const content = DOMUtils.createElement("div", {
      className: "suggestions-popup-content",
    });

    content.appendChild(this.createErrorHeader());
    content.appendChild(this.createErrorMessage(errorMessage));
    popup.appendChild(content);

    console.log("Error popup created successfully");
    return popup;
  }

  static createErrorHeader() {
    return DOMUtils.createElement("div", {
      className: "suggestions-popup-header",
      innerHTML: `
        <h3 class="suggestions-popup-title suggestions-popup-title-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Error Generating Replies
        </h3>
        <button class="suggestions-popup-close-btn close-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"/>
          </svg>
        </button>
      `,
    });
  }

  static createErrorMessage(errorMessage) {
    const messageContainer = DOMUtils.createElement("div", {
      className: "suggestions-popup-error-message",
      innerHTML: `
        <div class="suggestions-popup-error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div class="suggestions-popup-error-text">
          ${TextUtils.escapeHtml(errorMessage)}
        </div>
        <div class="suggestions-popup-error-hint">
          Please check your API key or try again later.
        </div>
      `,
    });

    return messageContainer;
  }

  static attachEventListeners(popup, tweetElement) {
    const closeBtn = popup.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.hide());
    }

    const suggestionItems = popup.querySelectorAll(`button[data-suggestion]`);
    suggestionItems.forEach((item) => {
      item.addEventListener("click", () => {
        const suggestion = item.getAttribute("data-suggestion");
        if (suggestion) {
          this.selectSuggestion(tweetElement, suggestion);
          this.hide();
        }
      });
    });

    popup.addEventListener("click", (e) => {
      if (e.target === popup) this.hide();
    });

    const escapeHandler = (e) => {
      if (e.key === "Escape") {
        this.hide();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }

  static async selectSuggestion(tweetElement, suggestion) {
    try {
      const replyButton = tweetElement.querySelector(
        CONSTANTS.SELECTORS.REPLY_BUTTON
      );
      if (replyButton) {
        replyButton.click();
        await this.copyToClipboard(suggestion);
      } else {
        // Fallback: just copy to clipboard if reply button not found
        await this.copyToClipboard(suggestion);
      }
    } catch (error) {
      console.error("Error selecting suggestion:", error);
      // Fallback: just copy to clipboard
      await this.copyToClipboard(suggestion);
    }
  }

  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showClipboardNotification();
    } catch (error) {
      this.fallbackCopyToClipboard(text);
    }
  }

  static fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      this.showClipboardNotification();
    } catch (error) {
      // Silent fail
    } finally {
      document.body.removeChild(textArea);
    }
  }

  static showClipboardNotification() {
    const notification = DOMUtils.createElement("div", {
      className: "suggestions-notification",
      innerHTML: `
        <div class="suggestions-notification-title">
          Reply copied to clipboard!
        </div>
        <div class="suggestions-notification-hint">Paste it in the reply field with Ctrl+V (Cmd+V on Mac)</div>
      `,
    });

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = "modalSlideIn 0.3s ease-out reverse";
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, CONSTANTS.ANIMATIONS.NOTIFICATION_DISPLAY);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SuggestionsPopupComponent;
} else {
  window.SuggestionsPopupComponent = SuggestionsPopupComponent;
}
