import { cn, escapeHtml, sanitizeHtml } from '@/lib/utils';
import { getChoiceHint, formatImpactsForUI } from '@/lib/game-ai-client';
import { SaveState, GameMode, ActionType } from '@/types';
import { AlertTriangle, Info, MessageCircle, Send, MapPin, ChevronDown, ChevronUp, Zap } from 'lucide-react';
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

/** AP 비용 배지 컴포넌트 */
const APCostBadge = ({ cost, isDisabled = false }: { cost: number; isDisabled?: boolean }) => (
  <span className={cn(
    "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px]",
    isDisabled
      ? "bg-zinc-800 text-zinc-600"
      : "bg-blue-900/50 text-blue-300"
  )}>
    <Zap className="h-2.5 w-2.5" />
    <span>{cost}</span>
  </span>
);

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
  const [showActions, setShowActions] = useState(false);
  const freeTextRef = useRef<HTMLTextAreaElement>(null);

  // AP 관련 계산
  const currentAP = saveState.context.actionPoints ?? DEFAULT_ACTION_POINTS;
  const maxAP = saveState.context.maxActionPoints ?? DEFAULT_ACTION_POINTS;

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
      ? '첫 번째 딜레마를 생성하고 있습니다...'
      : 'AI가 다음 이야기를 생성 중입니다...';

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
    console.log('⚠️ 딜레마가 아직 준비되지 않음:', saveState.dilemma);
    return (
      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-telos-black via-telos-black/95 to-transparent p-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center space-x-2 py-6">
            <div className="h-2 w-2 animate-bounce rounded-full bg-red-500 [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-red-500 [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-red-500"></div>
            <span className="ml-3 text-sm text-zinc-400">
              첫 번째 딜레마를 준비하고 있습니다...
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
          <div className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-orange-800/50 bg-orange-950/30 px-4 py-2 text-orange-400">
            <Zap className="h-4 w-4" />
            <span className="text-sm">행동력을 모두 사용했습니다. 다음 날을 기다려주세요.</span>
          </div>
        )}

        {/* 마지막 행동 경고 */}
        {isLowAP && !isAPDepleted && (
          <div className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-yellow-800/50 bg-yellow-950/20 px-4 py-2 text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">마지막 행동입니다. 신중하게 선택하세요.</span>
          </div>
        )}

        {/* Dilemma Prompt */}
        <DilemmaPrompt prompt={saveState.dilemma.prompt} isUrgent={isUrgent} />

        {/* Choice Buttons - 3개 선택지 */}
        <div className={cn("flex flex-col space-y-2", isAPDepleted && "opacity-50 pointer-events-none")}>
          {/* 상단: 적극적/신중한 선택지 2개 */}
          <div className="flex space-x-3">
            <ChoiceButton
              choice={saveState.dilemma.choice_a}
              onClick={() => handlePlayerChoice(saveState.dilemma.choice_a)}
              variant="primary"
              disabled={isLoading || !canDoChoice}
              urgency={isUrgent}
              choiceType="active"
            />
            <ChoiceButton
              choice={saveState.dilemma.choice_b}
              onClick={() => handlePlayerChoice(saveState.dilemma.choice_b)}
              variant="secondary"
              disabled={isLoading || !saveState.dilemma.choice_b || !canDoChoice}
              urgency={isUrgent}
              choiceType="cautious"
            />
          </div>
          {/* 하단: 대기/관망 선택지 (있는 경우) */}
          {saveState.dilemma.choice_c && (
            <ChoiceButton
              choice={saveState.dilemma.choice_c}
              onClick={() => handlePlayerChoice(saveState.dilemma.choice_c!)}
              variant="tertiary"
              disabled={isLoading || !canDoChoice}
              urgency={false}
              choiceType="wait"
            />
          )}
        </div>

        {/* 추가 액션 토글 버튼 */}
        <button
          onClick={() => setShowActions(!showActions)}
          className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span>다른 행동</span>
          {showActions ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {/* 추가 액션 패널 */}
        {showActions && (
          <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* 캐릭터 대화 & 탐색 버튼 (AP 비용 표시) */}
            <div className="flex gap-2">
              {enableDialogue && onOpenDialogue && (
                <button
                  onClick={onOpenDialogue}
                  disabled={isLoading || !canDoDialogue}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                    canDoDialogue
                      ? "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
                      : "border-zinc-800 bg-zinc-950/50 text-zinc-600 cursor-not-allowed",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>캐릭터와 대화</span>
                  <APCostBadge cost={ACTION_COSTS.dialogue} isDisabled={!canDoDialogue} />
                </button>
              )}
              {enableExploration && onOpenExploration && (
                <button
                  onClick={onOpenExploration}
                  disabled={isLoading || !canDoExploration}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                    canDoExploration
                      ? "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
                      : "border-zinc-800 bg-zinc-950/50 text-zinc-600 cursor-not-allowed",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  <span>주변 탐색</span>
                  <APCostBadge cost={ACTION_COSTS.exploration} isDisabled={!canDoExploration} />
                </button>
              )}
            </div>

            {/* 자유 텍스트 입력 (AP 비용 표시) */}
            {enableFreeText && onFreeTextSubmit && (
              <div className="space-y-2">
                {!showFreeTextInput ? (
                  <button
                    onClick={() => setShowFreeTextInput(true)}
                    disabled={isLoading || !canDoFreeText}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm transition-all",
                      canDoFreeText
                        ? "border-zinc-700 bg-zinc-950/50 text-zinc-500 hover:bg-zinc-900 hover:border-zinc-600 hover:text-zinc-300"
                        : "border-zinc-800 bg-zinc-950/50 text-zinc-600 cursor-not-allowed",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <Send className="h-3 w-3" />
                    <span>직접 행동 입력</span>
                    <APCostBadge cost={ACTION_COSTS.freeText} isDisabled={!canDoFreeText} />
                  </button>
                ) : (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-2">
                    <textarea
                      ref={freeTextRef}
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="원하는 행동을 입력하세요... (예: 창문 밖을 살펴본다)"
                      className="w-full resize-none bg-transparent text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
                      rows={2}
                      maxLength={200}
                      disabled={isLoading}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">
                        {freeText.length}/200
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowFreeTextInput(false);
                            setFreeText('');
                          }}
                          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleFreeTextSubmit}
                          disabled={!freeText.trim() || isLoading}
                          className="rounded bg-red-900 px-3 py-1 text-xs text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          전송
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 선택지 버튼 컴포넌트 (예상 결과 힌트 포함)
const ChoiceButton = ({
  choice,
  onClick,
  variant = 'primary',
  disabled = false,
  urgency = false,
  showHints = true,
  choiceType = 'active',
}: {
  choice: string | undefined;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  urgency?: boolean;
  showHints?: boolean;
  choiceType?: 'active' | 'cautious' | 'wait';
}) => {
  // 기본적으로 힌트 표시 (사용자가 숨기기 가능)
  const [isHintVisible, setIsHintVisible] = useState(true);

  const baseClasses =
    'flex-1 p-4 font-bold transition-all duration-300 transform hover:-translate-y-1 active:scale-95 min-h-[48px] relative overflow-hidden border';

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-red-900 hover:bg-red-800 text-white border-red-700 shadow-[0_0_15px_rgba(127,29,29,0.5)]';
      case 'secondary':
        return 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border-zinc-700';
      case 'tertiary':
        return 'bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border-zinc-800 text-sm';
      default:
        return 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border-zinc-700';
    }
  };

  const variantClasses = getVariantClasses();

  // 선택지 유형별 라벨
  const getChoiceTypeLabel = () => {
    switch (choiceType) {
      case 'active':
        return '⚔️ 적극적';
      case 'cautious':
        return '🛡️ 신중한';
      case 'wait':
        return '⏳ 관망';
      default:
        return '';
    }
  };

  const urgencyClasses = urgency ? 'animate-pulse ring-2 ring-yellow-400' : '';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  // 핵심 키워드 강조 (XSS 방지 적용)
  const highlightKeywords = (text: string) => {
    // text가 undefined나 null인 경우 빈 문자열로 처리
    if (!text || typeof text !== 'string') {
      return '';
    }

    // 1. 먼저 HTML 이스케이프하여 XSS 방지
    const escapedText = escapeHtml(text);

    const keywords = [
      '공격',
      '방어',
      '협상',
      '도망',
      '위험',
      '안전',
      '진행',
      '후퇴',
    ];

    // 2. 이스케이프된 텍스트에서 안전하게 키워드 강조
    let highlightedText = escapedText;
    keywords.forEach((keyword) => {
      // 키워드도 이스케이프하여 일치 확인 (특수문자가 없는 한국어라 동일)
      const escapedKeyword = escapeHtml(keyword);
      if (highlightedText.includes(escapedKeyword)) {
        highlightedText = highlightedText.replace(
          escapedKeyword,
          `<span class="font-extrabold text-yellow-300">${escapedKeyword}</span>`,
        );
      }
    });

    // 3. 최종적으로 sanitizeHtml로 한 번 더 검증
    return sanitizeHtml(highlightedText);
  };

  // 예상 결과 힌트 계산
  const hint = choice ? getChoiceHint(choice) : null;
  const impactTexts = hint ? formatImpactsForUI(hint.predictedImpacts) : [];

  // 위험도별 색상
  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-300';
      case 'medium':
        return 'text-yellow-300';
      case 'low':
        return 'text-green-300';
    }
  };

  const choiceTypeLabel = getChoiceTypeLabel();

  return (
    <div className="flex-1">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          baseClasses,
          variantClasses,
          urgencyClasses,
          disabledClasses,
          'w-full',
        )}
      >
        {/* 선택지 유형 라벨 */}
        {choiceTypeLabel && (
          <div className="absolute left-2 top-2 z-10 text-[10px] opacity-70">
            {choiceTypeLabel}
          </div>
        )}
        <div
          className={cn(
            "relative z-10 text-center leading-tight",
            choiceTypeLabel && "pt-3" // 라벨이 있으면 위쪽 패딩 추가
          )}
          dangerouslySetInnerHTML={{ __html: highlightKeywords(choice || '') }}
        />
        {urgency && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-400/20 to-orange-400/20" />
        )}
        {/* 힌트 토글 버튼 - 힌트가 표시 중일 때만 숨기기 버튼 표시 */}
        {showHints && hint && hint.category !== 'general' && isHintVisible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsHintVisible(false);
            }}
            className="absolute right-2 top-2 z-20 rounded-full bg-black/50 p-1 text-[10px] text-white/50 transition-colors hover:bg-black/70 hover:text-white/80"
            aria-label="힌트 숨기기"
          >
            ✕
          </button>
        )}
      </button>

      {/* 예상 결과 힌트 표시 */}
      {showHints && hint && isHintVisible && hint.category !== 'general' && (
        <div className="mt-1 rounded-lg bg-black/60 px-3 py-2 text-xs backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">{hint.shortHint}</span>
            <span className={cn('text-[10px]', getRiskColor(hint.riskLevel))}>
              {hint.riskLevel === 'high'
                ? '위험'
                : hint.riskLevel === 'medium'
                  ? '보통'
                  : '안전'}
            </span>
          </div>
          {impactTexts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {impactTexts.map((text, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px]',
                    text.startsWith('↑')
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-red-900/50 text-red-300',
                  )}
                >
                  {text}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * AI 생성 프롬프트를 안전하게 정제 (XSS 방지)
 * @param prompt AI가 생성한 프롬프트
 * @returns 정제된 안전한 프롬프트
 */
const sanitizePrompt = (prompt: string): string => {
  if (!prompt || typeof prompt !== 'string') {
    return '';
  }
  // HTML 태그 및 위험한 패턴 제거
  return prompt
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/javascript:/gi, '') // javascript: 프로토콜 제거
    .replace(/on\w+=/gi, ''); // 이벤트 핸들러 제거
};

export const DilemmaPrompt = ({
  prompt,
  isUrgent,
}: {
  prompt: string;
  isUrgent: boolean;
}) => {
  return (
    <div className="mb-4 border border-zinc-800 bg-zinc-900/80 p-4 text-center backdrop-blur-sm">
      <p className="text-sm leading-relaxed text-zinc-300">
        {sanitizePrompt(prompt)}
      </p>
      {isUrgent && (
        <div className="mt-2 flex items-center justify-center space-x-1 text-xs text-red-400">
          <AlertTriangle className="h-3 w-3" />
          <span className="uppercase tracking-wider">Critical Decision</span>
          <AlertTriangle className="h-3 w-3" />
        </div>
      )}
    </div>
  );
};
