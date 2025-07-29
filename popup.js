// Popup script for Twitter Reply Generator
console.log('Simple popup loading...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup DOM loaded');
    
    // Get elements
    const statusText = document.getElementById('status-text');
    const enabledToggle = document.getElementById('enabled-toggle');
    const enabledContainer = document.getElementById('enabled-toggle-container');
    const useGeminiToggle = document.getElementById('use-gemini-toggle');
    const useGeminiContainer = document.getElementById('use-gemini-toggle-container');
    const geminiApiKey = document.getElementById('gemini-api-key');
    const maxSuggestions = document.getElementById('max-suggestions');
    const testApiBtn = document.getElementById('test-api-btn');
    const tweetsProcessed = document.getElementById('tweets-processed');
    const repliesGenerated = document.getElementById('replies-generated');

    // Toggle functionality
    function setupToggle(checkbox, container) {
        checkbox.addEventListener('change', function() {
            container.classList.toggle('active', this.checked);
        });
        container.addEventListener('click', function() {
            checkbox.checked = !checkbox.checked;
            container.classList.toggle('active', checkbox.checked);
        });
    }
    
    setupToggle(enabledToggle, enabledContainer);
    setupToggle(useGeminiToggle, useGeminiContainer);
    
    // Load settings
    chrome.storage.sync.get(['enabled', 'geminiApiKey', 'maxSuggestions', 'useGemini', 'stats'], function(result) {
        console.log('Settings loaded:', result);
        
        enabledToggle.checked = result.enabled !== false;
        enabledContainer.classList.toggle('active', enabledToggle.checked);
        
        useGeminiToggle.checked = result.useGemini !== false;
        useGeminiContainer.classList.toggle('active', useGeminiToggle.checked);
        
        geminiApiKey.value = result.geminiApiKey || '';
        maxSuggestions.value = result.maxSuggestions || 5;
        
        const stats = result.stats || { tweetsProcessed: 0, repliesGenerated: 0 };
        tweetsProcessed.textContent = `Tweets: ${stats.tweetsProcessed}`;
        repliesGenerated.textContent = `Replies: ${stats.repliesGenerated}`;
        
        updateStatus();
    });
    
    // Handle toggle changes
    enabledToggle.addEventListener('change', function() {
        chrome.storage.sync.set({ enabled: enabledToggle.checked });
        updateStatus();
        
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && (tabs[0].url.includes('twitter.com') || tabs[0].url.includes('x.com'))) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleExtension',
                    enabled: enabledToggle.checked
                });
            }
        });
    });
    
    useGeminiToggle.addEventListener('change', function() {
        chrome.storage.sync.set({ useGemini: useGeminiToggle.checked });
        updateStatus();
    });
    
    geminiApiKey.addEventListener('change', function() {
        chrome.storage.sync.set({ geminiApiKey: geminiApiKey.value });
    });
    
    maxSuggestions.addEventListener('change', function() {
        const value = parseInt(maxSuggestions.value);
        if (value >= 1 && value <= 10) {
            chrome.storage.sync.set({ maxSuggestions: value });
        } else {
            maxSuggestions.value = 5;
            chrome.storage.sync.set({ maxSuggestions: 5 });
        }
    });
    
    function updateStatus() {
        if (enabledToggle.checked) {
            if (useGeminiToggle.checked && geminiApiKey.value) {
                statusText.textContent = 'Active with Gemini AI';
            } else if (useGeminiToggle.checked && !geminiApiKey.value) {
                statusText.textContent = 'Active (local mode - add API key)';
            } else {
                statusText.textContent = 'Active (local mode)';
            }
        } else {
            statusText.textContent = 'Disabled';
        }
    }
    
    // Test API button
    testApiBtn.addEventListener('click', function() {
        if (geminiApiKey.value) {
            testApiBtn.textContent = 'Testing...';
            testApiBtn.disabled = true;
            
            console.log('Testing API with key:', geminiApiKey.value.substring(0, 10) + '...');
            
            chrome.runtime.sendMessage({
                action: 'testGeminiAPI',
                apiKey: geminiApiKey.value
            }, function(response) {
                console.log('API test response:', response);
                
                if (response && response.success) {
                    alert(`API connection successful!\n\nGenerated ${response.result.suggestions.length} suggestions:\n${response.result.suggestions.join('\n')}`);
                } else {
                    const errorMsg = response && response.error ? response.error : 'Unknown error occurred';
                    alert(`API connection failed:\n\n${errorMsg}\n\nPlease check:\n1. Your API key is correct\n2. You have billing enabled\n3. Your API key has proper permissions`);
                }
                testApiBtn.textContent = 'Test API Connection';
                testApiBtn.disabled = false;
            });
        } else {
            alert('Please enter your Gemini API key first.');
        }
    });
    
    // Check current tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        if (currentTab && (currentTab.url.includes('twitter.com') || currentTab.url.includes('x.com'))) {
            updateStatus();
        } else {
            statusText.textContent = 'Go to Twitter to use';
        }
    });
    
    console.log('Simple popup loaded successfully');
}); 