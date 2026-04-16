/**
 * 그룹웨어 디자인 토큰 상수
 *
 * CSS 변수(--app-*)와 동기화된 TypeScript 토큰.
 * 컴포넌트에서 조건부 스타일링이나 프로그래매틱 접근이 필요할 때 사용합니다.
 * 정적 스타일링은 CSS 변수 또는 Tailwind 유틸리티를 우선 사용하세요.
 */

// ---------------------------------------------------------------------------
// 브랜드 컬러
// ---------------------------------------------------------------------------

export const COLORS = {
  brand: {
    primary: '#3B5BDB',
    primaryLight: '#5C7CFA',
    primaryDark: '#2B4ACB',
    secondary: '#74C0FC',
    accent: '#FCC419',
    accentDark: '#F59F00',
  },
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
} as const;

// ---------------------------------------------------------------------------
// 결재 상태 색상
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface StatusColorSet {
  readonly fg: string;
  readonly bg: string;
  readonly border: string;
  readonly tailwind: string;
  readonly tailwindBg: string;
  readonly badgeClass: string;
  readonly label: string;
}

export const STATUS_COLORS: Record<ApprovalStatus, StatusColorSet> = {
  pending: {
    fg: '#b45309',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    tailwind: 'text-amber-700',
    tailwindBg: 'bg-amber-500/10',
    badgeClass: 'app-badge-pending',
    label: '대기',
  },
  approved: {
    fg: '#047857',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    tailwind: 'text-emerald-700',
    tailwindBg: 'bg-emerald-500/10',
    badgeClass: 'app-badge-approved',
    label: '승인',
  },
  rejected: {
    fg: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    tailwind: 'text-red-600',
    tailwindBg: 'bg-red-500/10',
    badgeClass: 'app-badge-rejected',
    label: '반려',
  },
  cancelled: {
    fg: '#4B5563',
    bg: 'rgba(107, 114, 128, 0.1)',
    border: 'rgba(107, 114, 128, 0.3)',
    tailwind: 'text-gray-500',
    tailwindBg: 'bg-gray-500/10',
    badgeClass: 'app-badge-cancelled',
    label: '취소',
  },
} as const;

// ---------------------------------------------------------------------------
// 정보 상태 색상 (알림, 메시지 등)
// ---------------------------------------------------------------------------

export type InfoStatus = 'info' | 'success' | 'warning' | 'error';

export const INFO_COLORS: Record<InfoStatus, { readonly fg: string; readonly bg: string; readonly tailwind: string }> = {
  info: {
    fg: '#1D4ED8',
    bg: 'rgba(59, 130, 246, 0.1)',
    tailwind: 'text-blue-700',
  },
  success: {
    fg: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    tailwind: 'text-emerald-500',
  },
  warning: {
    fg: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)',
    tailwind: 'text-amber-500',
  },
  error: {
    fg: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    tailwind: 'text-red-500',
  },
} as const;

// ---------------------------------------------------------------------------
// Glassmorphism 유틸리티 클래스 조합
// ---------------------------------------------------------------------------

export const GLASS = {
  /** 기본 glassmorphism 카드 */
  card: 'app-glass-card',
  /** 미묘한 반투명 카드 */
  cardSubtle: 'app-glass-card-subtle',
  /** Tailwind 유틸리티 조합 (CSS 변수 미사용 시) */
  tw: {
    light: 'bg-white/70 backdrop-blur-md border border-white/50',
    dark: 'dark:bg-slate-900/70 dark:backdrop-blur-md dark:border-white/[0.08]',
    combined: 'bg-white/70 backdrop-blur-md border border-white/50 dark:bg-slate-900/70 dark:border-white/[0.08]',
  },
} as const;

// ---------------------------------------------------------------------------
// 타이포그래피
// ---------------------------------------------------------------------------

export const TYPOGRAPHY = {
  fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  sizes: {
    h1: '1.875rem',
    h2: '1.5rem',
    h3: '1.25rem',
    h4: '1.125rem',
    body: '0.9375rem',
    caption: '0.8125rem',
    code: '0.875rem',
    overline: '0.6875rem',
  },
  lineHeights: {
    h1: '2.25rem',
    h2: '2rem',
    h3: '1.75rem',
    h4: '1.625rem',
    body: '1.625rem',
    caption: '1.25rem',
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// ---------------------------------------------------------------------------
// 간격 스케일
// ---------------------------------------------------------------------------

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

// ---------------------------------------------------------------------------
// 반경
// ---------------------------------------------------------------------------

export const RADIUS = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  pill: '9999px',
} as const;

// ---------------------------------------------------------------------------
// 그림자
// ---------------------------------------------------------------------------

export const SHADOWS = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.1)',
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
} as const;

// ---------------------------------------------------------------------------
// 트랜지션
// ---------------------------------------------------------------------------

export const TRANSITIONS = {
  fast: '120ms ease',
  normal: '200ms ease',
  slow: '350ms ease',
} as const;

// ---------------------------------------------------------------------------
// 반응형 중단점
// ---------------------------------------------------------------------------

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ---------------------------------------------------------------------------
// Z-index 스케일
// ---------------------------------------------------------------------------

export const Z_INDEX = {
  dropdown: 50,
  sticky: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
} as const;

// ---------------------------------------------------------------------------
// 애니메이션 클래스 맵
// ---------------------------------------------------------------------------

export const ANIMATIONS = {
  /** AI 타이핑 점 바운스 */
  aiTypingDot: 'app-ai-typing-dot',
  /** 페이드 인 (아래에서 위로) */
  fadeIn: 'animate-[app-fade-in_200ms_ease]',
  /** 오른쪽에서 슬라이드 인 */
  slideInRight: 'animate-[app-slide-in-right_200ms_ease]',
  /** 미묘한 펄스 */
  pulseSubtle: 'animate-[app-pulse-subtle_2s_ease-in-out_infinite]',
} as const;

// ---------------------------------------------------------------------------
// 컴포넌트 패턴 클래스
// ---------------------------------------------------------------------------

export const COMPONENT_PATTERNS = {
  /** 결재선 타임라인 */
  timeline: {
    line: 'app-timeline-line',
    dot: 'app-timeline-dot',
  },
  /** AI 어시스턴트 */
  ai: {
    typingDot: 'app-ai-typing-dot',
    sourceCard: 'app-ai-source-card',
  },
  /** 상태 뱃지 */
  badge: {
    pending: 'app-badge-pending',
    approved: 'app-badge-approved',
    rejected: 'app-badge-rejected',
    cancelled: 'app-badge-cancelled',
    info: 'app-badge-info',
  },
} as const;
