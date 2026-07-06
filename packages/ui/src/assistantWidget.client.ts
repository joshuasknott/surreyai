export function initSocietyAssistant(root: Element | null, options: { open?: boolean } = {}) {
  if (!(root instanceof HTMLElement) || root.dataset.initialized === 'true') return;
  const widgetRoot = root;
  root.dataset.initialized = 'true';

  const endpoint = root.dataset.endpoint || '/api/assistant/chat';
  const societyName = root.dataset.societyName || 'the society';
  const shortName = root.dataset.shortName || societyName;
  const starters = readJsonArray(root.dataset.starterPrompts);
  const toggle = root.querySelector<HTMLButtonElement>('.assistant-toggle');
  const panel = root.querySelector<HTMLElement>('.assistant-panel');
  const closeButton = root.querySelector<HTMLButtonElement>('.assistant-close');
  const resetButton = root.querySelector<HTMLButtonElement>('.assistant-reset');
  const form = root.querySelector<HTMLFormElement>('.assistant-form');
  const input = root.querySelector<HTMLTextAreaElement>('.assistant-input');
  const sendButton = root.querySelector<HTMLButtonElement>('.assistant-send');
  const messagesEl = root.querySelector<HTMLElement>('.assistant-messages');
  const startersEl = root.querySelector<HTMLElement>('.assistant-starters');
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let lastFocus: Element | null = null;
  let isSending = false;

  starters.forEach((prompt) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'assistant-starter';
    button.textContent = prompt;
    button.addEventListener('click', () => submitMessage(prompt));
    startersEl?.appendChild(button);
  });

  toggle?.addEventListener('click', () => {
    if (panel?.hidden) openPanel();
    else closePanel();
  });

  closeButton?.addEventListener('click', closePanel);
  resetButton?.addEventListener('click', resetConversation);

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitMessage(input?.value || '');
  });

  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage(input.value || '');
    }
  });

  input?.addEventListener('input', autoResizeInput);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel?.hidden) {
      closePanel();
    }
  });

  if (options.open) {
    openPanel();
  }

  function autoResizeInput() {
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
  }

  function openPanel() {
    lastFocus = document.activeElement;
    if (panel) panel.hidden = false;
    toggle?.setAttribute('aria-expanded', 'true');
    toggle?.setAttribute('aria-label', `Close ${shortName} assistant`);
    window.setTimeout(() => input?.focus(), 0);
  }

  function closePanel() {
    if (panel) panel.hidden = true;
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', `Open ${shortName} assistant`);
    if (lastFocus instanceof HTMLElement) {
      lastFocus.focus();
    } else {
      toggle?.focus();
    }
  }

  function resetConversation() {
    messages.splice(0, messages.length);
    if (messagesEl) messagesEl.textContent = '';
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    startersEl?.removeAttribute('hidden');
    input?.focus();
  }

  async function submitMessage(rawText: string) {
    const text = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!text || isSending) return;

    if (panel?.hidden) openPanel();
    isSending = true;
    setDisabled(true);
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    appendMessage('user', text);
    messages.push({ role: 'user', content: text });
    startersEl?.setAttribute('hidden', '');
    const loading = appendMessage('loading', `${shortName} assistant is thinking...`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await response.json().catch(() => ({}));

      loading?.remove();

      if (typeof data.message === 'string') {
        const reply = data.message.trim();
        appendMessage('assistant', reply || `I could not answer that from the ${societyName} context right now.`);
        messages.push({ role: 'assistant', content: reply });
        return;
      }

      throw new Error('Assistant request failed');
    } catch {
      loading?.remove();
      appendMessage('error', 'The assistant is unavailable right now. Please try again shortly or use the site links.');
    } finally {
      isSending = false;
      setDisabled(false);
      input?.focus();
    }
  }

  function appendMessage(role: 'user' | 'assistant' | 'loading' | 'error', text: string) {
    if (!messagesEl) return null;
    const item = document.createElement('div');
    item.className = `assistant-message ${role}`;
    item.textContent = text;
    messagesEl.appendChild(item);
    item.scrollIntoView({ block: 'end', behavior: 'smooth' });
    return item;
  }

  function setDisabled(disabled: boolean) {
    if (input) input.disabled = disabled;
    if (sendButton) sendButton.disabled = disabled;
    widgetRoot.querySelectorAll<HTMLButtonElement>('.assistant-starter').forEach((button) => {
      button.disabled = disabled;
    });
  }
}

function readJsonArray(value: string | undefined) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
