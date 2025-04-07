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
        "Explore the concept of..."
    ];
    const STORAGE_KEY = 'daydreamSession';

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
        history: [], // Array of chosen prompts
        currentOptions: [], // Array of AI-generated options for the current step
        cycleCount: 0,
        isComplete: false,
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
                // Basic validation
                if (!sessionState.history) sessionState.history = [];
                if (!sessionState.currentOptions) sessionState.currentOptions = [];
                if (typeof sessionState.cycleCount !== 'number') sessionState.cycleCount = 0;
                if (typeof sessionState.isComplete !== 'boolean') sessionState.isComplete = false;

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
            history: [],
            currentOptions: [],
            cycleCount: 0,
            isComplete: false
        };
        localStorage.removeItem(STORAGE_KEY); // Clear storage explicitly
    }

    // --- API Interaction ---
    async function fetchExpansions(promptText) {
        showLoading();
        hideError();
        sessionState.history.push(promptText); // Add the chosen/typed prompt to history
        sessionState.cycleCount++;
        saveState(); // Save state *before* API call

        try {
            const response = await fetch(API_EXPAND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'X-CSRFToken': getCsrfToken(), // Include CSRF token if needed
                },
                body: JSON.stringify({ history: sessionState.history }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success' && data.options) {
                sessionState.currentOptions = data.options;
                saveState();
                // render() will be called in finally block
            } else {
                throw new Error(data.message || 'Failed to get expansions from server.');
            }
        } catch (error) {
            console.error('Error fetching expansions:', error);
            showError(`Failed to get next steps: ${error.message}. Please try again.`);
            // Rollback state? Maybe remove the last history item?
            // sessionState.history.pop();
            // sessionState.cycleCount--;
            // saveState();
            // render(); // Re-render previous state
        } finally {
            hideLoading();
            render(); // Call render once after everything is done
        }
    }

    async function fetchCompletion() {
        hideError();

        try {
            const response = await fetch(API_COMPLETE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ history: sessionState.history }),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success' && data.summary) {
                sessionState.isComplete = true;
                saveState(); // Save completion status
                renderFinalDream(data.summary);
            } else {
                throw new Error(data.message || 'Failed to get summary from server.');
            }
        } catch (error) {
            console.error('Error fetching completion:', error);
            showError(`Failed to complete dream: ${error.message}. You can try again or go back.`);
        } finally {
            hideLoading(); // Ensure loading is hidden regardless of success/failure
            // If fetchCompletion succeeded, renderFinalDream was called.
            // If it failed, we need render() to restore the previous state.
            if (!sessionState.isComplete) {
                render();
            }
        }
    }

    // --- Rendering Logic ---
    function render() {
        hideError(); // Clear previous errors on re-render

        if (sessionState.isComplete) {
            // This case should be handled by renderFinalDream directly after fetchCompletion
            // but added here as a safeguard if state is loaded as complete.
            // It might need the actual summary text, which isn't stored persistently.
            // Consider re-fetching completion if state loads as complete but text is missing.
             console.warn("Render called while state is complete. Ideally, renderFinalDream handles this.");
             // Attempt to show reset button if needed
             showFinalScreen();
            return;
        }


        if (sessionState.history.length === 0) {
            // Initial State
            initialPromptsSection.style.display = 'block';
            currentPromptSection.style.display = 'none';
            optionsSection.style.display = 'none';
            controlsSection.style.display = 'none';
            finalDreamSection.style.display = 'none';

            // Populate default prompts
            initialPromptList.innerHTML = ''; // Clear previous
            DEFAULT_PROMPTS.forEach(prompt => {
                const li = document.createElement('li');
                li.textContent = prompt;
                li.addEventListener('click', () => handlePromptSelection(prompt));
                initialPromptList.appendChild(li);
            });
            customPromptInput.value = ''; // Clear input
            // Ensure custom prompt input is visible when rendering initial state
            initialPromptsSection.querySelector('.custom-prompt').style.display = 'flex';

        } else {
            // Active Ideation State
            initialPromptsSection.style.display = 'none';
            currentPromptSection.style.display = 'block';
            optionsSection.style.display = 'block';
            controlsSection.style.display = 'block';
            finalDreamSection.style.display = 'none';


            // Display current prompt and history breadcrumbs
            const lastPrompt = sessionState.history[sessionState.history.length - 1];
            currentPromptText.textContent = lastPrompt;
            promptHistoryDisplay.textContent = `Path: ${sessionState.history.slice(0, -1).map(p => `"${p.substring(0, 15)}..."`).join(' > ')} > "${lastPrompt.substring(0, 25)}..."`;


            // Display AI options
            optionsList.innerHTML = ''; // Clear previous
            sessionState.currentOptions.forEach(option => {
                const li = document.createElement('li');
                li.textContent = option;
                li.addEventListener('click', () => handlePromptSelection(option));
                optionsList.appendChild(li);
            });
            customFollowupInput.value = ''; // Clear input
            // Ensure custom follow-up input is visible when rendering options state
            optionsSection.querySelector('.custom-prompt').style.display = 'flex';

            // Update controls
            backBtn.disabled = sessionState.history.length <= 1; // Disable back if only one prompt in history
            const shouldShowComplete = sessionState.cycleCount >= MIN_CYCLES_FOR_COMPLETE;
            completeBtn.style.display = shouldShowComplete ? 'inline-block' : 'none';
            completeBtn.disabled = !shouldShowComplete;
            
            // Ensure cursor style is correct
            if (shouldShowComplete) {
                completeBtn.style.cursor = 'pointer';
            }
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

        if (sessionState.history.length === 0) {
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
             // Display the submitted text visually
            displaySubmittedItem(text, optionsList, optionsSection.querySelector('.custom-prompt'));
            showLoading(); // Show loading indicator
            // Treat custom followup like selecting an option
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
        if (sessionState.history.length > 1) {
            // This implementation simply removes the last step.
            // A more complex implementation could allow choosing a different previous option.
            // For now, it just goes back to the state *before* the last prompt was chosen.
            // We need to re-fetch the options for the *new* last prompt.

            showLoading(); // Show loading as we need to re-fetch previous options
            hideError();

            // Remove the last prompt from history
            sessionState.history.pop();
            sessionState.cycleCount--; // Decrement cycle count

            if (sessionState.history.length === 0) {
                // If going back results in empty history, reset completely
                resetState();
                saveState();
                hideLoading();
                render();
            } else {
                 // We need the options that *led* to the current last prompt.
                 // This simple back implementation doesn't store previous options sets.
                 // To truly 'go back' and see the options again, we'd need to fetch them.
                 // Let's re-fetch based on the *new* history tail.
                 const previousHistory = sessionState.history.slice(); // Copy history *before* potential prompt add
                 sessionState.history.pop(); // Temporarily remove the last one again to fetch its predecessors's options
                 sessionState.cycleCount--; //Decrement again

                 fetchExpansions(previousHistory[previousHistory.length-1]); // Re-expand from the step *before* the one we returned to. This will re-add the last item back.

                // // Simple rollback without re-fetching (loses options context):
                // sessionState.currentOptions = []; // Clear options as they belong to the removed step
                // saveState();
                // render();
                // hideLoading(); // Hide loading if not re-fetching
            }
        }
    });

    completeBtn.addEventListener('click', () => {
        // Hide options immediately when completing
        optionsSection.style.display = 'none';
        showLoading("Waking up...");
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
    const loadingIndicatorText = loadingIndicator.querySelector('p'); // Get the paragraph inside
    const defaultLoadingMessage = "Dreaming up possibilities...";

    function showLoading(message = defaultLoadingMessage) {
        errorMessage.style.display = 'none';
        loadingIndicatorText.textContent = message; // Set the message
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
        loadingIndicatorText.textContent = defaultLoadingMessage; // Reset message
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
    if (sessionState.isComplete) {
        // If loaded state is already complete, show the final screen
        // but we don't have the summary text. Inform user or reset.
        console.warn("Loaded session is marked complete, but summary text is not persisted. Resetting.");
        resetState(); // Reset to avoid confusion
        saveState();
        render(); // Render the initial state
    } else {
       render(); // Render based on loaded or initial state
    }

    // Handle page refresh - state is loaded via loadState() on DOMContentLoaded
    // No explicit handling needed here as localStorage persists across refreshes,
    // and the desired behavior is to clear it, which `resetState` does.
    // If you *strictly* wanted it cleared *only* on refresh, you might use sessionStorage
    // or add a flag cleared by window.onbeforeunload, but localStorage fits the description.
});