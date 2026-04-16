'use client';

import { useState } from 'react';
import { LoaderIcon, SaveIcon, ShieldIcon, BellIcon, DatabaseIcon, GlobeIcon } from 'lucide-react';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

type SettingTab = 'general' | 'notifications' | 'security' | 'system';

const TABS: { id: SettingTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: '일반', icon: GlobeIcon },
  { id: 'notifications', label: '알림', icon: BellIcon },
  { id: 'security', label: '보안', icon: ShieldIcon },
  { id: 'system', label: '시스템', icon: DatabaseIcon },
];

interface SettingRowProps {
  readonly label: string;
  readonly description?: string;
  readonly children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  id,
  label,
}: {
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
  readonly id: string;
  readonly label: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
        aria-hidden="true"
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // General settings state
  const [siteName, setSiteName] = useState('기업 그룹웨어');
  const [language, setLanguage] = useState('ko');
  const [timezone, setTimezone] = useState('Asia/Seoul');

  // Notification settings state
  const [emailNotif, setEmailNotif] = useState(true);
  const [approvalNotif, setApprovalNotif] = useState(true);
  const [messageNotif, setMessageNotif] = useState(true);
  const [scheduleNotif, setScheduleNotif] = useState(false);

  // Security settings state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('480');
  const [passwordExpiry, setPasswordExpiry] = useState('90');

  // System settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [debugLogging, setDebugLogging] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState('10');

  const handleSave = async () => {
    setIsSaving(true);
    // 실제 구현 시 API 호출 — 현재는 UI 데모
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">시스템 설정</h1>
        <p className="text-sm text-muted-foreground mt-0.5">그룹웨어 시스템 전역 설정을 관리합니다.</p>
      </div>

      {/* 탭 */}
      <nav
        aria-label="설정 카테고리"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <TabIcon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* 설정 패널 */}
      <div className={cn(GLASS.card, 'p-6')}>
        {activeTab === 'general' && (
          <section aria-labelledby="general-heading">
            <h2 id="general-heading" className="sr-only">일반 설정</h2>
            <SettingRow label="사이트 이름" description="상단 네비게이션에 표시되는 서비스 이름입니다.">
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-48 rounded-md border border-input px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="사이트 이름"
              />
            </SettingRow>
            <SettingRow label="언어" description="시스템 기본 언어를 설정합니다.">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-36 rounded-md border border-input px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="언어 설정"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </SettingRow>
            <SettingRow label="시간대" description="시스템 전체에서 사용할 시간대입니다.">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-44 rounded-md border border-input px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="시간대 설정"
              >
                <option value="Asia/Seoul">서울 (UTC+9)</option>
                <option value="UTC">UTC (UTC+0)</option>
                <option value="America/New_York">뉴욕 (UTC-5)</option>
              </select>
            </SettingRow>
          </section>
        )}

        {activeTab === 'notifications' && (
          <section aria-labelledby="notif-heading">
            <h2 id="notif-heading" className="sr-only">알림 설정</h2>
            <SettingRow label="이메일 알림" description="중요 이벤트 발생 시 이메일로 알림을 발송합니다.">
              <Toggle id="n-email" checked={emailNotif} onChange={setEmailNotif} label="이메일 알림 토글" />
            </SettingRow>
            <SettingRow label="결재 알림" description="결재 요청 및 처리 결과를 알림으로 전송합니다.">
              <Toggle id="n-approval" checked={approvalNotif} onChange={setApprovalNotif} label="결재 알림 토글" />
            </SettingRow>
            <SettingRow label="메시지 알림" description="새 메시지 수신 시 알림을 표시합니다.">
              <Toggle id="n-message" checked={messageNotif} onChange={setMessageNotif} label="메시지 알림 토글" />
            </SettingRow>
            <SettingRow label="일정 알림" description="일정 시작 전 알림을 발송합니다.">
              <Toggle id="n-schedule" checked={scheduleNotif} onChange={setScheduleNotif} label="일정 알림 토글" />
            </SettingRow>
          </section>
        )}

        {activeTab === 'security' && (
          <section aria-labelledby="security-heading">
            <h2 id="security-heading" className="sr-only">보안 설정</h2>
            <SettingRow label="다중 인증 필수" description="모든 사용자에게 2FA(OTP) 인증을 의무화합니다.">
              <Toggle id="s-mfa" checked={mfaRequired} onChange={setMfaRequired} label="다중 인증 필수 토글" />
            </SettingRow>
            <SettingRow label="세션 만료 시간 (분)" description="비활성 상태 시 자동 로그아웃되는 시간입니다.">
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                min={30}
                max={1440}
                className="w-24 rounded-md border border-input px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="세션 만료 시간(분)"
              />
            </SettingRow>
            <SettingRow label="비밀번호 만료 주기 (일)" description="이 기간이 지나면 비밀번호 변경을 요구합니다.">
              <input
                type="number"
                value={passwordExpiry}
                onChange={(e) => setPasswordExpiry(e.target.value)}
                min={0}
                max={365}
                className="w-24 rounded-md border border-input px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="비밀번호 만료 주기(일)"
              />
            </SettingRow>
          </section>
        )}

        {activeTab === 'system' && (
          <section aria-labelledby="system-heading">
            <h2 id="system-heading" className="sr-only">시스템 설정</h2>
            <SettingRow
              label="유지보수 모드"
              description="활성화 시 일반 사용자 접근이 차단됩니다. 관리자는 계속 접속 가능합니다."
            >
              <Toggle id="sys-maintenance" checked={maintenanceMode} onChange={setMaintenanceMode} label="유지보수 모드 토글" />
            </SettingRow>
            <SettingRow label="디버그 로깅" description="상세 로그를 기록합니다. 프로덕션에서는 비활성화하세요.">
              <Toggle id="sys-debug" checked={debugLogging} onChange={setDebugLogging} label="디버그 로깅 토글" />
            </SettingRow>
            <SettingRow label="최대 파일 크기 (MB)" description="파일 드라이브에 업로드할 수 있는 최대 파일 크기입니다.">
              <input
                type="number"
                value={maxFileSize}
                onChange={(e) => setMaxFileSize(e.target.value)}
                min={1}
                max={100}
                className="w-24 rounded-md border border-input px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="최대 파일 크기(MB)"
              />
            </SettingRow>
          </section>
        )}
      </div>

      {/* 저장 버튼 */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <p role="status" aria-live="polite" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            설정이 저장되었습니다.
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="설정 저장"
        >
          {isSaving ? (
            <LoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <SaveIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
