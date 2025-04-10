export const defaultStartPrompts = [
    "I want to invent...",
    "Write me a story about...",
    "I'm thinking of a world where...",
    "What if technology could...",
    "Explore the concept of...",
    "Design a solution for...",
    "Imagine a future where...",
    "Create a character who...",
    "In an alternate reality...",
    "Transform everyday life by...",
    "Revolutionize the way we...",
    "Build a community around...",
    "Reinvent the concept of...",
    "Challenge the assumption that..."
];

export const loadingMessages = {
    promptSelectionMessages: [
        "Dreaming up possibilities...",
        "Exploring new ideas...",
        "Wandering through imagination...",
        "Chasing creative thoughts...",
        "Weaving dreams together...",
        "Gathering inspiration...",
        "Connecting the dots...",
        "Following the daydream...",
        "Brewing up ideas...",
        "Letting imagination flow..."
    ],

    finalScreenMessages: [
        "Waking up...",
        "Coming back to reality...",
        "Gathering the dream pieces...",
        "Crystallizing thoughts...",
        "Bringing the dream to life...",
        "Emerging from imagination...",
        "Capturing the essence...",
        "Drawing conclusions...",
        "Wrapping up the journey...",
        "Making sense of it all..."
    ],
}; 

export function formExpansionPrompt(fullPromptText) {
    const systemMessage = `You are a creative assistant helping a user expand their brainstorming thoughts. 
    Given the preceding brainstorming sequence, generate exactly 5 very short (5-10 words), distinct and creative continuation thoughts. The thoughts doesn't need to be complete sentences.
    Make sure to have 1 thought that provides a wildly different but related direction than the preceding brainstorming sequence.
    Provide *only* the 5 thoughts, each on a new line, without any numbering, bullets, or introductory text.`;
            
    const userMessage = `Continue this brainstorming sequence:\n---\n${fullPromptText}\n---`;
    return { systemMessage, userMessage }
}

export function formCompletionPrompt(fullPromptText) {
    const systemMessage = `You are a summarization assistant. Synthesize the following sequence of brainstorming thoughts 
    into a single, coherent paragraph representing the final thought or concept. 
    Capture the essence of the journey.`;
    
    const userMessage = `Summarize this brainstorming sequence:\n---\n${fullPromptText}\n---`;
    return { systemMessage, userMessage }
}