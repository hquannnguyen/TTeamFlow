import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getProjects } from '../api/projects.api';

export function ProjectsPage() {
  const query = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  if (query.isLoading) return <p>Đang tải dự án...</p>;
  if (query.isError) return <p>Không thể tải danh sách dự án.</p>;

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Dự án</h1>
          <p className="muted">Danh sách dự án bạn đang tham gia.</p>
        </div>
        <button>Tạo dự án</button>
      </div>

      <div className="grid">
        {query.data?.map((project) => (
          <Link
            to={`/projects/${project.id}/board`}
            className="card project-card"
            key={project.id}
          >
            <strong>{project.projectKey}</strong>
            <h3>{project.name}</h3>
            <span>{project.members[0]?.role}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
