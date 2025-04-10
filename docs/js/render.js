import { 
    initialPromptsSection, 
    currentPromptSection,
    optionsSection,
    controlsSection,
    finalDreamSection,
    currentPromptText,
    promptHistoryDisplay,
    optionsList,
    customStartInput,
    customFollowupInput,
    submitCustomStartBtn,
    submitCustomFollowupBtn,
    backBtn,
    resetBtn,
    completeBtn,
    finalDreamText,
    goBackFromFinalBtn,
    hideError,
    showError,
    populateDefaultPrompts
} from './ui.js';

import { sessionState, resetState } from './state.js';
import { handlePromptSelection, attachOptionEventListeners } from './handler.js';
import { appConfig } from './config.js';
import { fallbackCopyTextToClipboard } from './utils.js';

function hideAllSections() {
    initialPromptsSection.style.display = 'none';
    currentPromptSection.style.display = 'none';
    optionsSection.style.display = 'none';
    controlsSection.style.display = 'none';
    finalDreamSection.style.display = 'none';
}

function renderInitialScreen() {
    populateDefaultPrompts(handlePromptSelection);
    initialPromptsSection.style.display = 'block';
    customStartInput.value = '';
    initialPromptsSection.querySelector('.custom-start').style.display = 'flex';
    if (submitCustomStartBtn) {
        submitCustomStartBtn.style.display = 'inline-block';
    }
}

function renderCurrentPrompt(currentStep) {
    currentPromptText.textContent = currentStep.prompt;
    currentPromptSection.style.display = 'block';

    // Update prompt history display
    promptHistoryDisplay.textContent = sessionState.steps
        .slice(0, sessionState.currentStepIndex)
        .map(s => s.prompt)
        .join(' → ') + 
        (sessionState.currentStepIndex > 0 ? ' → ' : '');
}

function renderNextPrompts(currentStep) {
    optionsList.innerHTML = '';
    if (currentStep.options && Array.isArray(currentStep.options)) {
        currentStep.options.forEach(option => {
            const li = document.createElement('li');
            li.textContent = option;
            optionsList.appendChild(li);
        });
        attachOptionEventListeners();
        
    } else {
        console.warn("No options found for the current step:", currentStep);
    }

    customFollowupInput.value = '';
    optionsSection.querySelector('.custom-start').style.display = 'flex';
    optionsSection.style.display = 'block';
}

function updateButtons() {
    controlsSection.style.display = 'block';
    if (backBtn) backBtn.style.display = 'inline-block';
    if (resetBtn) resetBtn.style.display = 'inline-block';
    
    backBtn.disabled = sessionState.currentStepIndex < 0;

    const cycleCount = sessionState.currentStepIndex + 1;
    const shouldShowComplete = cycleCount >= appConfig.MIN_CYCLES_FOR_COMPLETE;
    completeBtn.style.display = shouldShowComplete ? 'inline-block' : 'none';
    completeBtn.disabled = !shouldShowComplete;
    completeBtn.style.cursor = shouldShowComplete ? 'pointer' : 'default';

    if (optionsSection.style.display === 'block' && submitCustomFollowupBtn) {
        submitCustomFollowupBtn.style.display = 'inline-block';
    }

    if (goBackFromFinalBtn) goBackFromFinalBtn.style.display = 'none';
}

export function renderFinalScreen(summary) {
    hideAllSections();
    finalDreamSection.style.display = 'block';
    if (goBackFromFinalBtn) goBackFromFinalBtn.style.display = 'inline-block';

    finalDreamText.textContent = summary;
    setupShareButton(summary);
}

function setupShareButton(summary) {
    const shareDreamBtn = document.getElementById('share-dream-btn');
    if (shareDreamBtn) {
        shareDreamBtn.style.display = 'inline-block';
        
        const newShareBtn = shareDreamBtn.cloneNode(true);
        shareDreamBtn.parentNode.replaceChild(newShareBtn, shareDreamBtn);
        
        newShareBtn.addEventListener('click', () => {
            if (summary) {
                const textToCopy = `${summary}
- Created with Daydream`;
                
                // Try to use the clipboard API
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(textToCopy)
                        .then(() => {
                            newShareBtn.classList.add('copied');
                            newShareBtn.textContent = 'Copied!';
                            
                            setTimeout(() => {
                                newShareBtn.classList.remove('copied');
                                newShareBtn.textContent = 'Share';
                            }, 3000);
                        })
                        .catch(err => {
                            console.warn('Failed to copy with Clipboard API: ', err);
                            fallbackCopyTextToClipboard(textToCopy, newShareBtn);
                        });
                } else {
                    console.warn('Clipboard API not supported');
                    fallbackCopyTextToClipboard(textToCopy, newShareBtn);
                }
            }
        });
    }
}

export function render() {
    hideError();
    hideAllSections();

    // Final screen
    if (sessionState.isComplete && sessionState.finalSummary) {
        renderFinalScreen(sessionState.finalSummary);
        return;
    }

    // Initial screen
    if (sessionState.currentStepIndex === -1) {
        renderInitialScreen();
        return;
    }

    // Current step
    const currentStep = sessionState.steps[sessionState.currentStepIndex];
    if (!currentStep) {
        console.error("Render error: Invalid currentStepIndex or missing step data.", sessionState);
        showError("An internal error occurred. Please try resetting.");
        resetState();
        render();
        return;
    }

    renderCurrentPrompt(currentStep);
    renderNextPrompts(currentStep);
    updateButtons();
}