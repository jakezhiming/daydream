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
    "Challenge the assumption that...",
    "Envision a society where...",
    "Reimagine the process of...",
    "Develop a strategy for...",
    "Discover an alternative to...",
    "How might we improve the experience of...",
    "Pioneer a movement for...",
    "Design an experiment that...",
    "Think about a product that would...",
    "Solve the mystery of...",
    "Illustrate the journey of...",
    "Propose a method for...",
    "Conceptualize a space that...",
    "What would it look like if history had...",,
    "If animals could talk, they would say...",
    "Draft a new law that would...",
    "Explore the implications of...",
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
    const systemMessage = `You are a creative assistant helping a user expand or dive deeper into their brainstorming thoughts. 
Given the preceding brainstorming sequence, generate exactly 5 very short (5-10 words), distinct and creative continuation thoughts. The thoughts do not need to be complete sentences.
Include a thought that focuses solely on the user's latest thought. Include another thought that provides a wild but related direction than the preceding brainstorming sequence.
Provide *only* the 5 thoughts, each on a new line, without any numbering, bullets, or introductory text.`;
            
    const userMessage = `Continue this brainstorming sequence:\n---\n${fullPromptText}\n---`;
    return { systemMessage, userMessage }
}

export function formCompletionPrompt(fullPromptText) {
    const systemMessage = `You are a summarization and synthesis assistant for a user's dreaming thoughts.
Synthesize the following sequence of dreaming thoughts into a single, coherent paragraph representing the final 'dream'. Write in second person.
Capture the essence of the journey.`;
    
    const userMessage = `Summarize this dreaming sequence:\n---\n${fullPromptText}\n---`;
    return { systemMessage, userMessage }
}