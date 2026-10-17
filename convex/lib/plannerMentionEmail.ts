export type MentionEmail = {
  notificationId: string; recipientEmail: string; author: string; title: string;
  excerpt: string; itemId: string; commentId: string;
};

// A dedicated server-only key signs the relay request. The version prefix
// prevents signatures being reused for another purpose. Browsers never get it.
export async function mentionEmailSignature(secret: string, body: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`planner-mention-email:v1:${body}`));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
