(() => {
  'use strict';
  const form = document.querySelector('#interest-form');
  if (!form) return;
  const email = document.querySelector('#email');
  const consent = document.querySelector('#consent');
  const error = document.querySelector('#email-error');
  const status = document.querySelector('#email-status');
  const progress = document.querySelector('#signup-progress');
  const button = document.querySelector('#signup-submit');
  const label = document.querySelector('#signup-label');
  let saving = false;
  form.hidden = false;

  function clearError() {
    email.removeAttribute('aria-invalid');
    consent.removeAttribute('aria-invalid');
    error.hidden = true;
    error.textContent = '';
  }
  function showError(message, field) {
    error.textContent = message;
    error.hidden = false;
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }
  function setSaving(value) {
    saving = value;
    button.disabled = value;
    email.readOnly = value;
    consent.disabled = value;
    form.setAttribute('aria-busy', String(value));
    progress.hidden = !value;
    label.textContent = value ? 'Saving…' : 'Join the waitlist';
  }
  document.querySelectorAll('[data-interest]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // Let the native anchor jump finish before assigning keyboard focus.
      requestAnimationFrame(() => document.querySelector('#waitlist-title').focus({ preventScroll: true }));
    });
  });
  email.addEventListener('input', clearError);
  consent.addEventListener('change', clearError);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    clearError();
    email.value = email.value.trim();
    if (!email.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      showError('Enter a valid email address.', email);
      return;
    }
    if (!consent.checked) {
      showError('Tick the box to receive event updates.', consent);
      return;
    }
    setSaving(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        signal: controller.signal,
        body: JSON.stringify({ email: email.value, consent: true, company: form.elements.company.value, source: 'website' }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        if (result?.saved === true && result?.notificationPending === true) {
          throw new Error('Your interest is saved. We couldn’t notify the society yet—please try again in a moment. You won’t be added twice.');
        }
        throw new Error(response.status === 429 ? 'Please wait a minute, then try again.' : 'We couldn’t save your interest. Please try again, or email the society below.');
      }
      form.hidden = true;
      status.hidden = false;
      status.focus();
    } catch (failure) {
      showError(failure.name === 'AbortError' ? 'We couldn’t confirm your signup. Please try again; you won’t be added twice.' : failure.message === 'Failed to fetch' ? 'You appear to be offline. Check your connection and try again.' : failure.message);
    } finally {
      clearTimeout(timeout);
      setSaving(false);
    }
  });
})();
