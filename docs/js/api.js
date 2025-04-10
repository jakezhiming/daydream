import { DaydreamConfig } from './config.js';
import { sessionState, saveState } from './state.js';
import { showLoading, hideLoading, hideError, showError, optionsSection } from './ui.js';
import { getRandomMessage, getProxyToken } from './utils.js';
import { render } from './render.js';

export async function fetchExpansions(chosenPrompt) {
    showLoading();
    hideError();

    const historyForAPI = sessionState.currentStepIndex === -1
        ? [chosenPrompt]
        : sessionState.steps.slice(0, sessionState.currentStepIndex + 1).map(s => s.prompt).concat(chosenPrompt);

    try {
        const result = await getLLMResponse(historyForAPI, 'expand');

        if (result.status === 'success' && result.data) {
            const fetchedOptions = result.data;
            const newStep = { prompt: chosenPrompt, options: fetchedOptions };

            sessionState.currentStepIndex++;
            sessionState.steps = sessionState.steps.slice(0, sessionState.currentStepIndex);
            sessionState.steps.push(newStep);

            sessionState.isComplete = false;
            sessionState.finalSummary = null;
            saveState();
        } else {
            throw new Error(result.message || 'Failed to get expansions from AI.');
        }
    } catch (error) {
        console.error('Error fetching expansions:', error);
        showError(`Failed to get next steps: ${error.message}. Please try again.`);
    } finally {
        hideLoading();
        render();
    }
}

let lastWakingMessage = '';

export async function fetchCompletion() {
    hideError();
    
    optionsSection.style.display = 'none';
    const newWakingMessage = getRandomMessage(DaydreamConfig.WAKING_MESSAGES, lastWakingMessage);
    lastWakingMessage = newWakingMessage;
    showLoading(newWakingMessage);

    const historyForAPI = sessionState.steps.slice(0, sessionState.currentStepIndex + 1).map(s => s.prompt);

    try {
        const result = await getLLMResponse(historyForAPI, 'complete');

        if (result.status === 'success' && result.data) {
            sessionState.isComplete = true;
            sessionState.finalSummary = result.data;
            saveState();
        } else {
            throw new Error(result.message || 'Failed to complete dream with AI.');
        }
    } catch (error) {
        console.error('Error completing dream:', error);
        showError(`Failed to complete your dream: ${error.message}. Please try again.`);
    } finally {
        hideLoading();
        render();
    }
}

async function getLLMResponse(promptHistory, taskType = 'expand') {
    const proxyServerUrl = DaydreamConfig.PROXY_SERVER_URL;
    const proxyToken = getProxyToken(DaydreamConfig.PROXY_TOKEN_PARTS);
    
    if (!proxyServerUrl) {
        console.error("Proxy server URL not configured");
        return { status: 'error', message: 'Proxy server URL not configured.' };
    }

    if (!proxyToken) {
        console.error("Proxy token not configured");
        return { status: 'error', message: 'Proxy token not configured.' };
    }

    const cleanPromptHistory = promptHistory.map(prompt => prompt.replace("...", ""));
    const fullPromptText = cleanPromptHistory.join("\n");
    
    let systemMessage = "";
    let userMessage = "";

    if (taskType === 'expand') {
        systemMessage = `You are a creative assistant helping a user expand their daydreaming thoughts. 
Given the preceding daydream sequence, generate exactly 5 very short, simple, distinct and creative continuation prompts. 
Make sure to have 1 prompt that provides a wildly different direction than the rest of the prompts.
Provide *only* the 5 prompts, each on a new line, without any numbering, bullets, or introductory text.`;
        
        userMessage = `Continue this daydream sequence:\n---\n${fullPromptText}\n---`;
    } 
    else if (taskType === 'complete') {
        systemMessage = `You are a summarization assistant. Synthesize the following sequence of thoughts 
into a single, coherent paragraph representing the final 'daydream' or concept. 
Capture the essence of the journey.`;

        userMessage = `Summarize this ideation sequence:\n---\n${fullPromptText}\n---`;
    } 
    else {
        return { status: 'error', message: 'Invalid task type specified.' };
    }

    const payload = {
        "model": DaydreamConfig.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": systemMessage},
            {"role": "user", "content": userMessage}
        ],
        "max_tokens": 200,
        "temperature": 0.3,
    };

    try {
        const response = await fetch(`${proxyServerUrl}api/openai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Token': proxyToken
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, ${errorText}`);
        }

        const responseData = await response.json();

        if (!responseData.choices || responseData.choices.length === 0) {
            throw new Error("LLM response did not contain 'choices'.");
        }

        const generatedText = responseData.choices[0].message.content.trim();

        if (taskType === 'expand') {
            const options = generatedText.split('\n')
                .map(opt => opt.trim())
                .filter(opt => opt.length > 0);

            let finalOptions = [...options];
            if (finalOptions.length < 5) {
                finalOptions = finalOptions.concat(Array(5 - finalOptions.length).fill("..."));
            }
            finalOptions = finalOptions.slice(0, 5);
            
            return { status: 'success', data: finalOptions };
        } 
        else {
            return { status: 'success', data: generatedText };
        }

    } catch (error) {
        console.error(`Error calling LLM API: ${error}`);
        return { status: 'error', message: `Failed to get response from AI: ${error.message}` };
    }
} 