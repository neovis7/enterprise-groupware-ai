import type { Config } from "tailwindcss";

/**
 * Tailwind CSS v4 보조 설정
 *
 * Tailwind v4는 CSS-first 설정 방식을 사용합니다.
 * 핵심 디자인 토큰은 globals.css의 @theme inline 블록에 정의되어 있으며,
 * 이 파일은 JS 플러그인과 프로그래매틱 확장만 담당합니다.
 *
 * 색상, 간격, 반경 등 모든 커스텀 토큰은 CSS 변수(--app-*)로 관리됩니다.
 * src/lib/design-tokens.ts에서 TypeScript 상수로도 접근 가능합니다.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        "app-brand": {
          primary: "var(--app-brand-primary)",
          "primary-light": "var(--app-brand-primary-light)",
          "primary-dark": "var(--app-brand-primary-dark)",
          secondary: "var(--app-brand-secondary)",
          accent: "var(--app-brand-accent)",
          "accent-dark": "var(--app-brand-accent-dark)",
        },
        "app-status": {
          pending: "var(--app-status-pending)",
          "pending-bg": "var(--app-status-pending-bg)",
          approved: "var(--app-status-approved)",
          "approved-bg": "var(--app-status-approved-bg)",
          rejected: "var(--app-status-rejected)",
          "rejected-bg": "var(--app-status-rejected-bg)",
          cancelled: "var(--app-status-cancelled)",
          "cancelled-bg": "var(--app-status-cancelled-bg)",
          info: "var(--app-status-info)",
          "info-bg": "var(--app-status-info-bg)",
        },
      },
      borderRadius: {
        "app-sm": "var(--app-radius-sm)",
        "app-md": "var(--app-radius-md)",
        "app-lg": "var(--app-radius-lg)",
        "app-xl": "var(--app-radius-xl)",
        "app-pill": "var(--app-radius-pill)",
      },
      boxShadow: {
        "app-sm": "var(--app-shadow-sm)",
        "app-md": "var(--app-shadow-md)",
        "app-lg": "var(--app-shadow-lg)",
        "app-inner": "var(--app-shadow-inner)",
        "app-glass": "var(--app-glass-shadow)",
      },
      fontSize: {
        "app-h1": ["var(--app-text-h1)", { lineHeight: "var(--app-leading-h1)" }],
        "app-h2": ["var(--app-text-h2)", { lineHeight: "var(--app-leading-h2)" }],
        "app-h3": ["var(--app-text-h3)", { lineHeight: "var(--app-leading-h3)" }],
        "app-h4": ["var(--app-text-h4)", { lineHeight: "var(--app-leading-h4)" }],
        "app-body": ["var(--app-text-body)", { lineHeight: "var(--app-leading-body)" }],
        "app-caption": ["var(--app-text-caption)", { lineHeight: "var(--app-leading-caption)" }],
        "app-code": ["var(--app-text-code)", { lineHeight: "1.5" }],
        "app-overline": ["var(--app-text-overline)", { lineHeight: "1rem" }],
      },
      spacing: {
        "app-xs": "var(--app-space-xs)",
        "app-sm": "var(--app-space-sm)",
        "app-md": "var(--app-space-md)",
        "app-lg": "var(--app-space-lg)",
        "app-xl": "var(--app-space-xl)",
        "app-2xl": "var(--app-space-2xl)",
        "app-3xl": "var(--app-space-3xl)",
      },
      zIndex: {
        "app-dropdown": "var(--app-z-dropdown)",
        "app-sticky": "var(--app-z-sticky)",
        "app-modal": "var(--app-z-modal)",
        "app-toast": "var(--app-z-toast)",
        "app-tooltip": "var(--app-z-tooltip)",
      },
      transitionDuration: {
        "app-fast": "120ms",
        "app-normal": "200ms",
        "app-slow": "350ms",
      },
      keyframes: {
        "app-ai-bounce": {
          "0%, 80%, 100%": { transform: "scale(0)", opacity: "0.5" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        "app-fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "app-slide-in-right": {
          from: { opacity: "0", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "app-pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "app-ai-bounce": "app-ai-bounce 1.4s ease-in-out infinite both",
        "app-fade-in": "app-fade-in 200ms ease",
        "app-slide-in-right": "app-slide-in-right 200ms ease",
        "app-pulse-subtle": "app-pulse-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
