import { 
    submitCustomStartBtn, 
    customStartInput, 
    initialPromptList, 
    initialPromptsSection,
    optionsList, 
    optionsSection, 
    customFollowupInput, 
    submitCustomFollowupBtn,
    backBtn,
    completeBtn,
    resetBtn,
    finalResetBtn,
    goBackFromFinalBtn,
    hideError,
    showLoading,
    hideLoading,
    showError,
    displaySubmittedItem
} from './ui.js';

import { loadingMessages } from './prompts.js';
import { getRandomMessage } from './utils.js';
import { fetchExpansions, fetchCompletion } from './api.js';
import { sessionState, saveState, resetState } from './state.js';
import { render } from './render.js';

// Handle custom start prompt
async function handleCustomStartSubmit() {
    const text = customStartInput.value.trim();
    if (text) {
        hideError();
        displaySubmittedItem(text, initialPromptList, initialPromptsSection.querySelector('.custom-start'));
        showLoading();
        
        const historyForAPI = [text];
        
        try {
            const fetchedOptions = await fetchExpansions(historyForAPI);
            
            const newStep = { prompt: text, options: fetchedOptions };
            sessionState.currentStepIndex++;
            sessionState.steps = sessionState.steps.slice(0, sessionState.currentStepIndex);
            sessionState.steps.push(newStep);
            sessionState.isComplete = false;
            sessionState.finalSummary = null;
            saveState();
        } catch (error) {
            console.error('Error fetching expansions:', error);
            showError(`Failed to get next steps: ${error.message}. Please try again.`);
        } finally {
            hideLoading();
            render();
        }
    }
}

submitCustomStartBtn.addEventListener('click', handleCustomStartSubmit);
customStartInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleCustomStartSubmit();
    }
});

// Handle prompt selection
export function attachOptionEventListeners() {
    const optionItems = optionsList.querySelectorAll('li');
    optionItems.forEach(item => {
        item.addEventListener('click', () => handlePromptSelection(item.textContent));
    });
}

export async function handlePromptSelection(promptText) {
    hideError();

    if (sessionState.currentStepIndex === -1) {
        const listItems = initialPromptList.querySelectorAll('li');
        listItems.forEach(item => {
            if (item.textContent !== promptText) {
                item.style.display = 'none';
            }
        });
        initialPromptsSection.querySelector('.custom-start').style.display = 'none';
    } else {
        const listItems = optionsList.querySelectorAll('li');
        listItems.forEach(item => {
            if (item.textContent !== promptText) {
                item.style.display = 'none';
            }
        });
        optionsSection.querySelector('.custom-start').style.display = 'none';
    }

    showLoading();

    customStartInput.value = '';
    customFollowupInput.value = '';

    const historyForAPI = sessionState.currentStepIndex === -1
        ? [promptText]
        : sessionState.steps.slice(0, sessionState.currentStepIndex + 1).map(s => s.prompt).concat(promptText);

    try {
        const fetchedOptions = await fetchExpansions(historyForAPI);

        const newStep = { prompt: promptText, options: fetchedOptions };
        sessionState.currentStepIndex++;
        sessionState.steps = sessionState.steps.slice(0, sessionState.currentStepIndex);
        sessionState.steps.push(newStep);
        sessionState.isComplete = false;
        sessionState.finalSummary = null;
        saveState();
    } catch (error) {
        console.error('Error fetching expansions:', error);
        showError(`Failed to get next steps: ${error.message}. Please try again.`);
    } finally {
        hideLoading();
        render();
    }
}

// Handle custom followup prompt
async function handleCustomFollowupSubmit() {
    const text = customFollowupInput.value.trim();
    if (text) {
        hideError();

        if (sessionState.currentStepIndex >= 0) {
            const currentStep = sessionState.steps[sessionState.currentStepIndex];
            if (currentStep && currentStep.options && !currentStep.options.includes(text)) {
                currentStep.options.push(text);
                saveState();
            }
        }

        displaySubmittedItem(text, optionsList, optionsSection.querySelector('.custom-start'));
        showLoading();
        
        const historyForAPI = sessionState.steps.slice(0, sessionState.currentStepIndex + 1).map(s => s.prompt).concat(text);
        
        try {
            const fetchedOptions = await fetchExpansions(historyForAPI);
            
            const newStep = { prompt: text, options: fetchedOptions };
            sessionState.currentStepIndex++;
            sessionState.steps = sessionState.steps.slice(0, sessionState.currentStepIndex);
            sessionState.steps.push(newStep);
            sessionState.isComplete = false;
            sessionState.finalSummary = null;
            saveState();
        } catch (error) {
            console.error('Error fetching expansions:', error);
            showError(`Failed to get next steps: ${error.message}. Please try again.`);
        } finally {
            hideLoading();
            render();
        }
    }
}

submitCustomFollowupBtn.addEventListener('click', handleCustomFollowupSubmit);
customFollowupInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleCustomFollowupSubmit();
    }
});

// Back button
backBtn.addEventListener('click', () => {
    if (sessionState.currentStepIndex >= 0) {
        hideError();
        sessionState.currentStepIndex--;
        sessionState.isComplete = false;
        sessionState.finalSummary = null;
        saveState();
        render();
    }
});

// Reset button
resetBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to start over? Your current daydream will be lost.")) {
        resetState();
        saveState();
        render();
    }
});

// Complete button
let lastWakingMessage = '';

async function handleCompletion() {
    hideError();
    optionsSection.style.display = 'none';
    const newWakingMessage = getRandomMessage(loadingMessages.finalScreenMessages, lastWakingMessage);
    lastWakingMessage = newWakingMessage;
    showLoading(lastWakingMessage);
    
    const historyForAPI = sessionState.steps.slice(0, sessionState.currentStepIndex + 1).map(s => s.prompt);
    
    try {
        const summary = await fetchCompletion(historyForAPI);
        
        sessionState.isComplete = true;
        sessionState.finalSummary = summary;
        saveState();
    } catch (error) {
        console.error('Error completing dream:', error);
        showError(`Failed to complete your dream: ${error.message}. Please try again.`);
    } finally {
        hideLoading();
        render();
    }
}

completeBtn.addEventListener('click', handleCompletion);

// Final reset button
finalResetBtn.addEventListener('click', () => {
    resetState();
    saveState();
    render();
});

// Final go back button
if (goBackFromFinalBtn) {
    goBackFromFinalBtn.addEventListener('click', () => {
        if (sessionState.isComplete) {
            hideError();
            sessionState.isComplete = false;
            sessionState.finalSummary = null;
            saveState();
            render();
        }
    });
}