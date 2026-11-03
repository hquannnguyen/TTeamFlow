import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ALLOWED_MIME_TYPES,
  deleteAttachment,
  formatFileSize,
  getAttachments,
  MAX_ATTACHMENT_SIZE,
  uploadAttachment,
} from '../api/attachments.api';

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.includes('zip')) return '🗜️';
  if (mimeType.includes('word')) return '📘';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📗';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙';
  return '📄';
}

export function AttachmentSection({
  taskId,
  canManage,
}: {
  taskId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => getAttachments(taskId),
    enabled: Boolean(taskId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(taskId, file),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Không thể tải tệp lên';
      setError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(attachmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // cho phép chọn lại cùng 1 file
    event.target.value = '';
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError('Tệp tối đa 10MB');
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Loại tệp không được hỗ trợ');
      return;
    }
    setError(null);
    uploadMutation.mutate(file);
  }

  return (
    <div className="task-checklists-box">
      {canManage && (
        <div className="checklist-add-row" style={{ display: 'flex', gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept={ALLOWED_MIME_TYPES.join(',')}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadMutation.isPending ? 'Đang tải lên...' : '📎 Đính kèm tệp'}
          </button>
          <span style={{ alignSelf: 'center', opacity: 0.7, fontSize: 13 }}>
            Tối đa 10MB · {attachments.length}/20 tệp
          </span>
        </div>
      )}

      {error && (
        <p style={{ color: '#d64545', fontSize: 13, margin: '8px 0 0' }}>{error}</p>
      )}

      {isLoading ? (
        <p style={{ opacity: 0.6, fontSize: 14 }}>Đang tải tệp đính kèm...</p>
      ) : attachments.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: 14 }}>Chưa có tệp đính kèm nào.</p>
      ) : (
        <div className="checklists-list" style={{ marginTop: 12 }}>
          {attachments.map((att) => (
            <div key={att.id} className="checklist-item-row" style={{ alignItems: 'center' }}>
              <span aria-hidden>{fileIcon(att.mimeType)}</span>
              {att.downloadUrl ? (
                <a
                  href={att.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={att.fileName}
                >
                  {att.fileName}
                </a>
              ) : (
                <span style={{ flex: 1 }}>{att.fileName}</span>
              )}
              <span style={{ opacity: 0.65, fontSize: 12, whiteSpace: 'nowrap' }}>
                {formatFileSize(att.sizeBytes)}
              </span>
              {canManage && (
                <button
                  type="button"
                  className="btn-danger"
                  style={{ padding: '2px 8px', fontSize: 12 }}
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(att.id)}
                  title="Xoá tệp"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
