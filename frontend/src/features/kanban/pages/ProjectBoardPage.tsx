import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getBoard } from '../api/kanban.api';

export function ProjectBoardPage() {
  const { projectId = '' } = useParams();

  const query = useQuery({
    queryKey: ['kanban', projectId],
    queryFn: () => getBoard(projectId),
    enabled: Boolean(projectId),
  });

  if (query.isLoading) return <p>Đang tải Kanban...</p>;
  if (query.isError) return <p>Không thể tải Kanban.</p>;

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Kanban Board</h1>
          <p className="muted">
            Base UI. Dev Kanban sẽ gắn dnd-kit và optimistic update tại đây.
          </p>
        </div>
      </div>

      <div className="kanban-board">
        {query.data?.map((column) => (
          <div className="kanban-column" key={column.id}>
            <div className="kanban-column-title">
              <strong>{column.name}</strong>
              <span>{column.tasks.length}</span>
            </div>

            {column.tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <strong>{task.title}</strong>
                <small>{task.priority}</small>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
