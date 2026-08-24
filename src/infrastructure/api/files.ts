import { api } from './client';
import { ApiClientError } from './errors';

interface UploadIntent { file_id: string; upload_url: string; upload_headers?: Record<string, string>; }
export interface CompletedFile { id: string; purpose: string; file_name: string; mime_type: string; size_bytes: number; status: string; download_url?: string | null; }

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedMime = new Set([
  'image/jpeg','image/png','image/webp','application/pdf','text/csv',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const extensionMime: Record<string, string> = {
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', pdf:'application/pdf', csv:'text/csv',
  doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function actionId(prefix = 'web-file') { return `${prefix}-${crypto.randomUUID()}`; }
function resolvedMime(file: File) {
  if (allowedMime.has(file.type)) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return extensionMime[ext] ?? '';
}
async function sha256(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadApiFile(file: File, purpose: string, ownerType?: 'merchant' | 'driver', ownerId?: string) {
  if (file.size < 1 || file.size > MAX_FILE_BYTES) throw new ApiClientError('File size is not allowed.', 422, 'FILE_SIZE_INVALID', 'validation');
  const mime = resolvedMime(file);
  if (!mime) throw new ApiClientError('Unsupported file type.', 422, 'FILE_TYPE_INVALID', 'validation');
  const checksum = await sha256(file);
  const intentKey = actionId('web-upload-intent');
  const intent = await api.post<UploadIntent>('/api/v1/file-uploads', {
    purpose,
    file_name: file.name,
    mime_type: mime,
    size_bytes: file.size,
    sha256: checksum,
    ...(ownerType && ownerId ? { owner_type: ownerType, owner_id: ownerId } : {}),
  }, { idempotencyKey: intentKey, retries: 1 });

  if (!intent.data.upload_url) throw new ApiClientError('Storage upload URL is unavailable.', 503, 'UPLOAD_URL_UNAVAILABLE', 'server', intent.requestId);
  const uploadHeaders = { 'Content-Type': mime, ...(intent.data.upload_headers ?? {}) };
  const uploadResponse = await fetch(intent.data.upload_url, { method: 'PUT', headers: uploadHeaders, body: file });
  if (!uploadResponse.ok) throw new ApiClientError('File upload failed.', uploadResponse.status, 'DIRECT_UPLOAD_FAILED', 'server', intent.requestId);

  const completeAction = actionId('web-upload-complete');
  const completed = await api.post<CompletedFile>(`/api/v1/files/${intent.data.file_id}/complete`, {
    sha256: checksum,
    etag: uploadResponse.headers.get('ETag'),
    client_action_id: completeAction,
  }, { idempotencyKey: completeAction, retries: 1 });
  return completed.data;
}
