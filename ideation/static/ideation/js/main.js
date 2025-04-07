document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const API_EXPAND_URL = '/api/expand/';
    const API_COMPLETE_URL = '/api/complete/';
    const MIN_CYCLES_FOR_COMPLETE = 3;
    const DEFAULT_PROMPTS = [
        "I want to invent...",
        "Write me a story about...",
        "I'm thinking of a world where...",
        "What if technology could...",
        "Explore the concept of...",
        "Design a solution for...",
        "Imagine a future where...",
        "Create a character who...",
        "In an alternate reality...",
        "Transform everyday life by...",
        "Revolutionize the way we...",
        "Build a community around...",
        "Reinvent the concept of...",
        "Challenge the assumption that..."
    ];
    const LOADING_MESSAGES = [
        "Dreaming up possibilities...",
        "Exploring new ideas...",
        "Wandering through imagination...",
        "Chasing creative thoughts...",
        "Weaving dreams together...",
        "Gathering inspiration...",
        "Connecting the dots...",
        "Following the daydream...",
        "Brewing up ideas...",
        "Letting imagination flow..."
    ];
    const WAKING_MESSAGES = [
        "Waking up...",
        "Coming back to reality...",
        "Gathering the dream pieces...",
        "Crystallizing thoughts...",
        "Bringing the dream to life...",
        "Emerging from imagination...",
        "Capturing the essence...",
        "Drawing conclusions...",
        "Wrapping up the journey...",
        "Making sense of it all..."
    ];
    const STORAGE_KEY = 'daydreamSession';

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

    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');

    // --- State Management ---
    let sessionState = {
        steps: [], // Array of { prompt: string, options: string[] }
        currentStepIndex: -1, // -1: initial screen, 0: first step completed, etc.
        isComplete: false,
        finalSummary: null, // Store the final summary text
    };

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionState));
        } catch (e) {
            console.error("Failed to save state to localStorage:", e);
            // Optionally inform the user
        }
    }

    function loadState() {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
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
        localStorage.removeItem(STORAGE_KEY); // Clear storage explicitly
    }

    // --- API Interaction ---
    async function fetchExpansions(chosenPrompt) {
        showLoading();
        hideError();

        // Construct history for API based on current state + new prompt
        const historyForAPI = sessionState.currentStepIndex === -1
            ? [chosenPrompt]
            : sessionState.steps.slice(0, sessionState.currentStepIndex + 1).map(s => s.prompt).concat(chosenPrompt);

        // No state change *before* the API call

        try {
            const response = await fetch(API_EXPAND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ history: historyForAPI }), // Send the potential future history
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success' && data.options) {
                 // --- State update on success ---
                const fetchedOptions = data.options;
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
                throw new Error(data.message || 'Failed to get expansions from server.');
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

        // Construct history from the current steps' prompts
        const historyForAPI = sessionState.steps.slice(0, sessionState.currentStepIndex + 1).map(s => s.prompt);

        try {
            const response = await fetch(API_COMPLETE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ history: historyForAPI }),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success' && data.summary) {
                 // --- State update on success ---
                sessionState.isComplete = true;
                sessionState.finalSummary = data.summary;
                saveState();
                 // --- End State update ---

                renderFinalDream(data.summary); // Render final dream immediately
                hideLoading(); // Hide loading indicator after rendering final dream
            } else {
                throw new Error(data.message || 'Failed to get summary from server.');
            }
        } catch (error) {
            console.error('Error fetching completion:', error);
            showError(`Failed to complete dream: ${error.message}. You can try again or go back.`);
            // Hide loading and re-render previous state on error
            hideLoading();
            render();
        }
         // No finally block needed here if success/error handles render/hideLoading
    }

    // --- Rendering Logic ---
    function render() {
        hideError(); // Clear previous errors on re-render

        if (sessionState.isComplete && sessionState.finalSummary) {
            // If state is complete and summary exists, render final dream
            renderFinalDream(sessionState.finalSummary);
            return;
        }
        // Ensure final dream section is hidden if we are not complete
        finalDreamSection.style.display = 'none';


        if (sessionState.currentStepIndex === -1) {
            // Initial State
            initialPromptsSection.style.display = 'block';
            currentPromptSection.style.display = 'none';
            optionsSection.style.display = 'none';
            controlsSection.style.display = 'none';
            // finalDreamSection handled above

            // Randomly select 5 prompts from the DEFAULT_PROMPTS array
            const shuffledPrompts = [...DEFAULT_PROMPTS].sort(() => Math.random() - 0.5);
            const selectedPrompts = shuffledPrompts.slice(0, 5);

            // Populate randomly selected prompts
            initialPromptList.innerHTML = ''; // Clear previous
            selectedPrompts.forEach(prompt => {
                const li = document.createElement('li');
                li.textContent = prompt;
                li.addEventListener('click', () => handlePromptSelection(prompt));
                initialPromptList.appendChild(li);
            });
            customPromptInput.value = ''; // Clear input
            initialPromptsSection.querySelector('.custom-prompt').style.display = 'flex'; // Ensure input is visible

        } else {
            // Active Ideation State (currentStepIndex >= 0)
            initialPromptsSection.style.display = 'none';
            currentPromptSection.style.display = 'block';
            optionsSection.style.display = 'block';
            controlsSection.style.display = 'block';
             // finalDreamSection handled above

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

            promptHistoryDisplay.textContent = sessionState.steps
                .slice(0, sessionState.currentStepIndex) // History is steps *before* current
                .map(s => s.prompt)
                .join(' > ');


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

            // Update controls
            // Back button is enabled as long as we are not on the initial screen
            backBtn.disabled = sessionState.currentStepIndex < 0;

            const cycleCount = sessionState.currentStepIndex + 1; // Cycle count based on index
            const shouldShowComplete = cycleCount >= MIN_CYCLES_FOR_COMPLETE;
            completeBtn.style.display = shouldShowComplete ? 'inline-block' : 'none';
            completeBtn.disabled = !shouldShowComplete;
            completeBtn.style.cursor = shouldShowComplete ? 'pointer' : 'default'; // Use default cursor when disabled
        }
         // Ensure loading indicator is hidden after render completes, unless still loading
         // Note: hideLoading() is called in finally blocks of async functions,
         // but this is a safeguard if render is called directly elsewhere.
         if (loadingIndicator.style.display === 'block') {
             // Check if an async operation is actually in progress? Tricky.
             // Assume if render is called, loading should usually hide unless an error prevented it.
             // Let the finally blocks handle hiding.
         }
    }

     function renderFinalDream(summary) {
        initialPromptsSection.style.display = 'none';
        currentPromptSection.style.display = 'none';
        optionsSection.style.display = 'none';
        controlsSection.style.display = 'none';
        finalDreamSection.style.display = 'block';

        finalDreamText.textContent = summary;
    }

    // --- Event Handlers ---
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
     customPromptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCustomPromptSubmit();
        }
    });

    function handleCustomFollowupSubmit() {
        const text = customFollowupInput.value.trim();
        if (text) {
             hideError();

             // --- Modification Start ---
             // Add the custom text to the *current* step's options before proceeding
             if (sessionState.currentStepIndex >= 0) {
                 const currentStep = sessionState.steps[sessionState.currentStepIndex];
                 if (currentStep && currentStep.options && !currentStep.options.includes(text)) {
                     currentStep.options.push(text);
                     saveState(); // Save the updated options list for the current step
                 }
             }
             // --- Modification End ---

             // Display the submitted text visually
            displaySubmittedItem(text, optionsList, optionsSection.querySelector('.custom-prompt'));
            showLoading(); // Show loading indicator
            // Treat custom followup like selecting an option - fetches options for the *next* step
            fetchExpansions(text);
        }
    }

    submitCustomFollowupBtn.addEventListener('click', handleCustomFollowupSubmit);
    customFollowupInput.addEventListener('keypress', (e) => {
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

    completeBtn.addEventListener('click', () => {
        // Hide options immediately and show loading
        optionsSection.style.display = 'none';
        // Get a random non-repeating waking message
        const newWakingMessage = getRandomMessage(WAKING_MESSAGES, lastWakingMessage);
        lastWakingMessage = newWakingMessage; // Update the last shown waking message
        showLoading(newWakingMessage); // Pass the chosen waking message to showLoading
        fetchCompletion();
    });

    resetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to start over? Your current daydream will be lost.")) {
            resetState();
            saveState();
            render();
        }
    });

    finalResetBtn.addEventListener('click', () => {
         resetState();
         saveState();
         render();
    });


    // --- Utility Functions ---
    const loadingIndicatorText = loadingIndicator.querySelector('p');

    function showLoading(message = null) {
        errorMessage.style.display = 'none';
        if (message) {
            // If a specific message is provided (like for waking), use it directly
            loadingIndicatorText.textContent = message;
        } else {
            // Otherwise, get a random non-repeating loading message
            const newMessage = getRandomMessage(LOADING_MESSAGES, lastLoadingMessage);
            lastLoadingMessage = newMessage; // Update the last shown message
            loadingIndicatorText.textContent = newMessage;
        }
        loadingIndicator.style.display = 'block';
        // Disable buttons while loading
        submitCustomPromptBtn.disabled = true;
        submitCustomFollowupBtn.disabled = true;
        if(completeBtn) completeBtn.disabled = true;
        if(backBtn) backBtn.disabled = true;
        if(resetBtn) resetBtn.disabled = true;

        // Make list items unclickable
        const listItems = document.querySelectorAll('.prompt-list li, .options-list li');
        listItems.forEach(item => item.style.pointerEvents = 'none');
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
        // Re-enable buttons - render() will handle correct disabled state based on cycle count etc.
        submitCustomPromptBtn.disabled = false;
        submitCustomFollowupBtn.disabled = false;
        // Explicitly re-enable reset button, as render() doesn't manage its disabled state
        if(resetBtn) resetBtn.disabled = false;

        // render() will handle enabling/disabling back/complete correctly
        // if(completeBtn) completeBtn.disabled = sessionState.cycleCount < MIN_CYCLES_FOR_COMPLETE;
        // if(backBtn) backBtn.disabled = sessionState.history.length <= 1;

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

    function showFinalScreen() {
        initialPromptsSection.style.display = 'none';
        currentPromptSection.style.display = 'none';
        optionsSection.style.display = 'none';
        controlsSection.style.display = 'none';
        finalDreamSection.style.display = 'block'; // Show final section
    }

    // --- Initialization ---
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

    // Handle page refresh - state is loaded via loadState() on DOMContentLoaded
    // No explicit handling needed here as localStorage persists across refreshes,
    // and the desired behavior is to clear it, which `resetState` does.
    // If you *strictly* wanted it cleared *only* on refresh, you might use sessionStorage
    // or add a flag cleared by window.onbeforeunload, but localStorage fits the description.
});