export function initSocietyAssistant(root: Element | null, options: { open?: boolean } = {}) {
  if (!(root instanceof HTMLElement) || root.dataset.initialized === 'true') return;
  const widgetRoot = root;
  root.dataset.initialized = 'true';

  const endpoint = root.dataset.endpoint || '/api/assistant/chat';
  const societyName = root.dataset.societyName || 'the society';
  const shortName = root.dataset.shortName || societyName;
  const toggle = root.querySelector<HTMLButtonElement>('.assistant-toggle');
  const panel = root.querySelector<HTMLElement>('.assistant-panel');
  const closeButton = root.querySelector<HTMLButtonElement>('.assistant-close');
  const resetButton = root.querySelector<HTMLButtonElement>('.assistant-reset');
  const form = root.querySelector<HTMLFormElement>('.assistant-form');
  const input = root.querySelector<HTMLTextAreaElement>('.assistant-input');
  const sendButton = root.querySelector<HTMLButtonElement>('.assistant-send');
  const body = root.querySelector<HTMLElement>('.assistant-body');
  const messagesEl = root.querySelector<HTMLElement>('.assistant-messages');
  const welcome = root.querySelector<HTMLElement>('.assistant-welcome');
  const startersEl = root.querySelector<HTMLElement>('.assistant-starters');
  const recovery = root.querySelector<HTMLElement>('.assistant-recovery');
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let lastFocus: Element | null = null;
  let isSending = false;

  startersEl?.querySelectorAll<HTMLButtonElement>('.assistant-starter').forEach((button) => {
    button.addEventListener('click', () => submitMessage(button.dataset.prompt || ''));
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

  input?.addEventListener('input', () => {
    autoResizeInput();
    updateSendButton();
  });
  updateSendButton();

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
    if (isSending) return;
    messages.splice(0, messages.length);
    if (messagesEl) messagesEl.textContent = '';
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    startersEl?.removeAttribute('hidden');
    if (welcome) welcome.hidden = false;
    if (recovery) recovery.hidden = true;
    updateSendButton();
    input?.focus();
  }

  async function submitMessage(rawText: string) {
    const text = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!text || isSending) return;

    if (panel?.hidden) openPanel();
    isSending = true;
    if (recovery) recovery.hidden = true;
    setDisabled(true);
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    appendMessage('user', text);
    messages.push({ role: 'user', content: text });
    const loading = appendMessage('loading', `${shortName} assistant is thinking...`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await response.json().catch(() => ({}));

      loading?.remove();

      if (!response.ok) {
        appendMessage('error', typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : 'The assistant is unavailable right now. Please try again shortly or use the site links.');
        if (recovery) recovery.hidden = false;
        return;
      }

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
      if (recovery) recovery.hidden = false;
    } finally {
      isSending = false;
      setDisabled(false);
      if (!panel?.hidden) input?.focus();
    }
  }

  function appendMessage(role: 'user' | 'assistant' | 'loading' | 'error', text: string) {
    if (!messagesEl) return null;
    const item = document.createElement('div');
    item.className = `assistant-message ${role}`;
    if (role === 'assistant') appendLinkedText(item, text);
    else item.textContent = text;
    messagesEl.appendChild(item);
    if (body) body.scrollTop = body.scrollHeight;
    return item;
  }

  function setDisabled(disabled: boolean) {
    if (input) input.disabled = disabled;
    updateSendButton();
    if (resetButton) resetButton.disabled = disabled;
    widgetRoot.querySelectorAll<HTMLButtonElement>('.assistant-starter').forEach((button) => {
      button.disabled = disabled;
    });
  }

  function updateSendButton() {
    if (sendButton) sendButton.disabled = isSending || !input?.value.trim();
  }
}

const LINK_PATTERN = /\[([^\]\n]{1,100})\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|\/#[-\w]+)\)|(https?:\/\/[^\s<>()]+)|([\w.+-]+@[\w.-]+\.[a-z]{2,})/gi;

function appendLinkedText(container: HTMLElement, text: string) {
  let previousEnd = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    container.append(document.createTextNode(text.slice(previousEnd, start)));

    const markdownLabel = match[1];
    const rawLink = match[2] || match[3] || match[4] || '';
    const href = match[4] ? `mailto:${rawLink}` : rawLink.replace(/[.,;!?]+$/, '');
    const trailing = rawLink.slice(match[4] ? rawLink.length : href.length);
    const safeHref = getSafeHref(href);

    if (safeHref) {
      const anchor = document.createElement('a');
      anchor.href = safeHref;
      anchor.textContent = markdownLabel || getLinkLabel(href);
      if (safeHref.startsWith('http')) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }
      container.append(anchor);
    } else {
      container.append(document.createTextNode(match[0]));
    }
    if (trailing) container.append(document.createTextNode(trailing));
    previousEnd = start + match[0].length;
  }
  container.append(document.createTextNode(text.slice(previousEnd)));
}

function getSafeHref(href: string): string | null {
  if (/^\/#[-\w]+$/.test(href)) return href;
  try {
    const url = new URL(href);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function getLinkLabel(href: string): string {
  if (href.startsWith('mailto:')) return `${href.slice(7)} ↗`;
  try {
    const host = new URL(href).hostname.replace(/^www\./, '');
    const names: Record<string, string> = {
      'instagram.com': 'Instagram',
      'linkedin.com': 'LinkedIn',
      'surreyunion.org': "Surrey Students' Union",
      'chat.whatsapp.com': 'WhatsApp',
    };
    return `${names[host] || host} ↗`;
  } catch {
    return href;
  }
}
