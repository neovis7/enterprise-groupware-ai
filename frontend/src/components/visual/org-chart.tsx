'use client';

import { useState, useCallback, useId } from 'react';
import { ChevronRight, ChevronDown, Users, Building2, User } from 'lucide-react';
import { GLASS } from '@/lib/design-tokens';

// ─── 타입 ──────────────────────────────────────────────────────────────────

export interface OrgDepartmentNode {
  id: string;
  name: string;
  managerName?: string | null;
  memberCount: number;
  children?: OrgDepartmentNode[];
}

interface OrgChartProps {
  /** 최상위 부서 노드 배열 */
  roots: OrgDepartmentNode[];
  /** 초기 펼침 depth (0 = 최상위만, -1 = 전체 펼침) */
  initialDepth?: number;
  /** 추가 CSS 클래스 */
  className?: string;
}

interface NodeProps {
  node: OrgDepartmentNode;
  depth: number;
  initialDepth: number;
  parentExpanded: boolean;
}

// ─── 단일 노드 컴포넌트 ───────────────────────────────────────────────────

function OrgNode({ node, depth, initialDepth, parentExpanded }: NodeProps) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const defaultExpanded = initialDepth === -1 || depth < initialDepth;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const buttonId = useId();
  const regionId = useId();

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  if (!parentExpanded && depth > 0) return null;

  const indentPx = depth * 20;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
      {/* 노드 카드 */}
      <div
        className={GLASS.cardSubtle}
        style={{
          marginLeft: `${indentPx}px`,
          marginBottom: '0.5rem',
          padding: '0.625rem 0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          cursor: hasChildren ? 'pointer' : 'default',
          transition: 'border-color var(--app-transition-fast)',
        }}
        onClick={hasChildren ? toggle : undefined}
      >
        {/* 접기/펼치기 버튼 */}
        {hasChildren ? (
          <button
            id={buttonId}
            type="button"
            aria-controls={regionId}
            aria-expanded={isExpanded}
            aria-label={`${node.name} ${isExpanded ? '접기' : '펼치기'}`}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.125rem',
              cursor: 'pointer',
              color: 'var(--muted-foreground)',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--app-radius-sm)',
              flexShrink: 0,
              transition: 'color var(--app-transition-fast)',
            }}
          >
            {isExpanded ? (
              <ChevronDown size={14} aria-hidden />
            ) : (
              <ChevronRight size={14} aria-hidden />
            )}
          </button>
        ) : (
          <span
            aria-hidden="true"
            style={{ width: '18px', flexShrink: 0 }}
          />
        )}

        {/* 부서 아이콘 */}
        <span
          aria-hidden="true"
          style={{
            color: depth === 0 ? 'var(--app-brand-primary)' : 'var(--muted-foreground)',
            flexShrink: 0,
          }}
        >
          {depth === 0 ? <Building2 size={16} /> : <Users size={14} />}
        </span>

        {/* 부서 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize:
                depth === 0
                  ? 'var(--app-text-body)'
                  : 'var(--app-text-caption)',
              fontWeight: depth === 0 ? 600 : 500,
              color: 'var(--foreground)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {node.name}
          </p>
          {node.managerName && (
            <p
              style={{
                margin: 0,
                fontSize: 'var(--app-text-overline)',
                color: 'var(--muted-foreground)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.125rem',
              }}
            >
              <User size={10} aria-hidden />
              {node.managerName}
            </p>
          )}
        </div>

        {/* 인원 수 뱃지 */}
        <span
          aria-label={`${node.memberCount}명`}
          style={{
            fontSize: 'var(--app-text-overline)',
            fontWeight: 600,
            color: 'var(--app-status-info)',
            background: 'var(--app-status-info-bg)',
            border: '1px solid var(--app-status-info-border)',
            borderRadius: 'var(--app-radius-pill)',
            padding: '0.125rem 0.5rem',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {node.memberCount}명
        </span>
      </div>

      {/* 자식 노드 */}
      {hasChildren && (
        <ul
          id={regionId}
          role="group"
          aria-label={`${node.name} 하위 부서`}
          hidden={!isExpanded}
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            animation: isExpanded
              ? 'app-fade-in 200ms ease both'
              : undefined,
          }}
        >
          {node.children!.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              depth={depth + 1}
              initialDepth={initialDepth}
              parentExpanded={isExpanded}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

/**
 * OrgChart — 재귀 조직도 트리 컴포넌트
 *
 * 토큰 참조: --app-glass-*, --app-brand-primary, --app-text-*
 * ARIA: role="tree" + treeitem + aria-expanded
 */
export function OrgChart({ roots, initialDepth = 1, className }: OrgChartProps) {
  if (roots.length === 0) {
    return (
      <div
        role="status"
        aria-label="조직도 없음"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '1rem',
          color: 'var(--muted-foreground)',
          fontSize: 'var(--app-text-caption)',
        }}
      >
        <Building2 size={16} aria-hidden />
        조직 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ul
      role="tree"
      aria-label="조직도"
      className={className}
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {roots.map((root) => (
        <OrgNode
          key={root.id}
          node={root}
          depth={0}
          initialDepth={initialDepth}
          parentExpanded={true}
        />
      ))}
    </ul>
  );
}
