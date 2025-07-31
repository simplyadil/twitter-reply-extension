class PopupController {
  constructor() {
    this.elements = {};
    this.currentSettings = {};
    this.isInitialized = false;
    this.apiKeyValidationTimeout = null;
    this.errorHideTimeout = null;
    this.init();
  }

  async init() {
    if (this.isInitialized) return;

    try {
      this.cacheElements();
      this.attachEventListeners();
      await this.loadSettings();
      await this.loadStats();
      this.initializeToggleState();
      await this.performComprehensiveStatusCheck();
      // Remove periodic status checks - only check on changes
      this.isInitialized = true;

      // Add cleanup when popup window closes
      window.addEventListener("beforeunload", () => {
        this.destroy();
      });

      // Remove visibility change listener since we're not doing periodic checks
    } catch (error) {
      // Silent fail - no toast needed
    }
  }

  cacheElements() {
    this.elements = {
      statusText: document.getElementById("status-text"),
      statusIndicator: document.getElementById("status-indicator"),
      statusDetails: document.getElementById("status-details"),
      tabStatus: document.getElementById("tab-status"),
      apiStatus: document.getElementById("api-status"),
      extensionStatus: document.getElementById("extension-status"),
      refreshStatus: document.getElementById("refresh-status"),
      enabledToggle: document.getElementById("enabled-toggle"),
      enabledContainer: document.getElementById("enabled-toggle-container"),
      apiKey: document.getElementById("api-key"),
      apiKeyLabel: document.getElementById("api-key-label"),
      apiKeyLink: document.getElementById("api-key-link"),
      apiKeyError: document.getElementById("api-key-error"),
      apiKeyErrorMessage: document.getElementById("api-key-error-message"),
      apiKeyErrorClose: document.getElementById("api-key-error-close"),
      aiProvider: document.getElementById("ai-provider"),
      maxSuggestions: document.getElementById("max-suggestions"),
      tweetsProcessedCount: document.getElementById("tweets-processed-count"),
      repliesGeneratedCount: document.getElementById("replies-generated-count"),
      apiKeyStatus: document.getElementById("api-key-status"),
      togglePasswordButton: document.getElementById(
        "toggle-password-visibility"
      ),
      eyeIcon: document.getElementById("eye-icon"),
      eyeOffIcon: document.getElementById("eye-off-icon"),
    };
  }

  attachEventListeners() {
    if (this.elements.enabledToggle) {
      this.elements.enabledToggle.addEventListener(
        "change",
        this.handleToggleChange.bind(this)
      );
    }

    if (this.elements.togglePasswordButton) {
      this.elements.togglePasswordButton.addEventListener(
        "click",
        this.togglePasswordVisibility.bind(this)
      );
    }

    const autoSaveElements = [
      this.elements.apiKey,
      this.elements.aiProvider,
      this.elements.maxSuggestions,
    ];
    autoSaveElements.forEach((element) => {
      if (element) {
        element.addEventListener("change", this.handleSettingChange.bind(this));
        element.addEventListener(
          "input",
          this.debounce(this.handleSettingChange.bind(this), 500)
        );
      }
    });

    if (this.elements.apiKey) {
      this.elements.apiKey.addEventListener("input", () =>
        this.handleApiKeyInput()
      );
    }

    if (this.elements.aiProvider) {
      this.elements.aiProvider.addEventListener("change", () =>
        this.handleAiProviderChange()
      );
    }

    if (this.elements.refreshStatus) {
      this.elements.refreshStatus.addEventListener("click", () => {
        // Force a full status check when manually refreshing
        this.forceFullStatusCheck();
      });
    }

    if (this.elements.apiKeyErrorClose) {
      this.elements.apiKeyErrorClose.addEventListener("click", () => {
        this.hideApiKeyError();
      });
    }
  }

  async loadSettings() {
    try {
      const response = await this.sendMessage({
        action: CONSTANTS.MESSAGES.ACTIONS.GET_SETTINGS,
      });
      if (response.success) {
        this.currentSettings = response.settings || {};
        this.updateUI();
      }
    } catch (error) {
      // Silent fail
    }
  }

  async loadStats() {
    try {
      const stats = this.currentSettings.stats || {
        tweetsProcessed: 0,
        repliesGenerated: 0,
      };
      if (this.elements.tweetsProcessedCount) {
        this.elements.tweetsProcessedCount.textContent =
          stats.tweetsProcessed.toString();
      }
      if (this.elements.repliesGeneratedCount) {
        this.elements.repliesGeneratedCount.textContent =
          stats.repliesGenerated.toString();
      }
    } catch (error) {
      // Silent fail
    }
  }

  async forceFullStatusCheck() {
    // Perform a full status check with visual feedback
    this.updateStatus("checking", "Checking...");
    this.updateDetailedStatus("checking");

    await this.performComprehensiveStatusCheck();
  }

  async performComprehensiveStatusCheck() {
    try {
      // Always show checking status since we're not doing periodic checks
      this.updateStatus("checking", "Checking...");
      this.updateDetailedStatus("checking");

      const statusChecks = await Promise.allSettled([
        this.checkCurrentTab(),
        this.checkExtensionEnabled(),
        this.checkApiKeyStatus(),
        this.checkContentScriptStatus(),
      ]);

      const results = statusChecks.map((check) =>
        check.status === "fulfilled"
          ? check.value
          : { success: false, error: check.reason?.message || "Unknown error" }
      );

      this.updateTabStatus(results[0]);
      this.updateApiStatus(results[2]);
      this.updateExtensionStatus(results[3]);

      const overallStatus = this.determineOverallStatus(results);
      this.updateStatus(overallStatus.status, overallStatus.message);
    } catch (error) {
      this.updateStatus("error", "Status check failed");
    }
  }

  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab) return { success: false, error: "No active tab found" };

      const isTwitterTab =
        tab.url &&
        (tab.url.includes("twitter.com") || tab.url.includes("x.com"));
      return { success: true, isTwitterTab, url: tab.url, tabId: tab.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkExtensionEnabled() {
    return { success: true, enabled: this.currentSettings.enabled !== false };
  }

  async checkApiKeyStatus() {
    try {
      const provider =
        this.currentSettings.aiProvider || CONSTANTS.DEFAULTS.AI_PROVIDER;
      let apiKey = "";
      let hasValidKey = false;
      let errorMessage = null;

      if (provider === CONSTANTS.DEFAULTS.AI_PROVIDER) {
        apiKey = this.currentSettings.geminiApiKey;
        if (apiKey?.trim()) {
          const response = await this.sendMessage({
            action: CONSTANTS.MESSAGES.ACTIONS.TEST_GEMINI_API,
            apiKey: apiKey,
          });
          hasValidKey = response.success;
          if (!response.success) {
            errorMessage = response.error;
          }
        }
      } else if (provider === "openai") {
        apiKey = this.currentSettings.openaiApiKey;
        if (apiKey?.trim()) {
          const response = await this.sendMessage({
            action: CONSTANTS.MESSAGES.ACTIONS.TEST_OPENAI_API,
            apiKey: apiKey,
          });
          hasValidKey = response.success;
          if (!response.success) {
            errorMessage = response.error;
          }
        }
      }

      return {
        success: true,
        hasApiKey: !!apiKey?.trim(),
        isValid: hasValidKey,
        provider: provider,
        errorMessage: errorMessage,
      };
    } catch (error) {
      return {
        success: false,
        hasApiKey: false,
        isValid: false,
        error: error.message,
      };
    }
  }

  async checkContentScriptStatus() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (
        !tab ||
        (!tab.url.includes("twitter.com") && !tab.url.includes("x.com"))
      ) {
        return {
          success: false,
          error: "Not on Twitter/X page",
          contentScriptActive: false,
        };
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: CONSTANTS.MESSAGES.ACTIONS.PING,
        });
        return {
          success: true,
          contentScriptActive: response?.active,
          enabled: response?.enabled,
        };
      } catch (error) {
        return {
          success: false,
          error: "Content script not responding",
          contentScriptActive: false,
        };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  determineOverallStatus(results) {
    const [tabCheck, enabledCheck, apiKeyCheck, contentScriptCheck] = results;

    if (!tabCheck.success || !tabCheck.isTwitterTab) {
      return {
        status: "warning",
        message: "Extension only works on Twitter/X pages",
      };
    }

    if (!enabledCheck.success || !enabledCheck.enabled) {
      return { status: "inactive", message: "Extension is disabled" };
    }

    if (!apiKeyCheck.success || !apiKeyCheck.hasApiKey) {
      return { status: "warning", message: "Please enter your API key" };
    }

    if (!apiKeyCheck.isValid) {
      const errorMessage = apiKeyCheck.errorMessage || "Invalid API key";
      return { status: "error", message: errorMessage };
    }

    if (
      !contentScriptCheck.success ||
      !contentScriptCheck.contentScriptActive
    ) {
      return {
        status: "loading",
        message: "Loading extension on this page...",
      };
    }

    if (!contentScriptCheck.enabled) {
      return { status: "inactive", message: "Extension disabled on this page" };
    }

    return { status: "active", message: "Extension is ready to use" };
  }

  // Remove periodic status check methods - no longer needed

  showApiKeyError(message) {
    if (!this.elements.apiKeyError || !this.elements.apiKeyErrorMessage) return;

    // Format and truncate the error message
    const formattedMessage = this.formatErrorMessage(message);

    this.elements.apiKeyErrorMessage.textContent = formattedMessage;

    // Clear any existing timeouts
    if (this.errorHideTimeout) {
      clearTimeout(this.errorHideTimeout);
    }

    // Simply remove hidden class - no complex animations for now
    this.elements.apiKeyError.classList.remove("hidden");

    // Auto-hide after 10 seconds
    this.errorHideTimeout = setTimeout(() => {
      this.hideApiKeyError();
    }, CONSTANTS.ANIMATIONS.NOTIFICATION_DISPLAY);
  }

  hideApiKeyError() {
    if (!this.elements.apiKeyError) return;

    // Clear any existing timeouts
    if (this.errorHideTimeout) {
      clearTimeout(this.errorHideTimeout);
      this.errorHideTimeout = null;
    }

    // Simply add hidden class
    this.elements.apiKeyError.classList.add("hidden");
  }

  formatErrorMessage(message) {
    if (!message) return "Unknown error occurred";

    // Clean up common API error messages
    let formatted = message.trim();

    // Remove common prefixes
    formatted = formatted.replace(
      /^(API error|Error|Gemini API error|OpenAI API error):\s*/i,
      ""
    );

    // Truncate very long messages
    if (formatted.length > 200) {
      formatted = formatted.substring(0, 200) + "...";
    }

    // Capitalize first letter
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    return formatted;
  }

  handleApiKeyInput() {
    const provider =
      this.currentSettings.aiProvider || CONSTANTS.DEFAULTS.AI_PROVIDER;
    const currentApiKey = this.getCurrentApiKey();
    const inputField = this.elements.apiKey;

    if (this.apiKeyValidationTimeout) {
      clearTimeout(this.apiKeyValidationTimeout);
    }

    this.apiKeyValidationTimeout = setTimeout(async () => {
      const newApiKey = inputField.value;
      if (newApiKey !== currentApiKey) {
        await this.validateApiKey(newApiKey, provider);
      }
    }, 1000);
  }

  getCurrentApiKey() {
    const provider =
      this.currentSettings.aiProvider || CONSTANTS.DEFAULTS.AI_PROVIDER;
    return provider === CONSTANTS.DEFAULTS.AI_PROVIDER
      ? this.currentSettings.geminiApiKey
      : this.currentSettings.openaiApiKey;
  }

  handleAiProviderChange() {
    const provider = this.elements.aiProvider.value;

    // Clear any existing error messages
    this.hideApiKeyError();

    // Update the API key field label and placeholder
    if (provider === CONSTANTS.DEFAULTS.AI_PROVIDER) {
      this.elements.apiKeyLabel.textContent = "Gemini API Key";
      this.elements.apiKey.placeholder = "Enter your Gemini API key";
      this.elements.apiKeyLink.textContent = "Google AI Studio";
      this.elements.apiKeyLink.href = "https://aistudio.google.com/app/apikey";
    } else {
      this.elements.apiKeyLabel.textContent = "OpenAI API Key";
      this.elements.apiKey.placeholder = "Enter your OpenAI API key";
      this.elements.apiKeyLink.textContent = "OpenAI Platform";
      this.elements.apiKeyLink.href = "https://platform.openai.com/api-keys";
    }

    // Update the API key field value based on the selected provider
    const newApiKey =
      provider === CONSTANTS.DEFAULTS.AI_PROVIDER
        ? this.currentSettings.geminiApiKey || ""
        : this.currentSettings.openaiApiKey || "";

    this.elements.apiKey.value = newApiKey;
    // Don't call updateApiKeyVisualState here as it might hide error messages
    // The status will be updated when the user interacts with the API key field
  }

  updateApiKeyVisualState(apiKey, status = null, errorMessage = null) {
    const inputField = this.elements.apiKey;
    const statusIndicator = this.elements.apiKeyStatus;

    // Reset all classes
    inputField.classList.remove(
      "border-green-500",
      "border-red-500",
      "border-blue-500",
      "shadow-green-500/10",
      "shadow-red-500/10",
      "shadow-blue-500/10"
    );

    // Clear any existing title
    inputField.removeAttribute("title");

    if (!apiKey || apiKey.trim().length === 0) {
      statusIndicator.innerHTML = "";
      this.hideApiKeyError(); // Hide error when no API key
      return;
    }

    // If no status is provided, don't change the error state
    if (status === null) {
      return;
    }

    if (status === "validating") {
      inputField.classList.add("border-blue-500", "shadow-blue-500/10");
      statusIndicator.innerHTML = `
        <svg class="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      `;
      this.hideApiKeyError(); // Hide error while validating
    } else if (status === "valid") {
      inputField.classList.add("border-green-500", "shadow-green-500/10");
      statusIndicator.innerHTML = `
        <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `;
      this.hideApiKeyError(); // Hide error when valid
    } else if (status === "invalid" || status === "error") {
      inputField.classList.add("border-red-500", "shadow-red-500/10");
      statusIndicator.innerHTML = `
        <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `;

      // Show error message in the dedicated error display
      if (errorMessage) {
        this.showApiKeyError(errorMessage);
        // Also add tooltip for quick reference
        inputField.setAttribute("title", this.formatErrorMessage(errorMessage));
      } else {
        this.hideApiKeyError();
      }
    }
  }

  togglePasswordVisibility() {
    const isPassword = this.elements.apiKey.type === "password";
    this.elements.apiKey.type = isPassword ? "text" : "password";

    if (isPassword) {
      this.elements.eyeIcon.classList.add("hidden");
      this.elements.eyeOffIcon.classList.remove("hidden");
    } else {
      this.elements.eyeIcon.classList.remove("hidden");
      this.elements.eyeOffIcon.classList.add("hidden");
    }
  }

  async validateApiKey(apiKey, provider) {
    if (!apiKey?.trim()) {
      this.updateApiKeyVisualState("");
      return;
    }

    try {
      this.updateApiKeyVisualState(apiKey, "validating");

      const action =
        provider === CONSTANTS.DEFAULTS.AI_PROVIDER
          ? CONSTANTS.MESSAGES.ACTIONS.TEST_GEMINI_API
          : CONSTANTS.MESSAGES.ACTIONS.TEST_OPENAI_API;
      const response = await this.sendMessage({
        action: action,
        apiKey: apiKey,
      });

      if (response.success) {
        this.updateApiKeyVisualState(apiKey, "valid");
        this.updateApiKeyStatus("valid");
      } else {
        this.updateApiKeyVisualState(apiKey, "invalid", response.error);
        this.updateApiKeyStatus("invalid", response.error);
      }
    } catch (error) {
      this.updateApiKeyVisualState(apiKey, "error", error.message);
      this.updateApiKeyStatus("error", error.message);
    }
  }

  updateUI() {
    if (this.elements.enabledToggle) {
      this.elements.enabledToggle.checked =
        this.currentSettings.enabled !== false;
    }

    if (this.elements.maxSuggestions) {
      this.elements.maxSuggestions.value =
        this.currentSettings.maxSuggestions ||
        CONSTANTS.DEFAULTS.MAX_SUGGESTIONS;
    }

    if (this.elements.aiProvider) {
      this.elements.aiProvider.value =
        this.currentSettings.aiProvider || CONSTANTS.DEFAULTS.AI_PROVIDER;
      this.handleAiProviderChange(); // This will update the API key field and UI
    }

    if (this.elements.apiKey) {
      const currentApiKey = this.getCurrentApiKey();
      this.elements.apiKey.value = currentApiKey || "";
      // Don't call updateApiKeyVisualState here as it might hide error messages
      // The status will be updated when the user interacts with the API key field
    }
  }

  async handleToggleChange() {
    const enabled = this.elements.enabledToggle.checked;

    try {
      this.updateToggleState();
      this.currentSettings.enabled = enabled;

      const response = await this.sendMessage({
        action: CONSTANTS.MESSAGES.ACTIONS.SAVE_SETTINGS,
        settings: { enabled },
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to save toggle state");
      }

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (
        tab &&
        (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
      ) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: CONSTANTS.MESSAGES.ACTIONS.TOGGLE_EXTENSION,
            enabled,
          });
        } catch (error) {
          // Content script not ready yet
        }
      }

      // Trigger status check when toggle changes
      await this.performComprehensiveStatusCheck();
    } catch (error) {
      this.elements.enabledToggle.checked = !enabled;
      this.updateToggleState();
    }
  }

  async handleSettingChange(event) {
    const element = event.target;
    const setting = {};
    let shouldCheckStatus = false;

    if (element === this.elements.apiKey) {
      let provider = this.currentSettings.aiProvider;
      
      if (!provider) {
        if (this.elements.apiKeyLabel.textContent.toLowerCase().includes("gemini")) {
          provider = "gemini";
        } else {
          provider = "openai";
        }
        setting.aiProvider = provider;
      }
      if (provider === CONSTANTS.DEFAULTS.AI_PROVIDER) {
        setting.geminiApiKey = element.value;
      } else {
        setting.openaiApiKey = element.value;
      }
      shouldCheckStatus = true; // API key change should trigger status check
    } else if (element === this.elements.aiProvider) {
      setting.aiProvider = element.value;
      this.handleAiProviderChange(); // Update UI immediately
      shouldCheckStatus = true; // Provider change should trigger status check
    } else if (element === this.elements.maxSuggestions) {
      setting.maxSuggestions = parseInt(element.value, 10);
      // No status check needed for max suggestions change
    }

    if (Object.keys(setting).length > 0) {
      try {
        await this.sendMessage({
          action: CONSTANTS.MESSAGES.ACTIONS.SAVE_SETTINGS,
          settings: setting,
        });
        Object.assign(this.currentSettings, setting);

        // Trigger status check if needed
        if (shouldCheckStatus) {
          await this.performComprehensiveStatusCheck();
        }
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    }
  }

  updateToggleState() {
    const enabled = this.elements.enabledToggle?.checked !== false;
    const container = this.elements.enabledContainer;

    if (container) {
      if (enabled) {
        container.classList.add("active");
      } else {
        container.classList.remove("active");
      }
    }
  }

  initializeToggleState() {
    if (this.elements.enabledToggle && this.elements.enabledContainer) {
      this.updateToggleState();
      setTimeout(
        () => this.updateToggleState(),
        CONSTANTS.ANIMATIONS.BUTTON_STATE_CHANGE
      ); // Faster initialization
    }
  }

  updateApiKeyStatus(status = null) {
    if (!this.elements.apiKeyStatus) return;

    const statusElement = this.elements.apiKeyStatus;
    statusElement.className =
      "w-4 h-4 flex items-center justify-center transition-all duration-200 ease-in-out"; // Faster transitions
    statusElement.classList.remove("hidden");

    if (!status) {
      const hasKey = this.elements.apiKey?.value?.length > 0;
      if (hasKey) {
        status = "connected";
      } else {
        statusElement.classList.add("hidden");
        statusElement.innerHTML = "";
        return;
      }
    }

    statusElement.classList.remove(
      "text-blue-500",
      "text-green-500",
      "text-red-500"
    );

    const statusConfigs = {
      testing: {
        class: "text-blue-500",
        icon: '<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>',
      },
      connected: {
        class: "text-green-500",
        icon: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>',
      },
      error: {
        class: "text-red-500",
        icon: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>',
      },
    };

    const config = statusConfigs[status];
    if (config) {
      statusElement.classList.add(config.class);
      statusElement.innerHTML = config.icon;
    } else {
      statusElement.classList.add("hidden");
      statusElement.innerHTML = "";
    }
  }

  updateStatus(status, message) {
    if (this.elements.statusText) {
      this.elements.statusText.textContent = message;
      this.elements.statusText.classList.remove(
        "text-green-500",
        "text-red-500",
        "text-yellow-500",
        "text-blue-500",
        "text-gray-500"
      );

      const statusColors = {
        active: "text-green-500",
        error: "text-red-500",
        warning: "text-yellow-500",
        loading: "text-blue-500",
        checking: "text-blue-500",
        inactive: "text-gray-500",
      };

      this.elements.statusText.classList.add(
        statusColors[status] || "text-gray-500"
      );
    }

    if (this.elements.statusIndicator) {
      this.elements.statusIndicator.classList.remove(
        "bg-green-500",
        "bg-red-500",
        "bg-yellow-500",
        "bg-blue-500",
        "bg-gray-500",
        "animate-spin",
        "animate-pulse",
        "shadow-lg"
      );

      const statusConfigs = {
        active: ["bg-green-500", "shadow-lg", "shadow-green-500/20"],
        error: ["bg-red-500", "shadow-lg", "shadow-red-500/20"],
        warning: ["bg-yellow-500", "shadow-lg", "shadow-yellow-500/20"],
        loading: ["bg-blue-500", "animate-spin"],
        checking: ["bg-blue-500", "animate-pulse"],
        inactive: ["bg-gray-500"],
      };

      const config = statusConfigs[status] || ["bg-gray-500"];
      this.elements.statusIndicator.classList.add(...config);
    }
  }

  updateDetailedStatus(status) {
    if (this.elements.statusDetails) {
      this.elements.statusDetails.style.display =
        status === "checking" ? "block" : "block";
    }
  }

  updateTabStatus(result) {
    if (!this.elements.tabStatus) return;

    const indicator = this.elements.tabStatus.querySelector("span:first-child");
    const text = this.elements.tabStatus.querySelector("span:last-child");

    indicator.classList.remove(
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-gray-300"
    );

    if (result.success && result.isTwitterTab) {
      indicator.classList.add("bg-green-500");
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg> On Twitter/X page`;
    } else if (result.success && !result.isTwitterTab) {
      indicator.classList.add("bg-yellow-500");
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg> Not on Twitter/X page`;
    } else {
      indicator.classList.add("bg-red-500");
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg> ${result.error || "Unknown error"}`;
    }
  }

  updateApiStatus(result) {
    if (!this.elements.apiStatus) return;

    const indicator = this.elements.apiStatus.querySelector("span:first-child");
    const text = this.elements.apiStatus.querySelector("span:last-child");

    indicator.classList.remove(
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-gray-300"
    );

    if (result.success && result.hasApiKey && result.isValid) {
      indicator.classList.add("bg-green-500");
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg> API key is valid`;
    } else if (result.success && result.hasApiKey && !result.isValid) {
      indicator.classList.add("bg-red-500");
      const errorMessage = result.errorMessage || "API key is invalid";
      const formattedError = this.formatErrorMessage(errorMessage);
      // Truncate for status display
      const displayError =
        formattedError.length > 50
          ? formattedError.substring(0, 50) + "..."
          : formattedError;
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg> ${displayError}`;
    } else if (result.success && !result.hasApiKey) {
      indicator.classList.add("bg-yellow-500");
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg> No API key provided`;
    } else {
      indicator.classList.add("bg-red-500");
      const errorMessage = result.error || "Unknown error";
      const formattedError = this.formatErrorMessage(errorMessage);
      const displayError =
        formattedError.length > 50
          ? formattedError.substring(0, 50) + "..."
          : formattedError;
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg> ${displayError}`;
    }
  }

  updateExtensionStatus(result) {
    if (!this.elements.extensionStatus) return;

    const indicator =
      this.elements.extensionStatus.querySelector("span:first-child");
    const text = this.elements.extensionStatus.querySelector("span:last-child");

    indicator.classList.remove(
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-gray-300"
    );

    if (result.success && result.contentScriptActive && result.enabled) {
      indicator.classList.add("bg-green-500");
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg> Extension is active`;
    } else if (
      result.success &&
      result.contentScriptActive &&
      !result.enabled
    ) {
      indicator.classList.add("bg-yellow-500");
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg> Extension is disabled`;
    } else if (result.success && !result.contentScriptActive) {
      indicator.classList.add("bg-yellow-500");
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg> Extension not loaded`;
    } else {
      indicator.classList.add("bg-red-500");
      text.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg> ${result.error || "Unknown error"}`;
    }
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response || { success: false, error: "No response" });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  destroy() {
    if (this.apiKeyValidationTimeout) {
      clearTimeout(this.apiKeyValidationTimeout);
      this.apiKeyValidationTimeout = null;
    }
    if (this.errorHideTimeout) {
      clearTimeout(this.errorHideTimeout);
      this.errorHideTimeout = null;
    }
    this.isInitialized = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Prevent multiple instances
  if (window.popupController) {
    window.popupController.destroy();
  }
  window.popupController = new PopupController();
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = PopupController;
} else {
  window.PopupController = PopupController;
}
