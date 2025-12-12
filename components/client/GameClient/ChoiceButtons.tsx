import { cn } from '@/lib/utils';
import { SaveState, GameMode, ActionType, ScenarioData } from '@/types';
import { AlertTriangle, MessageCircle, Pencil, MapPin, Zap, ArrowLeft, Sparkles, TrendingUp } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  analyzeActionSequence,
  getRecommendedActions,
  type ActionSequence,
} from '@/lib/action-engagement-system';

type ExpandedPanel = 'none' | 'choice' | 'freeText';

/** 기본 일일 행동 포인트 (GameClient.tsx와 동기화) */
const DEFAULT_ACTION_POINTS = 3;

/** 행동 유형별 AP 비용 */
const ACTION_COSTS: Record<ActionType, number> = {
  choice: 1,
  dialogue: 1,
  exploration: 1,
  freeText: 1,
};

export const ChoiceButtons = ({
  isLoading,
  error,
  saveState,
  scenario,
  isUrgent,
  handlePlayerChoice,
  isInitialLoading = false,
  onOpenDialogue,
  onOpenExploration,
  onFreeTextSubmit,
  gameMode = 'choice',
  enableDialogue = true,
  enableExploration = true,
  enableFreeText = true,
}: {
  isLoading: boolean;
  error: string | null;
  saveState: SaveState;
  scenario?: ScenarioData;
  isUrgent: boolean;
  handlePlayerChoice: (choice: string) => void;
  isInitialLoading?: boolean;
  onOpenDialogue?: () => void;
  onOpenExploration?: () => void;
  onFreeTextSubmit?: (text: string) => void;
  gameMode?: GameMode;
  enableDialogue?: boolean;
  enableExploration?: boolean;
  enableFreeText?: boolean;
}) => {
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>('none');
  const [freeText, setFreeText] = useState('');
  const freeTextRef = useRef<HTMLTextAreaElement>(null);

  // AP 관련 계산
  const currentAP = saveState.context.actionPoints ?? DEFAULT_ACTION_POINTS;

  // 각 행동별 AP 충족 여부
  const canDoChoice = currentAP >= ACTION_COSTS.choice;
  const canDoDialogue = currentAP >= ACTION_COSTS.dialogue;
  const canDoExploration = currentAP >= ACTION_COSTS.exploration;
  const canDoFreeText = currentAP >= ACTION_COSTS.freeText;

  // AP 부족 상태
  const isAPDepleted = currentAP === 0;
  const isLowAP = currentAP === 1;

  // 행동 시퀀스 분석 (시너지/콤보 체크)
  const actionSequence = useMemo<ActionSequence | null>(() => {
    if (!scenario) return null;
    const recentActions = saveState.context.actionsThisDay || [];
    const currentDay = saveState.context.currentDay || 1;
    return analyzeActionSequence(recentActions, currentDay);
  }, [saveState.context.actionsThisDay, saveState.context.currentDay, scenario]);

  // 추천 행동 (시나리오가 있을 때만)
  const recommendations = useMemo(() => {
    if (!scenario) return [];
    return getRecommendedActions(saveState, scenario).slice(0, 2);
  }, [saveState, scenario]);

  // 자유 입력 필드 포커스
  useEffect(() => {
    if (expandedPanel === 'freeText' && freeTextRef.current) {
      freeTextRef.current.focus();
    }
  }, [expandedPanel]);

  const handleFreeTextSubmit = () => {
    if (freeText.trim() && onFreeTextSubmit) {
      onFreeTextSubmit(freeText.trim());
      setFreeText('');
      setExpandedPanel('none');
    }
  };

  const handleChoiceSelect = (choice: string) => {
    handlePlayerChoice(choice);
    setExpandedPanel('none');
  };

  const handleBack = () => {
    setExpandedPanel('none');
    setFreeText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFreeTextSubmit();
    }
  };

  if (isLoading) {
    const loadingMessage = isInitialLoading
      ? '이야기를 준비하고 있습니다...'
      : '...';

    return (
      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-telos-black via-telos-black/95 to-transparent p-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center space-x-2 py-6">
            <div className="h-2 w-2 animate-bounce rounded-full bg-red-500 [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-red-500 [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-red-500"></div>
            <span className="ml-3 text-sm text-zinc-400">{loadingMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-telos-black via-telos-black/95 to-transparent p-4">
        <div className="mx-auto max-w-2xl">
          <div className="border border-red-900/50 bg-red-950/30 p-4 text-center text-red-400 backdrop-blur-sm">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            오류: {error}
          </div>
        </div>
      </div>
    );
  }

  // 딜레마가 유효하지 않은 경우 로딩 표시
  if (
    !saveState.dilemma ||
    !saveState.dilemma.prompt ||
    !saveState.dilemma.choice_a
  ) {
    return (
      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-telos-black via-telos-black/95 to-transparent p-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center space-x-2 py-6">
            <div className="h-2 w-2 animate-bounce rounded-full bg-red-500 [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-red-500 [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-red-500"></div>
            <span className="ml-3 text-sm text-zinc-400">
              이야기를 준비하고 있습니다...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-10 bg-gradient-to-t from-telos-black via-telos-black/95 to-transparent p-4">
      <div className="mx-auto max-w-2xl">
        {/* AP 부족 경고 배너 */}
        {isAPDepleted && (
          <div className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-zinc-400">
            <span className="text-sm">오늘 할 수 있는 일을 모두 마쳤다.</span>
          </div>
        )}

        {/* 마지막 행동 경고 */}
        {isLowAP && !isAPDepleted && (
          <div className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/30 px-4 py-2 text-zinc-500">
            <span className="text-sm">오늘 마지막으로 할 수 있는 일이다.</span>
          </div>
        )}

        {/* 행동 효과 표시 (몰입형 - 메카닉 이름 숨김) */}
        {actionSequence?.comboBonus && !isAPDepleted && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-zinc-700/30 bg-zinc-900/50 px-3 py-2">
            <Sparkles className="h-4 w-4 text-zinc-400" />
            <p className="text-xs text-zinc-400 italic">{actionSequence.comboBonus}</p>
          </div>
        )}

        {/* 통합 액션 패널 */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
          {/* 상황 설명 */}
          <p className="mb-4 text-sm leading-relaxed text-zinc-300">
            {saveState.dilemma.prompt}
          </p>

          {/* 액션 영역 */}
          <div className={cn(isAPDepleted && "opacity-40 pointer-events-none")}>
            {/* 기본 상태: 액션 버튼 한 줄 */}
            {expandedPanel === 'none' && (
              <div className="flex gap-2">
                <ActionIconButton
                  onClick={() => setExpandedPanel('choice')}
                  disabled={isLoading || !canDoChoice}
                  icon={<Zap className="h-4 w-4" />}
                  label="선택"
                  primary
                />
                {enableDialogue && onOpenDialogue && (
                  <ActionIconButton
                    onClick={onOpenDialogue}
                    disabled={isLoading || !canDoDialogue}
                    icon={<MessageCircle className="h-4 w-4" />}
                    label="대화"
                  />
                )}
                {enableExploration && onOpenExploration && (
                  <ActionIconButton
                    onClick={onOpenExploration}
                    disabled={isLoading || !canDoExploration}
                    icon={<MapPin className="h-4 w-4" />}
                    label="탐색"
                  />
                )}
                {enableFreeText && onFreeTextSubmit && (
                  <ActionIconButton
                    onClick={() => setExpandedPanel('freeText')}
                    disabled={isLoading || !canDoFreeText}
                    icon={<Pencil className="h-4 w-4" />}
                    label="기타"
                  />
                )}
              </div>
            )}

            {/* 선택지 확장 패널 */}
            {expandedPanel === 'choice' && (
              <div className="space-y-2">
                <ChoiceButton
                  onClick={() => handleChoiceSelect(saveState.dilemma.choice_a)}
                  disabled={isLoading}
                  label={saveState.dilemma.choice_a}
                />
                {saveState.dilemma.choice_b && (
                  <ChoiceButton
                    onClick={() => handleChoiceSelect(saveState.dilemma.choice_b)}
                    disabled={isLoading}
                    label={saveState.dilemma.choice_b}
                  />
                )}
                {saveState.dilemma.choice_c && (
                  <ChoiceButton
                    onClick={() => handleChoiceSelect(saveState.dilemma.choice_c!)}
                    disabled={isLoading}
                    label={saveState.dilemma.choice_c}
                  />
                )}
                <button
                  onClick={handleBack}
                  className="w-full flex items-center justify-center gap-1 py-2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  <ArrowLeft className="h-3 w-3" />
                  돌아가기
                </button>
              </div>
            )}

            {/* 자유 입력 확장 패널 */}
            {expandedPanel === 'freeText' && (
              <div className="space-y-3">
                <textarea
                  ref={freeTextRef}
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="어떤 행동을 할까?"
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                  rows={2}
                  maxLength={200}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    돌아가기
                  </button>
                  <button
                    onClick={handleFreeTextSubmit}
                    disabled={!freeText.trim() || isLoading}
                    className="rounded bg-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    행동하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** 액션 아이콘 버튼 (메인 한 줄 버튼) */
const ActionIconButton = ({
  onClick,
  disabled,
  icon,
  label,
  primary = false,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 px-3 transition-all",
        disabled
          ? "border-zinc-800/50 bg-zinc-950/30 text-zinc-600 cursor-not-allowed"
          : primary
            ? "border-zinc-600 bg-zinc-700/50 text-zinc-200 hover:bg-zinc-600/50 hover:border-zinc-500"
            : "border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
};

/** 선택지 버튼 (확장 패널용) */
const ChoiceButton = ({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-all",
        disabled
          ? "border-zinc-800 bg-zinc-950/50 text-zinc-600 cursor-not-allowed"
          : "border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-700/50 hover:border-zinc-600"
      )}
    >
      <span className="text-sm">{label}</span>
    </button>
  );
};
