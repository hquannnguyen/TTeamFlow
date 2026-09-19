import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, type KanbanColumn, type KanbanTask } from '../api/kanban.api';
import { toast } from '../../../components/ui/toast.store';
import { MemberAutocomplete } from './MemberAutocomplete';

interface CreateTaskModalProps {
  projectId: string;
  columns: KanbanColumn[];
  defaultColumnId?: string;
  members?: Array<{ user: { id: string; fullName: string; avatarUrl?: string | null } }>;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (task: KanbanTask) => void;
}

export function CreateTaskModal({
  projectId,
  columns,
  defaultColumnId,
  members = [],
  isOpen,
  onClose,
  onTaskCreated,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const targetColumnId = defaultColumnId || columns[0]?.id || '';

  const mutation = useMutation({
    mutationFn: () =>
      createTask(projectId, {
        columnId: targetColumnId,
        title: title.trim(),
        assigneeIds: assigneeId ? [assigneeId] : undefined,
      }),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['kanban', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Đã tạo nhiệm vụ thành công');
      setTitle('');
      setAssigneeId('');
      onClose();
      onTaskCreated?.(newTask);
    },
    onError: (err: unknown) => {
      const responseData =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
          : undefined;
      const msg = responseData?.message || 'Không thể tạo nhiệm vụ';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '480px', borderRadius: '16px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 className="modal-title" style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Tạo nhiệm vụ mới
          </h2>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            mutation.mutate();
          }}
          className="modal-form"
          style={{ padding: '20px 24px' }}
        >
          {/* 1. Tiêu đề nhiệm vụ */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Tiêu đề nhiệm vụ <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
              }}
              placeholder="Nhập tiêu đề nhiệm vụ..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* 2. Người được phân công nhiệm vụ */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Người được phân công
            </label>
            <MemberAutocomplete
              members={members}
              selectedUserId={assigneeId}
              onSelect={(user) => setAssigneeId(user.id)}
              onClear={() => setAssigneeId('')}
              placeholder="Nhập tên người được giao..."
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                background: '#6366f1',
                borderColor: '#6366f1',
              }}
              disabled={mutation.isPending || !title.trim()}
            >
              {mutation.isPending ? 'Đang tạo...' : 'Tạo nhiệm vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
