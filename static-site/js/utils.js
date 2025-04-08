// Utility functions for Daydream

// Function to decode the proxy token
function getProxyToken(tokenParts) {
    try {
        // Combine token parts and decode from base64
        const joinedToken = tokenParts.join('');
        return atob(joinedToken);
    } catch (e) {
        console.error("Failed to decode token:", e);
        return null;
    }
}

// Function to call the LLM API and get expansions or a summary
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

    // Clean up prompt history by removing any "..." at the end
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

    // Prepare payload for OpenAI API
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

        // Parse the response based on OpenAI's format
        if (!responseData.choices || responseData.choices.length === 0) {
            throw new Error("LLM response did not contain 'choices'.");
        }

        const generatedText = responseData.choices[0].message.content.trim();

        if (taskType === 'expand') {
            // Split the response into lines and clean them up
            const options = generatedText.split('\n')
                .map(opt => opt.trim())
                .filter(opt => opt.length > 0);

            // Ensure exactly 5 options, pad or truncate if necessary
            let finalOptions = [...options];
            if (finalOptions.length < 5) {
                finalOptions = finalOptions.concat(Array(5 - finalOptions.length).fill("..."));
            }
            finalOptions = finalOptions.slice(0, 5);
            
            return { status: 'success', data: finalOptions };
        } 
        else { // complete
            return { status: 'success', data: generatedText };
        }

    } catch (error) {
        console.error(`Error calling LLM API: ${error}`);
        return { status: 'error', message: `Failed to get response from AI: ${error.message}` };
    }
} 