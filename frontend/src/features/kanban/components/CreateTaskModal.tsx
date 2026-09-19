import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, type KanbanColumn } from '../api/kanban.api';
import { toast } from '../../../components/ui/toast.store';

interface CreateTaskModalProps {
  projectId: string;
  columns: KanbanColumn[];
  defaultColumnId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTaskModal({
  projectId,
  columns,
  defaultColumnId,
  isOpen,
  onClose,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState(defaultColumnId || columns[0]?.id || '');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createTask(projectId, {
        columnId: columnId || columns[0]?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Đã tạo nhiệm vụ mới thành công');
      onClose();
      setTitle('');
      setDescription('');
      setDueDate('');
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
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Tạo nhiệm vụ mới</h2>
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
        >
          <div className="form-group">
            <label className="form-label">
              Tiêu đề nhiệm vụ <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Nhập tiêu đề nhiệm vụ..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Cột Kanban</label>
              <select
                className="form-select"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Độ ưu tiên</label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')
                }
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Hạn hoàn thành</label>
            <input
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả chi tiết</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Mô tả nội dung công việc cần làm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
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
