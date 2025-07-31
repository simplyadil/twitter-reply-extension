class ReplyButtonComponent {
  constructor() {
    this.buttonStates = new Map();
    this.initializeStyles();
  }

  initializeStyles() {
    DOMUtils.addStyles(
      "ai-button-styles",
      `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .ai-loading-spinner::before {
        content: "";
        width: 16px;
        height: 16px;
        border: 2px solid rgba(29, 155, 240, 0.3);
        border-top: 2px solid #1d9bf0;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: block;
      }
    `
    );
  }

  createReplyButton(tweetElement) {
    if (
      !tweetElement ||
      TweetScrapingService.hasReplyButton(tweetElement) ||
      !TweetScrapingService.hasValidContent(tweetElement)
    ) {
      return null;
    }

    const actionBar = TweetScrapingService.findActionBar(tweetElement);
    if (!actionBar) return null;

    const button = this.buildButton(tweetElement);
    this.insertButtonIntoActionBar(actionBar, button);
    return button;
  }

  buildButton(tweetElement) {
    const container = DOMUtils.createElement("div", {
      className: CONSTANTS.CSS_CLASSES.BUTTON_CONTAINER,
    });

    const button = DOMUtils.createElement("div", {
      className: CONSTANTS.CSS_CLASSES.REPLY_BUTTON,
      attributes: {
        role: "button",
        tabindex: "0",
        "data-testid": CONSTANTS.DATA_ATTRIBUTES.REPLY_GENERATOR_BTN,
        title: "Generate AI reply suggestions",
      },
    });

    const iconContainer = this.createIconContainer();
    button.appendChild(iconContainer);
    this.attachEventListeners(button, tweetElement);
    container.appendChild(button);
    return container;
  }

  createIconContainer() {
    return DOMUtils.createElement("div", {
      className:
        "flex items-center justify-center text-base transition-colors duration-200 ease-in-out",
      innerHTML: `<svg class="w-5 h-5" fill="currentColor" stroke="currentColor" stroke-width="3" viewBox="0 0 50 50">
        <path d="M 38.988281 2 A 1.0001 1.0001 0 0 0 38.072266 2.6269531 L 36.720703 5.9921875 C 36.221194 7.2355579 35.235557 8.221194 33.992188 8.7207031 L 30.626953 10.072266 A 1.0001 1.0001 0 0 0 30.626953 11.927734 L 33.992188 13.279297 C 35.235557 13.778806 36.221194 14.764442 36.720703 16.007812 L 38.072266 19.373047 A 1.0001 1.0001 0 0 0 39.927734 19.373047 L 41.279297 16.007812 C 41.778806 14.764442 42.764443 13.778806 44.007812 13.279297 L 47.373047 11.927734 A 1.0001 1.0001 0 0 0 47.373047 10.072266 L 44.007812 8.7207031 C 42.764443 8.221194 41.778806 7.2355579 41.279297 5.9921875 L 39.927734 2.6269531 A 1.0001 1.0001 0 0 0 38.988281 2 z M 39 5.6835938 L 39.423828 6.7382812 C 40.126319 8.4869109 41.513089 9.8736809 43.261719 10.576172 L 44.316406 11 L 43.261719 11.423828 C 41.513089 12.126319 40.126319 13.513089 39.423828 15.261719 L 39 16.316406 L 38.576172 15.261719 C 37.873681 13.513089 36.486911 12.126319 34.738281 11.423828 L 33.683594 11 L 34.738281 10.576172 C 36.486911 9.8736809 37.873681 8.4869109 38.576172 6.7382812 L 39 5.6835938 z M 21 10.076172 C 20.287853 10.076432 19.530349 10.524462 19.236328 11.287109 L 16.529297 18.308594 C 15.426681 21.168619 13.168619 23.428634 10.308594 24.53125 L 3.2851562 27.238281 C 2.5221924 27.531806 2.0761719 28.288086 2.0761719 29 C 2.0761719 29.711914 2.5227006 30.469338 3.2851562 30.763672 L 10.308594 33.46875 C 13.168619 34.571366 15.428634 36.831381 16.53125 39.691406 L 19.238281 46.712891 C 19.531806 47.475855 20.288086 47.923828 21 47.923828 C 21.711914 47.923828 22.469338 47.477299 22.763672 46.714844 A 1.0001 1.0001 0 0 0 22.763672 46.712891 L 25.470703 39.691406 C 26.573319 36.831381 28.831381 34.571366 31.691406 33.46875 L 38.714844 30.761719 C 39.477808 30.468241 39.923828 29.711914 39.923828 29 C 39.923828 28.288086 39.477299 27.530662 38.714844 27.236328 L 31.691406 24.529297 C 28.831381 23.426681 26.573319 21.168619 25.470703 18.308594 L 22.763672 11.285156 C 22.469338 10.522701 21.712147 10.075911 21 10.076172 z M 21 12.273438 L 23.603516 19.027344 C 24.908899 22.413319 27.586681 25.091101 30.972656 26.396484 L 37.726562 29 L 30.972656 31.603516 C 27.586681 32.908899 24.908899 35.584728 23.603516 38.970703 L 21 45.724609 L 18.396484 38.970703 C 17.091101 35.584728 14.415272 32.908899 11.029297 31.603516 L 4.2734375 29 L 11.027344 26.396484 C 14.413319 25.091101 17.091101 22.415272 18.396484 19.029297 L 21 12.273438 z"/>
      </svg>`,
    });
  }

  attachEventListeners(button, tweetElement) {
    const handleClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.handleButtonClick(button, tweetElement);
    };

    button.addEventListener("click", handleClick);
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick(event);
      }
    });
  }

  insertButtonIntoActionBar(actionBar, buttonContainer) {
    const existingReplyBtn = actionBar.querySelector(
      CONSTANTS.SELECTORS.REPLY_BUTTON
    );

    if (existingReplyBtn) {
      // Insert directly after the existing reply button
      existingReplyBtn.parentNode.insertBefore(
        buttonContainer,
        existingReplyBtn.nextSibling
      );
    } else {
      actionBar.appendChild(buttonContainer);
    }
  }

  async handleButtonClick(button, tweetElement) {
    try {
      if (this.isButtonInLoadingState(button)) return;

      this.setButtonState(button, "loading");
      const tweetContent =
        TweetScrapingService.scrapeTweetContent(tweetElement);

      console.log("Scraped tweet content:", tweetContent);

      const suggestions = await AIReplyService.generateReplies(tweetContent);

      console.log("Generated suggestions:", suggestions);

      if (!suggestions || suggestions.length === 0) {
        throw new Error("No suggestions generated");
      }

      this.setButtonState(button, "success");
      SuggestionsPopupComponent.show(tweetElement, suggestions);

      setTimeout(
        () => this.setButtonState(button, "normal"),
        CONSTANTS.ANIMATIONS.SUCCESS_DISPLAY
      );
    } catch (error) {
      console.error("Error in handleButtonClick:", error);
      this.setButtonState(button, "error");

      // Show error popup instead of just error state
      const errorMessage =
        error.message || "Failed to generate reply suggestions";
      SuggestionsPopupComponent.showError(tweetElement, errorMessage);

      setTimeout(
        () => this.setButtonState(button, "normal"),
        CONSTANTS.ANIMATIONS.ERROR_DISPLAY
      );
    }
  }

  setButtonState(button, state) {
    const iconContainer = button.querySelector("div");
    if (!iconContainer) return;

    button.classList.remove(
      CONSTANTS.CSS_CLASSES.AI_GENERATING,
      "bg-green-50",
      "text-green-600",
      "dark:bg-green-950",
      "dark:text-green-400",
      "bg-red-50",
      "text-red-600",
      "dark:bg-red-950",
      "dark:text-red-400"
    );

    const states = {
      loading: {
        icon: `<div class="ai-loading-spinner"></div>`,
        classes: [CONSTANTS.CSS_CLASSES.AI_GENERATING],
        title: "AI is generating replies...",
      },
      success: {
        icon: this.getSuccessIcon(),
        classes: [
          "bg-green-50",
          "text-green-600",
          "dark:bg-green-950",
          "dark:text-green-400",
        ],
        title: "AI replies generated successfully!",
      },
      error: {
        icon: this.getErrorIcon(),
        classes: [
          "bg-red-50",
          "text-red-600",
          "dark:bg-red-950",
          "dark:text-red-400",
        ],
        title: "Failed to generate replies. Click to try again.",
      },
      normal: {
        icon: `<svg class="w-5 h-5" fill="currentColor" stroke="currentColor" stroke-width="3" viewBox="0 0 50 50">
          <path d="M 38.988281 2 A 1.0001 1.0001 0 0 0 38.072266 2.6269531 L 36.720703 5.9921875 C 36.221194 7.2355579 35.235557 8.221194 33.992188 8.7207031 L 30.626953 10.072266 A 1.0001 1.0001 0 0 0 30.626953 11.927734 L 33.992188 13.279297 C 35.235557 13.778806 36.221194 14.764442 36.720703 16.007812 L 38.072266 19.373047 A 1.0001 1.0001 0 0 0 39.927734 19.373047 L 41.279297 16.007812 C 41.778806 14.764442 42.764443 13.778806 44.007812 13.279297 L 47.373047 11.927734 A 1.0001 1.0001 0 0 0 47.373047 10.072266 L 44.007812 8.7207031 C 42.764443 8.221194 41.778806 7.2355579 41.279297 5.9921875 L 39.927734 2.6269531 A 1.0001 1.0001 0 0 0 38.988281 2 z M 39 5.6835938 L 39.423828 6.7382812 C 40.126319 8.4869109 41.513089 9.8736809 43.261719 10.576172 L 44.316406 11 L 43.261719 11.423828 C 41.513089 12.126319 40.126319 13.513089 39.423828 15.261719 L 39 16.316406 L 38.576172 15.261719 C 37.873681 13.513089 36.486911 12.126319 34.738281 11.423828 L 33.683594 11 L 34.738281 10.576172 C 36.486911 9.8736809 37.873681 8.4869109 38.576172 6.7382812 L 39 5.6835938 z M 21 10.076172 C 20.287853 10.076432 19.530349 10.524462 19.236328 11.287109 L 16.529297 18.308594 C 15.426681 21.168619 13.168619 23.428634 10.308594 24.53125 L 3.2851562 27.238281 C 2.5221924 27.531806 2.0761719 28.288086 2.0761719 29 C 2.0761719 29.711914 2.5227006 30.469338 3.2851562 30.763672 L 10.308594 33.46875 C 13.168619 34.571366 15.428634 36.831381 16.53125 39.691406 L 19.238281 46.712891 C 19.531806 47.475855 20.288086 47.923828 21 47.923828 C 21.711914 47.923828 22.469338 47.477299 22.763672 46.714844 A 1.0001 1.0001 0 0 0 22.763672 46.712891 L 25.470703 39.691406 C 26.573319 36.831381 28.831381 34.571366 31.691406 33.46875 L 38.714844 30.761719 C 39.477808 30.468241 39.923828 29.711914 39.923828 29 C 39.923828 28.288086 39.477299 27.530662 38.714844 27.236328 L 31.691406 24.529297 C 28.831381 23.426681 26.573319 21.168619 25.470703 18.308594 L 22.763672 11.285156 C 22.469338 10.522701 21.712147 10.075911 21 10.076172 z M 21 12.273438 L 23.603516 19.027344 C 24.908899 22.413319 27.586681 25.091101 30.972656 26.396484 L 37.726562 29 L 30.972656 31.603516 C 27.586681 32.908899 24.908899 35.584728 23.603516 38.970703 L 21 45.724609 L 18.396484 38.970703 C 17.091101 35.584728 14.415272 32.908899 11.029297 31.603516 L 4.2734375 29 L 11.027344 26.396484 C 14.413319 25.091101 17.091101 22.415272 18.396484 19.029297 L 21 12.273438 z"/>
        </svg>`,
        classes: [],
        title: "Generate AI reply suggestions",
      },
    };

    const stateConfig = states[state] || states.normal;
    iconContainer.innerHTML = stateConfig.icon;
    button.classList.add(...stateConfig.classes);
    button.title = stateConfig.title;
    this.buttonStates.set(button, state);
  }

  isButtonInLoadingState(button) {
    return this.buttonStates.get(button) === "loading";
  }

  getSuccessIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" style="width: 18.75px; height: 18.75px;">
      <g><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></g>
    </svg>`;
  }

  getErrorIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" style="width: 18.75px; height: 18.75px;">
      <g><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></g>
    </svg>`;
  }

  removeAllButtons() {
    // Remove all buttons with our data-testid
    const buttons = document.querySelectorAll(
      `[data-testid="${CONSTANTS.DATA_ATTRIBUTES.REPLY_GENERATOR_BTN}"]`
    );
    console.log(`Removing ${buttons.length} reply buttons`);

    buttons.forEach((button) => {
      // Remove the button and its container
      const container = button.closest(
        `.${CONSTANTS.CSS_CLASSES.BUTTON_CONTAINER}`
      );
      if (container) {
        container.remove();
      } else {
        button.remove();
      }
    });

    // Also remove by CSS class as fallback
    const buttonContainers = document.querySelectorAll(
      `.${CONSTANTS.CSS_CLASSES.BUTTON_CONTAINER}`
    );
    buttonContainers.forEach((container) => {
      if (
        container.querySelector(
          `[data-testid="${CONSTANTS.DATA_ATTRIBUTES.REPLY_GENERATOR_BTN}"]`
        )
      ) {
        container.remove();
      }
    });

    // Clear button states
    this.buttonStates.clear();

    // Verify removal
    const remainingButtons = document.querySelectorAll(
      `[data-testid="${CONSTANTS.DATA_ATTRIBUTES.REPLY_GENERATOR_BTN}"]`
    );
    if (remainingButtons.length > 0) {
      console.warn(
        `Warning: ${remainingButtons.length} buttons still remain after removal`
      );
    }
  }

  hasButtons() {
    const buttons = document.querySelectorAll(
      `[data-testid="${CONSTANTS.DATA_ATTRIBUTES.REPLY_GENERATOR_BTN}"]`
    );
    return buttons.length > 0;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ReplyButtonComponent;
} else {
  window.ReplyButtonComponent = ReplyButtonComponent;
}
