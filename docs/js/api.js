import { appConfig } from './config.js';
import { getProxyToken } from './utils.js';
import { formExpansionPrompt, formCompletionPrompt } from './prompts.js';

export async function fetchExpansions(historyForAPI) {
    try {
        const result = await getLLMResponse(historyForAPI, 'expand');

        if (result.status === 'success' && result.data) {
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to get expansions from AI.');
        }
    } catch (error) {
        console.error('Error during expansion API call:', error);
        throw error;
    }
}

export async function fetchCompletion(historyForAPI) {
    try {
        const result = await getLLMResponse(historyForAPI, 'complete');

        if (result.status === 'success' && result.data) {
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to complete dream with AI.');
        }
    } catch (error) {
        console.error('Error during completion API call:', error);
        throw error;
    }
}

async function getLLMResponse(promptHistory, taskType = 'expand') {
    const proxyServerUrl = appConfig.PROXY_SERVER_URL;
    const proxyToken = getProxyToken(appConfig.PROXY_TOKEN_PARTS);
    
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
        const result = formExpansionPrompt(fullPromptText);
        systemMessage = result.systemMessage;
        userMessage = result.userMessage;
    } 
    else if (taskType === 'complete') {
        const result = formCompletionPrompt(fullPromptText);
        systemMessage = result.systemMessage;
        userMessage = result.userMessage;
    } 
    else {
        return { status: 'error', message: 'Invalid task type specified.' };
    }

    const payload = {
        "model": appConfig.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": systemMessage},
            {"role": "user", "content": userMessage}
        ],
        "max_tokens": appConfig.MAX_TOKENS,
        "temperature": appConfig.TEMPERATURE,
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