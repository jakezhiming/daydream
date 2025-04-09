document.addEventListener('DOMContentLoaded', () => {
    // Configuration constants are in config.js and accessed via DaydreamConfig object

    // Track last shown messages to avoid repeats
    let lastLoadingMessage = '';
    let lastWakingMessage = '';

    // Function to get random message avoiding the last shown one
    function getRandomMessage(messages, lastShown) {
        let availableMessages = messages.filter(msg => msg !== lastShown);
        if (availableMessages.length === 0) {
            // If only one message exists, or if filtering somehow resulted in none, return any message
            return messages[Math.floor(Math.random() * messages.length)];
        }
        return availableMessages[Math.floor(Math.random() * availableMessages.length)];
    }

    // --- DOM Elements ---
    const initialPromptsSection = document.getElementById('initial-prompts-section');
    const initialPromptList = document.getElementById('initial-prompt-list');
    const customPromptInput = document.getElementById('custom-prompt-input');
    const submitCustomPromptBtn = document.getElementById('submit-custom-prompt');

    const currentPromptSection = document.getElementById('current-prompt-section');
    const currentPromptText = document.getElementById('current-prompt-text');
    const promptHistoryDisplay = document.getElementById('prompt-history-display');

    const optionsSection = document.getElementById('options-section');
    const optionsList = document.getElementById('options-list');
    const customFollowupInput = document.getElementById('custom-followup-input');
    const submitCustomFollowupBtn = document.getElementById('submit-custom-followup');

    const controlsSection = document.getElementById('controls-section');
    const backBtn = document.getElementById('back-btn');
    const completeBtn = document.getElementById('complete-btn');
    const resetBtn = document.getElementById('reset-btn');
    const finalResetBtn = document.getElementById('final-reset-btn');

    const finalDreamSection = document.getElementById('final-dream-section');
    const finalDreamText = document.getElementById('final-dream-text');
    const goBackFromFinalBtn = document.getElementById('go-back-from-final-btn');

    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');

    // --- Utility Functions ---
    const loadingIndicatorText = loadingIndicator.querySelector('p');

    // --- State Management ---
    let sessionState = {
        steps: [], // Array of { prompt: string, options: string[] }
        currentStepIndex: -1, // -1: initial screen, 0: first step completed, etc.
        isComplete: false,
        finalSummary: null, // Store the final summary text
    };

    function saveState() {
        try {
            localStorage.setItem(DaydreamConfig.STORAGE_KEY, JSON.stringify(sessionState));
        } catch (e) {
            console.error("Failed to save state to localStorage:", e);
            // Optionally inform the user
        }
    }

    function loadState() {
        try {
            const savedState = localStorage.getItem(DaydreamConfig.STORAGE_KEY);
            if (savedState) {
                sessionState = JSON.parse(savedState);
                // Basic validation and default values for the new structure
                if (!Array.isArray(sessionState.steps)) sessionState.steps = [];
                if (typeof sessionState.currentStepIndex !== 'number') sessionState.currentStepIndex = -1;
                if (typeof sessionState.isComplete !== 'boolean') sessionState.isComplete = false;
                if (sessionState.isComplete && typeof sessionState.finalSummary !== 'string') {
                    // If marked complete but no summary, treat as incomplete.
                    console.warn("Loaded session is marked complete, but summary text is missing. Resetting completion status.");
                    sessionState.isComplete = false;
                    sessionState.finalSummary = null;
                     // If steps are empty and it was complete, reset fully.
                     if (sessionState.steps.length === 0) {
                         resetState(); // Call resetState to ensure clean initial state
                         return; // Exit early as resetState handles defaults
                     } else {
                         // Ensure index is valid if we reset completion
                         sessionState.currentStepIndex = Math.max(-1, Math.min(sessionState.currentStepIndex, sessionState.steps.length - 1));
                     }
                }
                 // Ensure currentStepIndex is within bounds relative to steps array
                if (sessionState.steps.length === 0) {
                    sessionState.currentStepIndex = -1;
                } else {
                    sessionState.currentStepIndex = Math.max(-1, Math.min(sessionState.currentStepIndex, sessionState.steps.length - 1));
                }

            } else {
                resetState(); // Initialize if nothing is saved
            }
        } catch (e) {
            console.error("Failed to load state from localStorage:", e);
            resetState(); // Reset to default on error
        }
    }

    function resetState() {
        sessionState = {
            steps: [],
            currentStepIndex: -1,
            isComplete: false,
            finalSummary: null
        };
        localStorage.removeItem(DaydreamConfig.STORAGE_KEY); // Clear storage explicitly
    }

    // --- API Interaction ---
    async function fetchExpansions(chosenPrompt) {
        showLoading(); // Now uses the updated showLoading function
        hideError();

        // Construct history for API based on current state + new prompt
        const historyForAPI = sessionState.currentStepIndex === -1
            ? [chosenPrompt]
            : sessionState.steps.slice(0, sessionState.currentStepIndex + 1).map(s => s.prompt).concat(chosenPrompt);

        // No state change *before* the API call

        try {
            // Use the utility function from utils.js instead of making a fetch call directly
            const result = await getLLMResponse(historyForAPI, 'expand');

            if (result.status === 'success' && result.data) {
                // --- State update on success ---
                const fetchedOptions = result.data;
                const newStep = { prompt: chosenPrompt, options: fetchedOptions };

                sessionState.currentStepIndex++; // Move to the new step index
                // Truncate any steps that might exist if we went back and chose a different path
                sessionState.steps = sessionState.steps.slice(0, sessionState.currentStepIndex);
                sessionState.steps.push(newStep); // Add the new step data

                sessionState.isComplete = false; // Ensure not complete if we took a new step
                sessionState.finalSummary = null;

                saveState();
                // --- End State update ---
            } else {
                throw new Error(result.message || 'Failed to get expansions from AI.');
            }
        } catch (error) {
            console.error('Error fetching expansions:', error);
            showError(`Failed to get next steps: ${error.message}. Please try again.`);
            // Do not change state on error
        } finally {
            hideLoading();
            render(); // Render the new state (or the old one if error occurred)
        }
    }

    async function fetchCompletion() {
        hideError();
        
        // Hide options immediately and show loading with a waking message
        optionsSection.style.display = 'none';
        // Get a random non-repeating waking message
        const newWakingMessage = getRandomMessage(DaydreamConfig.WAKING_MESSAGES, lastWakingMessage);
        lastWakingMessage = newWakingMessage; // Update the last shown waking message
        showLoading(newWakingMessage);

        // Construct history from the current steps' prompts
        const historyForAPI = sessionState.steps.slice(0, sessionState.currentStepIndex + 1).map(s => s.prompt);

        try {
            // Use the utility function from utils.js instead of making a fetch call directly
            const result = await getLLMResponse(historyForAPI, 'complete');

            if (result.status === 'success' && result.data) {
                // --- State update on success ---
                sessionState.isComplete = true;
                sessionState.finalSummary = result.data;
                saveState();
                // --- End State update ---
            } else {
                throw new Error(result.message || 'Failed to complete dream with AI.');
            }
        } catch (error) {
            console.error('Error completing dream:', error);
            showError(`Failed to complete your dream: ${error.message}. Please try again.`);
            // Do not change state on error
        } finally {
            hideLoading();
            render(); // Render the new state
        }
    }

    // --- UI Interaction Functions ---
    function populateDefaultPrompts() {
        initialPromptList.innerHTML = '';
        // Randomly select 5 prompts from the DEFAULT_PROMPTS array
        const shuffledPrompts = [...DaydreamConfig.DEFAULT_PROMPTS].sort(() => Math.random() - 0.5);
        const selectedPrompts = shuffledPrompts.slice(0, 5);

        // Populate randomly selected prompts
        selectedPrompts.forEach(promptText => {
            const li = document.createElement('li');
            li.textContent = promptText;
            li.addEventListener('click', () => handlePromptSelection(promptText));
            initialPromptList.appendChild(li);
        });
    }

    function handlePromptSelection(promptText) {
        // Immediately hide irrelevant choices and show loading indicator
        hideError(); // Ensure any previous errors are hidden

        if (sessionState.currentStepIndex === -1) {
            // Initial prompt selection
            const listItems = initialPromptList.querySelectorAll('li');
            listItems.forEach(item => {
                if (item.textContent !== promptText) {
                    item.style.display = 'none';
                }
            });
            initialPromptsSection.querySelector('.custom-prompt').style.display = 'none';
        } else {
            // Follow-up option selection
            const listItems = optionsList.querySelectorAll('li');
            listItems.forEach(item => {
                if (item.textContent !== promptText) {
                    item.style.display = 'none';
                }
            });
            optionsSection.querySelector('.custom-prompt').style.display = 'none';
        }

        showLoading(); // Show loading indicator and disable controls

        // Clear custom inputs (in case one was used just before clicking a list item)
        customPromptInput.value = '';
        customFollowupInput.value = '';

        // Fetch expansions asynchronously
        fetchExpansions(promptText);
        // Note: render() will be called within fetchExpansions's finally block
        // render() will rebuild the lists, automatically removing the hidden styles.
    }
    
    function populateOptions(options) {
        optionsList.innerHTML = '';
        options.forEach(optionText => {
            const li = document.createElement('li');
            li.textContent = optionText;
            li.addEventListener('click', () => handlePromptSelection(optionText));
            optionsList.appendChild(li);
        });
    }

    function showLoading(message = null) {
        errorMessage.style.display = 'none';
        if (message) {
            // If a specific message is provided (like for waking), use it directly
            loadingIndicatorText.textContent = message;
        } else {
            // Otherwise, get a random non-repeating loading message
            const newMessage = getRandomMessage(DaydreamConfig.LOADING_MESSAGES, lastLoadingMessage);
            lastLoadingMessage = newMessage; // Update the last shown message
            loadingIndicatorText.textContent = newMessage;
        }
        loadingIndicator.style.display = 'block';

        // Hide relevant buttons during loading
        if (submitCustomPromptBtn) submitCustomPromptBtn.style.display = 'none';
        if (submitCustomFollowupBtn) submitCustomFollowupBtn.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
        if (completeBtn) completeBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'none';

        // Make list items unclickable (still useful)
        const listItems = document.querySelectorAll('.prompt-list li, .options-list li');
        listItems.forEach(item => item.style.pointerEvents = 'none');
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';

        // Make list items clickable again - render() will recreate them anyway, but good practice
        const listItems = document.querySelectorAll('.prompt-list li, .options-list li');
        listItems.forEach(item => item.style.pointerEvents = 'auto');
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    // --- Screen Rendering ---
    function render() {
        hideError(); // Clear previous errors on re-render

        // Hide all sections first
        initialPromptsSection.style.display = 'none';
        currentPromptSection.style.display = 'none';
        optionsSection.style.display = 'none';
        controlsSection.style.display = 'none';
        finalDreamSection.style.display = 'none';

        if (sessionState.isComplete && sessionState.finalSummary) {
            // If state is complete and summary exists, render final dream
            renderFinalDream(sessionState.finalSummary);
            return;
        }

        // Initial Screen (first visit or after reset)
        if (sessionState.currentStepIndex === -1) {
            populateDefaultPrompts();
            initialPromptsSection.style.display = 'block';
            customPromptInput.value = ''; // Clear input
            initialPromptsSection.querySelector('.custom-prompt').style.display = 'flex'; // Ensure input is visible
            // Ensure the custom prompt button is visible here
            if (submitCustomPromptBtn) {
                submitCustomPromptBtn.style.display = 'inline-block'; // Or appropriate display type
            }
            return;
        }

        // Show controls regardless of subsequent UI states after initial screen
        controlsSection.style.display = 'block';
        // Explicitly show control buttons that are always present when controls are shown
        if (backBtn) backBtn.style.display = 'inline-block';
        if (resetBtn) resetBtn.style.display = 'inline-block';

        // Show current progress
        const currentStep = sessionState.steps[sessionState.currentStepIndex];
        if (!currentStep) {
            console.error("Render error: Invalid currentStepIndex or missing step data.", sessionState);
            showError("An internal error occurred. Please try resetting.");
            resetState(); // Attempt to recover by resetting
            render(); // Re-render initial state
            return;
        }

        // Display current prompt and history breadcrumbs
        currentPromptText.textContent = currentStep.prompt;
        currentPromptSection.style.display = 'block';

        promptHistoryDisplay.textContent = sessionState.steps
            .slice(0, sessionState.currentStepIndex) // History is steps *before* current
            .map(s => s.prompt)
            .join(' → ') + 
            (sessionState.currentStepIndex > 0 ? ' → ' : '');

        // Display AI options from the *current* step's saved options
        optionsList.innerHTML = ''; // Clear previous
        if (currentStep.options && Array.isArray(currentStep.options)) {
            currentStep.options.forEach(option => {
                const li = document.createElement('li');
                li.textContent = option;
                // Clicking an option will fetch *new* expansions based on this option text
                li.addEventListener('click', () => handlePromptSelection(option));
                optionsList.appendChild(li);
            });
        } else {
            console.warn("No options found for the current step:", currentStep);
            // Optionally display a message indicating no options available
        }

        customFollowupInput.value = ''; // Clear input
        optionsSection.querySelector('.custom-prompt').style.display = 'flex'; // Ensure input is visible
        optionsSection.style.display = 'block';

        // Update controls
        // Back button is enabled as long as we are not on the initial screen
        backBtn.disabled = sessionState.currentStepIndex < 0;

        const cycleCount = sessionState.currentStepIndex + 1; // Cycle count based on index
        const shouldShowComplete = cycleCount >= DaydreamConfig.MIN_CYCLES_FOR_COMPLETE;
        completeBtn.style.display = shouldShowComplete ? 'inline-block' : 'none';
        completeBtn.disabled = !shouldShowComplete;
        completeBtn.style.cursor = shouldShowComplete ? 'pointer' : 'default'; // Use default cursor when disabled

        // Ensure custom prompt buttons are visible when their sections are
        if (optionsSection.style.display === 'block' && submitCustomFollowupBtn) {
            submitCustomFollowupBtn.style.display = 'inline-block'; // Or appropriate display type
        }

        // Ensure loading indicator is hidden after render completes, unless still loading
        if (goBackFromFinalBtn) goBackFromFinalBtn.style.display = 'none';
    }

    function renderFinalDream(summary) {
        initialPromptsSection.style.display = 'none';
        currentPromptSection.style.display = 'none';
        optionsSection.style.display = 'none';
        controlsSection.style.display = 'none';
        finalDreamSection.style.display = 'block';
        if (goBackFromFinalBtn) goBackFromFinalBtn.style.display = 'inline-block';

        finalDreamText.textContent = summary;
        
        // Setup share button functionality
        const shareDreamBtn = document.getElementById('share-dream-btn');
        if (shareDreamBtn) {
            // Make sure the button is visible
            shareDreamBtn.style.display = 'inline-block';
            
            // Remove any previous event listeners by cloning and replacing the button
            const newShareBtn = shareDreamBtn.cloneNode(true);
            shareDreamBtn.parentNode.replaceChild(newShareBtn, shareDreamBtn);
            
            // Add event listener to the new button
            newShareBtn.addEventListener('click', () => {
                if (summary) {
                    // Copy the final dream text with attribution to clipboard
                    const textToCopy = `${summary}
- Created with Daydream`;
                    
                    // Try to use the clipboard API
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(textToCopy)
                            .then(() => {
                                // Visual feedback on successful copy
                                newShareBtn.classList.add('copied');
                                newShareBtn.textContent = 'Copied!';
                                
                                // Reset button state after 2 seconds
                                setTimeout(() => {
                                    newShareBtn.classList.remove('copied');
                                    newShareBtn.textContent = 'Share';
                                }, 2000);
                            })
                            .catch(err => {
                                console.error('Failed to copy with Clipboard API: ', err);
                                // Fall back to the alternative method
                                fallbackCopyTextToClipboard(textToCopy, newShareBtn);
                            });
                    } else {
                        // Fallback for browsers without clipboard API
                        fallbackCopyTextToClipboard(textToCopy, newShareBtn);
                    }
                }
            });
        }
    }
    
    // Fallback function for copying text to clipboard using textarea
    function fallbackCopyTextToClipboard(text, buttonElement) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            
            // Make the textarea out of viewport
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            
            // Save the current focus
            const focusedElement = document.activeElement;
            
            // Focus and select the text
            textArea.focus();
            textArea.select();
            
            // Copy text
            const successful = document.execCommand('copy');
            
            // Remove the textarea
            document.body.removeChild(textArea);
            
            // Restore focus
            if (focusedElement) focusedElement.focus();
            
            // Visual feedback
            if (successful) {
                buttonElement.classList.add('copied');
                buttonElement.textContent = 'Copied!';
                
                // Reset button state after 2 seconds
                setTimeout(() => {
                    buttonElement.classList.remove('copied');
                    buttonElement.textContent = 'Share';
                }, 2000);
            } else {
                showError('Failed to copy to clipboard. Please try again or copy manually.');
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            showError('Failed to copy to clipboard. Please try again or copy manually.');
        }
    }

    // --- Event Handlers ---
    // Helper function to display the submitted text like a selected item
    function displaySubmittedItem(text, listElement, inputContainerElement) {
        // Hide existing list items
        const listItems = listElement.querySelectorAll('li');
        listItems.forEach(item => item.style.display = 'none');

        // Hide the custom input container
        if (inputContainerElement) {
            inputContainerElement.style.display = 'none';
        }

        // Create and display the submitted item
        const submittedLi = document.createElement('li');
        submittedLi.textContent = text;
        submittedLi.classList.add('submitted-item'); // Apply the new style
        listElement.appendChild(submittedLi);
    }

    function handleCustomPromptSubmit() {
        const text = customPromptInput.value.trim();
        if (text) {
            hideError();
            // Display the submitted text visually
            displaySubmittedItem(text, initialPromptList, initialPromptsSection.querySelector('.custom-prompt'));
            showLoading(); // Show loading indicator
            fetchExpansions(text); // Fetch expansions
        }
    }

    submitCustomPromptBtn.addEventListener('click', handleCustomPromptSubmit);
    customPromptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleCustomPromptSubmit();
        }
    });

    function handleCustomFollowupSubmit() {
        const text = customFollowupInput.value.trim();
        if (text) {
            hideError();

            // Add the custom text to the *current* step's options before proceeding
            if (sessionState.currentStepIndex >= 0) {
                const currentStep = sessionState.steps[sessionState.currentStepIndex];
                if (currentStep && currentStep.options && !currentStep.options.includes(text)) {
                    currentStep.options.push(text);
                    saveState(); // Save the updated options list for the current step
                }
            }

            // Display the submitted text visually
            displaySubmittedItem(text, optionsList, optionsSection.querySelector('.custom-prompt'));
            showLoading(); // Show loading indicator
            // Treat custom followup like selecting an option - fetches options for the *next* step
            fetchExpansions(text);
        }
    }

    submitCustomFollowupBtn.addEventListener('click', handleCustomFollowupSubmit);
    customFollowupInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleCustomFollowupSubmit();
        }
    });

    backBtn.addEventListener('click', () => {
        // Only allow going back if not on the initial screen (-1)
        if (sessionState.currentStepIndex >= 0) {
            hideError(); // Clear errors when navigating
            sessionState.currentStepIndex--; // Decrement index to go back
            sessionState.isComplete = false; // Going back means it's not complete
            sessionState.finalSummary = null; // Clear summary when going back
            saveState(); // Save the new index
            render(); // Re-render the previous state (no API call needed)
        }
        // If currentStepIndex was 0, it becomes -1, render() shows initial screen.
        // If currentStepIndex was already -1, nothing happens.
    });

    resetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to start over? Your current daydream will be lost.")) {
            resetState();
            saveState();
            render();
        }
    });

    completeBtn.addEventListener('click', fetchCompletion);

    // Handle events for the final dream screen
    finalResetBtn.addEventListener('click', () => {
        resetState();
        saveState();
        render();
    });

    // Event listener for the "Go Back" button on the final screen
    if (goBackFromFinalBtn) {
        goBackFromFinalBtn.addEventListener('click', () => {
            if (sessionState.isComplete) {
                hideError();
                sessionState.isComplete = false;
                sessionState.finalSummary = null; // Clear the summary
                // No need to change currentStepIndex, it should still point to the last step before completion
                saveState();
                render(); // Re-render the previous state (options screen)
            }
        });
    }

    // --- Initialization ---
    function initialize() {
        loadState(); // Load state from localStorage

        // Initial render based on loaded state
        if (sessionState.isComplete && sessionState.finalSummary) {
            // If loaded state is complete *and* has summary, show final screen
            renderFinalDream(sessionState.finalSummary);
        } else {
            // If not complete, or summary missing, reset completion flag and render normally
            if(sessionState.isComplete && !sessionState.finalSummary) {
                sessionState.isComplete = false; // Correct state if summary is missing
                saveState(); // Save corrected state
            }
            // Render the appropriate state (initial or intermediate)
            render();
        }
    }

    initialize();
}); 