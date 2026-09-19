import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getMediaUrl } from '../../../api/http';

export interface AutocompleteMember {
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    email?: string;
  };
}

interface MemberAutocompleteProps {
  members: AutocompleteMember[];
  selectedUserId?: string;
  onSelect: (user: AutocompleteMember['user']) => void;
  onClear?: () => void;
  placeholder?: string;
  mode?: 'single' | 'add';
  disabled?: boolean;
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function normalizeStr(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const directIdx = lowerText.indexOf(lowerQuery);

  if (directIdx !== -1) {
    const before = text.slice(0, directIdx);
    const match = text.slice(directIdx, directIdx + lowerQuery.length);
    const after = text.slice(directIdx + lowerQuery.length);
    return (
      <>
        {before}
        <span className="member-search-highlight">{match}</span>
        {after}
      </>
    );
  }

  const normText = normalizeStr(text);
  const normQuery = normalizeStr(query);
  const normIdx = normText.indexOf(normQuery);

  if (normIdx !== -1) {
    const before = text.slice(0, normIdx);
    const match = text.slice(normIdx, normIdx + query.length);
    const after = text.slice(normIdx + query.length);
    return (
      <>
        {before}
        <span className="member-search-highlight">{match}</span>
        {after}
      </>
    );
  }

  return text;
}

export function MemberAutocomplete({
  members,
  selectedUserId,
  onSelect,
  onClear,
  placeholder,
  mode = 'single',
  disabled = false,
}: MemberAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedMember = useMemo(() => {
    if (!selectedUserId) return null;
    return members.find((m) => m.user.id === selectedUserId)?.user || null;
  }, [members, selectedUserId]);

  const filteredMembers = useMemo(() => {
    if (!query.trim()) return members;
    const q = query.trim().toLowerCase();
    const qNorm = normalizeStr(query.trim());

    return members.filter((m) => {
      const name = m.user.fullName.toLowerCase();
      const nameNorm = normalizeStr(m.user.fullName);
      const email = (m.user.email || '').toLowerCase();
      return name.includes(q) || nameNorm.includes(qNorm) || email.includes(q);
    });
  }, [members, query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (mode === 'single' && selectedMember) {
    const avatar = getMediaUrl(selectedMember.avatarUrl);
    return (
      <div className="member-autocomplete-wrap" ref={containerRef}>
        <div
          className="member-autocomplete-selected-card"
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
        >
          <div className="member-ac-user-info">
            {avatar ? (
              <img src={avatar} alt={selectedMember.fullName} className="member-ac-avatar" />
            ) : (
              <div className="member-ac-avatar">{getInitials(selectedMember.fullName)}</div>
            )}
            <span className="member-ac-selected-name">{selectedMember.fullName}</span>
          </div>
          {!disabled && (
            <button
              type="button"
              className="member-ac-remove-btn"
              title="Bỏ chọn"
              onClick={(e) => {
                e.stopPropagation();
                onClear?.();
                setQuery('');
                setIsOpen(false);
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`member-autocomplete-wrap ${mode === 'add' ? 'mode-add' : ''}`} ref={containerRef}>
      <div className={`member-autocomplete-input-box ${isOpen ? 'is-open' : ''}`}>
        {mode === 'add' && <span className="member-ac-plus-icon">+</span>}
        <input
          ref={inputRef}
          type="text"
          className="member-autocomplete-input-field"
          value={query}
          disabled={disabled}
          placeholder={placeholder || (mode === 'add' ? 'Thêm người (gõ tên)...' : 'Nhập tên người được giao...')}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button
            type="button"
            className="member-ac-clear-query-btn"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="member-autocomplete-dropdown">
          {filteredMembers.length === 0 ? (
            <div className="member-ac-empty">
              Không tìm thấy thành viên nào{query ? ` khớp với "${query}"` : ''}
            </div>
          ) : (
            filteredMembers.map((m) => {
              const avatar = getMediaUrl(m.user.avatarUrl);
              return (
                <div
                  key={m.user.id}
                  className="member-ac-item"
                  onClick={() => {
                    onSelect(m.user);
                    setQuery('');
                    setIsOpen(false);
                  }}
                >
                  {avatar ? (
                    <img src={avatar} alt={m.user.fullName} className="member-ac-avatar" />
                  ) : (
                    <div className="member-ac-avatar">{getInitials(m.user.fullName)}</div>
                  )}
                  <div className="member-ac-details">
                    <span className="member-ac-name">
                      {highlightMatch(m.user.fullName, query)}
                    </span>
                    {m.user.email && (
                      <span className="member-ac-email">{m.user.email}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
