import { http } from '../../../api/http';

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploaderId: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isUploaded: boolean;
  createdAt: string;
  uploader?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  downloadUrl?: string;
}

/** Bước 1: xin presigned URL — file sẽ được PUT thẳng lên MinIO, không qua backend */
export async function presignAttachment(
  taskId: string,
  input: { fileName: string; mimeType: string; sizeBytes: number },
) {
  const res = await http.post<{
    success: true;
    data: { attachment: TaskAttachment; uploadUrl: string };
  }>(`/tasks/${taskId}/attachments/presign`, input);
  return res.data.data;
}

/** Bước 2: báo backend đã upload xong (backend xác minh object tồn tại) */
export async function completeAttachment(attachmentId: string) {
  const res = await http.patch<{ success: true; data: TaskAttachment }>(
    `/attachments/${attachmentId}/complete`,
    {},
  );
  return res.data.data;
}

export async function getAttachments(taskId: string) {
  const res = await http.get<{ success: true; data: { data: TaskAttachment[] } }>(
    `/tasks/${taskId}/attachments`,
  );
  return res.data.data.data;
}

export async function deleteAttachment(attachmentId: string) {
  const res = await http.delete<{ success: true; data: { id: string } }>(
    `/attachments/${attachmentId}`,
  );
  return res.data.data;
}

/** Upload trọn vẹn 1 file: presign → PUT lên MinIO → complete */
export async function uploadAttachment(taskId: string, file: File) {
  const { attachment, uploadUrl } = await presignAttachment(taskId, {
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });
  await http.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  return completeAttachment(attachment.id);
}

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
