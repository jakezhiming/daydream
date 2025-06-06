import { populateDefaultPrompts } from './ui.js';
import { handlePromptSelection } from './handler.js';
import { loadState, sessionState, saveState } from './state.js';
import { render, renderFinalScreen } from './render.js';

document.addEventListener('DOMContentLoaded', () => {

    function initialize() {
        loadState();
        populateDefaultPrompts(handlePromptSelection);

        if (sessionState.isComplete && sessionState.finalSummary) {
            renderFinalScreen(sessionState.finalSummary);
        } else {
            if(sessionState.isComplete && !sessionState.finalSummary) {
                sessionState.isComplete = false;
                saveState();
            }
            render();
        }
    }

    initialize();
}); 