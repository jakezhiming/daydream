import { 
    submitCustomPromptBtn, 
    customPromptInput, 
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
    displaySubmittedItem
} from './ui.js';

import { fetchExpansions, fetchCompletion } from './api.js';
import { sessionState, saveState, resetState } from './state.js';
import { render } from './render.js';

export function handlePromptSelection(promptText) {
    hideError();

    if (sessionState.currentStepIndex === -1) {
        const listItems = initialPromptList.querySelectorAll('li');
        listItems.forEach(item => {
            if (item.textContent !== promptText) {
                item.style.display = 'none';
            }
        });
        initialPromptsSection.querySelector('.custom-prompt').style.display = 'none';
    } else {
        const listItems = optionsList.querySelectorAll('li');
        listItems.forEach(item => {
            if (item.textContent !== promptText) {
                item.style.display = 'none';
            }
        });
        optionsSection.querySelector('.custom-prompt').style.display = 'none';
    }

    showLoading();

    customPromptInput.value = '';
    customFollowupInput.value = '';

    fetchExpansions(promptText);
}

// Custom prompt
function handleCustomPromptSubmit() {
    const text = customPromptInput.value.trim();
    if (text) {
        hideError();
        displaySubmittedItem(text, initialPromptList, initialPromptsSection.querySelector('.custom-prompt'));
        showLoading();
        fetchExpansions(text);
    }
}

submitCustomPromptBtn.addEventListener('click', handleCustomPromptSubmit);
customPromptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleCustomPromptSubmit();
    }
});

// Custom followup
function handleCustomFollowupSubmit() {
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

        displaySubmittedItem(text, optionsList, optionsSection.querySelector('.custom-prompt'));
        showLoading();
        fetchExpansions(text);
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
completeBtn.addEventListener('click', fetchCompletion);

// Final reset button
finalResetBtn.addEventListener('click', () => {
    resetState();
    saveState();
    render();
});

// Go back from final button
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