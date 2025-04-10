import { showError } from './ui.js';

export function getRandomMessage(messages, lastShown) {
    let availableMessages = messages.filter(msg => msg !== lastShown);
    if (availableMessages.length === 0) {
        return messages[Math.floor(Math.random() * messages.length)];
    }
    return availableMessages[Math.floor(Math.random() * availableMessages.length)];
}

export function fallbackCopyTextToClipboard(text, buttonElement) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);

        const focusedElement = document.activeElement;

        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        
        document.body.removeChild(textArea);
        
        if (focusedElement) focusedElement.focus();
        
        if (successful) {
            buttonElement.classList.add('copied');
            buttonElement.textContent = 'Copied!';

            setTimeout(() => {
                buttonElement.classList.remove('copied');
                buttonElement.textContent = 'Share';
            }, 3000);
        } else {
            showError('Failed to copy to clipboard. Please try again or copy manually.');
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        showError('Failed to copy to clipboard. Please try again or copy manually.');
    }
}

export function getProxyToken(tokenParts) {
    try {
        const joinedToken = tokenParts.join('');
        return atob(joinedToken);
    } catch (e) {
        console.error("Failed to decode token:", e);
        return null;
    }
}