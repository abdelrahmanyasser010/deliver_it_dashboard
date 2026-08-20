import { api } from './client';
import { ApiClientError } from './errors';

interface UploadIntent { file_id: string; upload_url: string | null; upload_headers?: Record<string, string>; }
interface CompletedFile { id: string; file_name: string; status: string; download_url?: string | null; }

function actionId() { return crypto.randomUUID(); }
async function sha256(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadApiFile(file: File, purpose: string, ownerType?: string, ownerId?: string) {
  const checksum = await sha256(file);
  const intent = await api.post<UploadIntent>('/api/v1/file-uploads', {
    purpose,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    sha256: checksum,
    owner_type: ownerType ?? null,
    owner_id: ownerId ?? null,
  });
  if (!intent.data.upload_url) throw new ApiClientError('Storage upload URL is unavailable.', 503, 'UPLOAD_URL_UNAVAILABLE', 'server', intent.requestId);
  const uploadResponse = await fetch(intent.data.upload_url, { method: 'PUT', headers: intent.data.upload_headers ?? { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
  if (!uploadResponse.ok) throw new ApiClientError('File upload failed.', uploadResponse.status, 'DIRECT_UPLOAD_FAILED', 'server', intent.requestId);
  const completed = await api.post<CompletedFile>(`/api/v1/files/${intent.data.file_id}/complete`, { sha256: checksum, client_action_id: actionId() });
  return completed.data;
}
