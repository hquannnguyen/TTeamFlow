import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../api/projects.api';

interface ProjectSelectDropdownProps {
  projects: Project[];
  currentProjectId: string;
  onSelectProject: (projectId: string) => void;
  variant?: 'title' | 'compact';
  status?: 'ACTIVE' | 'ARCHIVED';
  showStatusBadge?: boolean;
}

export function ProjectSelectDropdown({
  projects,
  currentProjectId,
  onSelectProject,
  variant = 'title',
  status,
  showStatusBadge = false,
}: ProjectSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === currentProjectId) || projects[0] || null;
  }, [projects, currentProjectId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && projects.length >= 4) {
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [isOpen, projects.length]);

  // Handle keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.projectKey && p.projectKey.toLowerCase().includes(q)),
    );
  }, [projects, searchQuery]);

  const effectiveStatus = status || currentProject?.status || 'ACTIVE';

  if (!currentProject && projects.length === 0) {
    return null;
  }

  return (
    <div
      className={`project-dropdown-selector ${variant === 'compact' ? 'mode-compact' : 'mode-title'}`}
      ref={dropdownRef}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className={`project-dropdown-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Bấm để chuyển đổi dự án"
      >
        {variant === 'compact' ? (
          /* Compact trigger (Dashboard) */
          <>
            <svg
              className="project-trigger-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            </svg>
            <span className="project-trigger-name">{currentProject?.name || 'Chọn dự án'}</span>
            <svg
              className={`project-trigger-chevron ${isOpen ? 'open' : ''}`}
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </>
        ) : (
          /* Title trigger (Kanban Header) */
          <>
            <span className="project-title-name">{currentProject?.name || 'Chọn dự án'}</span>
            {currentProject?.projectKey && (
              <span className="project-title-key-badge">{currentProject.projectKey}</span>
            )}
            <svg
              className={`project-trigger-chevron ${isOpen ? 'open' : ''}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </>
        )}
      </button>

      {/* Optional Status Badge (For title variant) */}
      {showStatusBadge && (
        <span className={`kanban-status-badge ${effectiveStatus === 'ARCHIVED' ? 'is-archived' : 'is-active'}`}>
          {effectiveStatus === 'ARCHIVED' ? 'Đã lưu trữ' : 'Đang hoạt động'}
        </span>
      )}

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div className="project-dropdown-menu-popup" role="listbox">
          {/* Quick Search if multiple projects */}
          {projects.length >= 4 && (
            <div className="project-dropdown-search-wrap">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="project-dropdown-search-input"
                placeholder="Tìm dự án..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="project-dropdown-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Project List Items */}
          <div className="project-dropdown-list">
            {filteredProjects.length === 0 ? (
              <div className="project-dropdown-empty">
                Không tìm thấy dự án khớp với "{searchQuery}"
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = p.id === currentProjectId;
                const memberCount = p.members?.length || 0;

                return (
                  <div
                    key={p.id}
                    className={`project-dropdown-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      onSelectProject(p.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {/* Project Avatar / Icon */}
                    <div className="project-item-avatar">
                      {p.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Details */}
                    <div className="project-item-details">
                      <div className="project-item-row-top">
                        <span className="project-item-name">{p.name}</span>
                        {p.status === 'ARCHIVED' && (
                          <span className="project-item-archived-tag">Lưu trữ</span>
                        )}
                      </div>
                      <div className="project-item-row-sub">
                        {p.projectKey && <span className="project-item-key">{p.projectKey}</span>}
                        <span className="project-item-dot">•</span>
                        <span>{memberCount} thành viên</span>
                      </div>
                    </div>

                    {/* Checkmark indicator */}
                    {isSelected && (
                      <div className="project-item-check-icon" title="Đang chọn">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer link to all projects */}
          <div className="project-dropdown-footer">
            <button
              type="button"
              className="project-dropdown-view-all-btn"
              onClick={() => {
                setIsOpen(false);
                navigate('/projects');
              }}
            >
              <span>Xem tất cả dự án</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
