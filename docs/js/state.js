import { appConfig } from './config.js';

export let sessionState = {
    steps: [], // Array of { prompt: string, options: string[] }
    currentStepIndex: -1, // -1: initial screen, 0: first step completed, etc.
    isComplete: false,
    finalSummary: null,
};

export function saveState() {
    try {
        localStorage.setItem(appConfig.STORAGE_KEY, JSON.stringify(sessionState));
    } catch (e) {
        console.error("Failed to save state to localStorage:", e);
    }
}

export function loadState() {
    try {
        const savedState = localStorage.getItem(appConfig.STORAGE_KEY);
        if (savedState) {
            sessionState = JSON.parse(savedState);
            if (!Array.isArray(sessionState.steps)) sessionState.steps = [];
            if (typeof sessionState.currentStepIndex !== 'number') sessionState.currentStepIndex = -1;
            if (typeof sessionState.isComplete !== 'boolean') sessionState.isComplete = false;
            if (sessionState.isComplete && typeof sessionState.finalSummary !== 'string') {
                console.warn("Loaded session is marked complete, but summary text is missing. Resetting completion status.");
                sessionState.isComplete = false;
                sessionState.finalSummary = null;
                if (sessionState.steps.length === 0) {
                    resetState();
                    return;
                 } else {
                     sessionState.currentStepIndex = Math.max(-1, Math.min(sessionState.currentStepIndex, sessionState.steps.length - 1));
                 }
            }
            if (sessionState.steps.length === 0) {
                sessionState.currentStepIndex = -1;
            } else {
                sessionState.currentStepIndex = Math.max(-1, Math.min(sessionState.currentStepIndex, sessionState.steps.length - 1));
            }

        } else {
            resetState();
        }
    } catch (e) {
        console.error("Failed to load state from localStorage:", e);
        resetState();
    }
}

export function resetState() {
    sessionState = {
        steps: [],
        currentStepIndex: -1,
        isComplete: false,
        finalSummary: null
    };
    localStorage.removeItem(appConfig.STORAGE_KEY);
}