// Import from modules
import { DaydreamConfig } from './config.js';
import { getRandomMessage } from './utils.js';

// --- DOM Elements ---
export const initialPromptsSection = document.getElementById('initial-prompts-section');
export const initialPromptList = document.getElementById('initial-prompt-list');
export const customPromptInput = document.getElementById('custom-prompt-input');
export const submitCustomPromptBtn = document.getElementById('submit-custom-prompt');

export const currentPromptSection = document.getElementById('current-prompt-section');
export const currentPromptText = document.getElementById('current-prompt-text');
export const promptHistoryDisplay = document.getElementById('prompt-history-display');

export const optionsSection = document.getElementById('options-section');
export const optionsList = document.getElementById('options-list');
export const customFollowupInput = document.getElementById('custom-followup-input');
export const submitCustomFollowupBtn = document.getElementById('submit-custom-followup');

export const controlsSection = document.getElementById('controls-section');
export const backBtn = document.getElementById('back-btn');
export const completeBtn = document.getElementById('complete-btn');
export const resetBtn = document.getElementById('reset-btn');
export const finalResetBtn = document.getElementById('final-reset-btn');

export const finalDreamSection = document.getElementById('final-dream-section');
export const finalDreamText = document.getElementById('final-dream-text');
export const goBackFromFinalBtn = document.getElementById('go-back-from-final-btn');

export const loadingIndicator = document.getElementById('loading-indicator');
export const errorMessage = document.getElementById('error-message');

// --- Utility Functions ---
const loadingIndicatorText = loadingIndicator.querySelector('p');

let lastLoadingMessage = '';

export function showLoading(message = null) {
    errorMessage.style.display = 'none';
    if (message) {
        loadingIndicatorText.textContent = message;
    } else {
        const newMessage = getRandomMessage(DaydreamConfig.LOADING_MESSAGES, lastLoadingMessage);
        lastLoadingMessage = newMessage;
        loadingIndicatorText.textContent = newMessage;
    }
    loadingIndicator.style.display = 'block';

    // Hide relevant buttons during loading
    if (submitCustomPromptBtn) submitCustomPromptBtn.style.display = 'none';
    if (submitCustomFollowupBtn) submitCustomFollowupBtn.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
    if (completeBtn) completeBtn.style.display = 'none';
    if (resetBtn) resetBtn.style.display = 'none';
}

export function hideLoading() {
    loadingIndicator.style.display = 'none';
}

export function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

export function hideError() {
    errorMessage.style.display = 'none';
}

export function populateDefaultPrompts(onPromptSelect) {
    initialPromptList.innerHTML = '';
    const shuffledPrompts = [...DaydreamConfig.DEFAULT_PROMPTS].sort(() => Math.random() - 0.5);
    const selectedPrompts = shuffledPrompts.slice(0, 5);

    selectedPrompts.forEach(promptText => {
        const li = document.createElement('li');
        li.textContent = promptText;
        li.addEventListener('click', () => onPromptSelect(promptText));
        initialPromptList.appendChild(li);
    });
}

export function displaySubmittedItem(text, listElement, inputContainerElement) {
    const listItems = listElement.querySelectorAll('li');
    listItems.forEach(item => item.style.display = 'none');

    if (inputContainerElement) {
        inputContainerElement.style.display = 'none';
    }

    const submittedLi = document.createElement('li');
    submittedLi.textContent = text;
    submittedLi.classList.add('submitted-item');
    listElement.appendChild(submittedLi);
}