/** Holds a chat-open request that arrives before the chat chunk loads. */

let queued = false;
let opener: HTMLElement | null = null;

export function queueChatOpen(el: HTMLElement | null) {
  queued = true;
  opener = el;
}

export function peekQueuedChat() {
  return { queued, opener };
}
