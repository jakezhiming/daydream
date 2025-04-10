import { 
    initialPromptsSection, 
    currentPromptSection,
    optionsSection,
    controlsSection,
    finalDreamSection,
    currentPromptText,
    promptHistoryDisplay,
    optionsList,
    customPromptInput,
    customFollowupInput,
    submitCustomPromptBtn,
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
import { handlePromptSelection } from './handler.js';
import { DaydreamConfig } from './config.js';
import { fallbackCopyTextToClipboard } from './utils.js';

export function render() {
    hideError();

    // Hide all sections first
    initialPromptsSection.style.display = 'none';
    currentPromptSection.style.display = 'none';
    optionsSection.style.display = 'none';
    controlsSection.style.display = 'none';
    finalDreamSection.style.display = 'none';

    if (sessionState.isComplete && sessionState.finalSummary) {
        renderFinalDream(sessionState.finalSummary);
        return;
    }

    // Initial Screen (first visit or after reset)
    if (sessionState.currentStepIndex === -1) {
        populateDefaultPrompts(handlePromptSelection);
        initialPromptsSection.style.display = 'block';
        customPromptInput.value = '';
        initialPromptsSection.querySelector('.custom-prompt').style.display = 'flex';
        if (submitCustomPromptBtn) {
            submitCustomPromptBtn.style.display = 'inline-block';
        }
        return;
    }

    // Show controls regardless of subsequent UI states after initial screen
    controlsSection.style.display = 'block';
    if (backBtn) backBtn.style.display = 'inline-block';
    if (resetBtn) resetBtn.style.display = 'inline-block';

    // Show current progress
    const currentStep = sessionState.steps[sessionState.currentStepIndex];
    if (!currentStep) {
        console.error("Render error: Invalid currentStepIndex or missing step data.", sessionState);
        showError("An internal error occurred. Please try resetting.");
        resetState();
        render();
        return;
    }

    // Display current prompt and history breadcrumbs
    currentPromptText.textContent = currentStep.prompt;
    currentPromptSection.style.display = 'block';

    promptHistoryDisplay.textContent = sessionState.steps
        .slice(0, sessionState.currentStepIndex)
        .map(s => s.prompt)
        .join(' → ') + 
        (sessionState.currentStepIndex > 0 ? ' → ' : '');

    // Display AI options from the current step's saved options
    optionsList.innerHTML = '';
    if (currentStep.options && Array.isArray(currentStep.options)) {
        currentStep.options.forEach(option => {
            const li = document.createElement('li');
            li.textContent = option;
            li.addEventListener('click', () => handlePromptSelection(option));
            optionsList.appendChild(li);
        });
    } else {
        console.warn("No options found for the current step:", currentStep);
    }

    customFollowupInput.value = '';
    optionsSection.querySelector('.custom-prompt').style.display = 'flex';
    optionsSection.style.display = 'block';

    // Update controls
    backBtn.disabled = sessionState.currentStepIndex < 0;

    const cycleCount = sessionState.currentStepIndex + 1;
    const shouldShowComplete = cycleCount >= DaydreamConfig.MIN_CYCLES_FOR_COMPLETE;
    completeBtn.style.display = shouldShowComplete ? 'inline-block' : 'none';
    completeBtn.disabled = !shouldShowComplete;
    completeBtn.style.cursor = shouldShowComplete ? 'pointer' : 'default';

    if (optionsSection.style.display === 'block' && submitCustomFollowupBtn) {
        submitCustomFollowupBtn.style.display = 'inline-block';
    }

    if (goBackFromFinalBtn) goBackFromFinalBtn.style.display = 'none';
}

export function renderFinalDream(summary) {
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
                            console.error('Failed to copy with Clipboard API: ', err);
                            fallbackCopyTextToClipboard(textToCopy, newShareBtn);
                        });
                } else {
                    console.error('Clipboard API not supported');
                    fallbackCopyTextToClipboard(textToCopy, newShareBtn);
                }
            }
        });
    }
}