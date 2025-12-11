import { cn } from '@/lib/utils';
import { SaveState, GameMode, ActionType } from '@/types';
import { AlertTriangle, MessageCircle, Pencil, MapPin } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
  const [showFreeTextInput, setShowFreeTextInput] = useState(false);
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

  // 자유 입력 필드 포커스
  useEffect(() => {
    if (showFreeTextInput && freeTextRef.current) {
      freeTextRef.current.focus();
    }
  }, [showFreeTextInput]);

  const handleFreeTextSubmit = () => {
    if (freeText.trim() && onFreeTextSubmit) {
      onFreeTextSubmit(freeText.trim());
      setFreeText('');
      setShowFreeTextInput(false);
    }
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

        {/* 통합 액션 패널 */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
          {/* 상황 설명 */}
          <p className="mb-4 text-sm leading-relaxed text-zinc-300">
            {saveState.dilemma.prompt}
          </p>

          {/* 모든 행동 옵션들 */}
          <div className={cn("space-y-2", isAPDepleted && "opacity-40 pointer-events-none")}>
            {/* AI 생성 선택지들 */}
            <ActionButton
              onClick={() => handlePlayerChoice(saveState.dilemma.choice_a)}
              disabled={isLoading || !canDoChoice}
              label={saveState.dilemma.choice_a}
            />
            {saveState.dilemma.choice_b && (
              <ActionButton
                onClick={() => handlePlayerChoice(saveState.dilemma.choice_b)}
                disabled={isLoading || !canDoChoice}
                label={saveState.dilemma.choice_b}
              />
            )}
            {saveState.dilemma.choice_c && (
              <ActionButton
                onClick={() => handlePlayerChoice(saveState.dilemma.choice_c!)}
                disabled={isLoading || !canDoChoice}
                label={saveState.dilemma.choice_c}
              />
            )}

            {/* 보조 액션 (한 줄 아이콘 버튼) */}
            {(enableDialogue || enableExploration || enableFreeText) && (
              <>
                {!showFreeTextInput ? (
                  <div className="flex gap-2 pt-2 border-t border-zinc-800/50 mt-3">
                    {enableDialogue && onOpenDialogue && (
                      <SecondaryActionButton
                        onClick={onOpenDialogue}
                        disabled={isLoading || !canDoDialogue}
                        icon={<MessageCircle className="h-4 w-4" />}
                        label="대화"
                      />
                    )}
                    {enableExploration && onOpenExploration && (
                      <SecondaryActionButton
                        onClick={onOpenExploration}
                        disabled={isLoading || !canDoExploration}
                        icon={<MapPin className="h-4 w-4" />}
                        label="탐색"
                      />
                    )}
                    {enableFreeText && onFreeTextSubmit && (
                      <SecondaryActionButton
                        onClick={() => setShowFreeTextInput(true)}
                        disabled={isLoading || !canDoFreeText}
                        icon={<Pencil className="h-4 w-4" />}
                        label="기타"
                      />
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 mt-3">
                    <textarea
                      ref={freeTextRef}
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="어떤 행동을 할까?"
                      className="w-full resize-none bg-transparent text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
                      rows={2}
                      maxLength={200}
                      disabled={isLoading}
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowFreeTextInput(false);
                          setFreeText('');
                        }}
                        className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleFreeTextSubmit}
                        disabled={!freeText.trim() || isLoading}
                        className="rounded bg-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        행동하기
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** 주요 선택지 버튼 */
const ActionButton = ({
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

/** 보조 액션 버튼 (아이콘 + 짧은 라벨) */
const SecondaryActionButton = ({
  onClick,
  disabled,
  icon,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 px-3 transition-all",
        disabled
          ? "border-zinc-800/50 bg-zinc-950/30 text-zinc-600 cursor-not-allowed"
          : "border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
};
