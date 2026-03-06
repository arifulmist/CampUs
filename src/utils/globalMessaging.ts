// Global messaging utilities for opening messages from anywhere in the app

/**
 * Opens the global message drawer with a specific user
 */
export function openGlobalMessage(userId: string, userName?: string): void {
  const event = new CustomEvent('campus:openMessage', {
    detail: { userId, userName }
  });
  window.dispatchEvent(event);
}

/**
 * Clears the global message target (useful for resetting state)
 */
export function clearGlobalMessageTarget(): void {
  const event = new CustomEvent('campus:clearMessage');
  window.dispatchEvent(event);
}