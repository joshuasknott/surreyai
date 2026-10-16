const ENDPOINT = '/api/committee-upload-proxy';

async function uploadRequest(action: string, options: RequestInit) {
  // Upload requests are idempotent. Retry transient failures without retrying
  // the application/email POST, whose delivery may already have succeeded.
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try { response = await fetch(`${ENDPOINT}?${action}`, { ...options, signal: AbortSignal.timeout(60_000) }); }
    catch {
      if (attempt < 2) continue;
      throw new Error('We could not connect to the website to upload your mock post. Your answers are still on this page. Check your connection and try again; on campus Wi-Fi, try mobile data.');
    }
    let result: { message?: string; ticket?: string; chunkBytes?: number; url?: string };
    try { result = await response.json(); }
    catch {
      if (attempt < 2) continue;
      throw new Error('The upload service returned an unexpected response. Your answers are still on this page; please try again.');
    }
    if (!response.ok) {
      if (response.status >= 500 && attempt < 2) continue;
      throw new Error(result.message || 'We could not upload your mock post. Your answers are still on this page; please try again.');
    }
    return result;
  }
  throw new Error('We could not upload your mock post. Please try again.');
}

export async function uploadCommitteeFile(file: File, onProgress: (percentage: number) => void) {
  const byExtension: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' };
  const contentType = file.type || byExtension[file.name.split('.').pop()?.toLowerCase() ?? ''];
  if (!Object.values(byExtension).includes(contentType)) throw new Error('Please upload a PNG, JPG, WebP or PDF file.');
  if (!file.size || file.size > 15_000_000) throw new Error('Please upload a mock post between 1 byte and 15 MB.');
  const session = await uploadRequest('action=start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ size: file.size, type: contentType }) });
  if (!session.ticket || session.chunkBytes !== 3_000_000) throw new Error('We could not prepare your upload. Please try again.');
  const headers = { 'x-upload-ticket': session.ticket };
  try {
    for (let offset = 0, index = 0; offset < file.size; offset += session.chunkBytes, index++) {
      await uploadRequest(`action=part&index=${index}`, { method: 'POST', headers, body: file.slice(offset, offset + session.chunkBytes) });
      onProgress(Math.min(95, Math.round(Math.min(offset + session.chunkBytes, file.size) / file.size * 95)));
    }
    const result = await uploadRequest('action=finish', { method: 'POST', headers });
    if (!result.url) throw new Error('We could not confirm your upload. Please try again.');
    onProgress(100);
    return result.url;
  } catch (error) {
    try { await fetch(`${ENDPOINT}?action=cancel`, { method: 'POST', headers, signal: AbortSignal.timeout(5_000) }); }
    catch { /* Cleanup can be retried with the signed ticket when connectivity returns. */ }
    throw error;
  }
}
