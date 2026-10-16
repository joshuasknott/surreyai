type SignInAttempt = { status: string; createdSessionId: string | null; supportedFirstFactors?: { strategy: string; emailAddressId?: string }[] };
export type ClerkSession = { id: string; getToken(options: { template: string; skipCache?: boolean }): Promise<string | null> };
export type ClerkSDK = {
  session: ClerkSession | null;
  client: { signIn: {
    create(options: { identifier: string }): Promise<SignInAttempt>;
    prepareFirstFactor(options: { strategy: 'email_code'; emailAddressId: string }): Promise<unknown>;
    attemptFirstFactor(options: { strategy: 'email_code'; code: string }): Promise<SignInAttempt>;
  } };
  load(options?: Record<string, unknown>): Promise<void>;
  setActive(options: { session: string }): Promise<void>;
  signOut(): Promise<void>;
  addListener(callback: (state: { session: ClerkSession | null }) => void): () => void;
};

/** Our form uses Clerk's email-code verification and persistent session cookies.
 * No credentials or session tokens are stored by the application. */
export function createPlannerSignIn(clerk: ClerkSDK, onSignedIn: () => Promise<void>) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const panel = $('sign-in');
  const emailForm = $<HTMLFormElement>('email-sign-in');
  const codeForm = $<HTMLFormElement>('code-sign-in');
  const emailInput = $<HTMLInputElement>('sign-in-email');
  const codeInput = $<HTMLInputElement>('sign-in-code');
  const send = $<HTMLButtonElement>('send-code');
  const verify = $<HTMLButtonElement>('verify-code');
  const resend = $<HTMLButtonElement>('resend-code');
  const change = $<HTMLButtonElement>('change-email');
  const feedback = $('sign-in-feedback');
  let email = '';
  let busy = false;
  let resendAt = 0;
  let timer: number | undefined;

  function updateCooldown() {
    const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
    resend.textContent = seconds ? `Resend in ${seconds}s` : 'Resend code';
    resend.disabled = busy || seconds > 0;
    if (!seconds && timer !== undefined) { clearInterval(timer); timer = undefined; }
  }
  function setBusy(value: boolean) {
    busy = value; emailInput.disabled = value;
    send.disabled = value; verify.disabled = value; change.disabled = value;
    updateCooldown();
  }
  function showError(error: unknown) {
    const code = (error as { errors?: { code?: string }[] })?.errors?.[0]?.code;
    if (code === 'form_code_incorrect') feedback.textContent = 'That code is incorrect. Check the email and try again.';
    else if (code === 'verification_expired' || code === 'verification_failed' || code === 'form_code_expired') feedback.textContent = 'That code has expired. Request a new code.';
    else if (code === 'too_many_requests' || code === 'rate_limit_exceeded' || code === 'too_many_verification_attempts') feedback.textContent = 'Too many attempts. Wait a few minutes and request a new code.';
    else if (code === 'form_identifier_not_found') feedback.textContent = 'This email is not ready for sign-in. Ask Josh to add it in Settings.';
    else feedback.textContent = !code && error instanceof Error && error.name === 'Error' ? error.message : 'Could not complete sign-in. Please try again.';
  }
  async function sendCode(address: string) {
    if (busy) return;
    setBusy(true); feedback.textContent = ''; send.textContent = 'Sending code…';
    try {
      const response = await fetch('/api/planner/sign-in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: address }), signal: AbortSignal.timeout(15000) });
      const body = await response.json();
      if (!response.ok || body.allowed !== true) throw new Error(body.error || 'Could not check committee access. Please try again.');
      const attempt = await clerk.client.signIn.create({ identifier: address });
      const factor = attempt.supportedFirstFactors?.find(factor => factor.strategy === 'email_code' && factor.emailAddressId);
      if (!factor?.emailAddressId) throw new Error('Email code sign-in is unavailable for this account. Please contact Josh.');
      await clerk.client.signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      email = address; $('code-destination').textContent = `We sent a sign-in code to ${email}.`;
      emailForm.hidden = true; codeForm.hidden = false; codeInput.value = '';
      resendAt = Date.now() + 60000;
      if (timer !== undefined) clearInterval(timer);
      timer = window.setInterval(updateCooldown, 1000);
      codeInput.focus();
    } catch (error) { showError(error); }
    finally { send.textContent = 'Send sign-in code'; setBusy(false); }
  }
  function show() {
    if (timer !== undefined) clearInterval(timer); timer = undefined; resendAt = 0;
    panel.hidden = false; emailForm.hidden = false; codeForm.hidden = true;
    codeInput.value = ''; email = ''; feedback.textContent = ''; setBusy(false);
  }
  function hide() {
    panel.hidden = true; codeInput.value = '';
    if (timer !== undefined) clearInterval(timer); timer = undefined;
  }
  emailForm.onsubmit = event => { event.preventDefault(); void sendCode(emailInput.value.trim().toLowerCase()); };
  resend.onclick = () => { if (!resend.disabled && email) void sendCode(email); };
  change.onclick = () => { if (!busy) { show(); emailInput.focus(); } };
  codeForm.onsubmit = event => { event.preventDefault(); if (busy || !email) return; void (async () => {
    setBusy(true); feedback.textContent = ''; verify.textContent = 'Verifying…';
    try {
      const attempt = await clerk.client.signIn.attemptFirstFactor({ strategy: 'email_code', code: codeInput.value.trim() });
      if (attempt.status !== 'complete' || !attempt.createdSessionId) throw new Error('This account needs another sign-in check. Please contact Josh.');
      await clerk.setActive({ session: attempt.createdSessionId });
      hide(); await onSignedIn();
    } catch (error) { showError(error); }
    finally { verify.textContent = 'Verify and sign in'; setBusy(false); }
  })(); };
  return { show, hide };
}
