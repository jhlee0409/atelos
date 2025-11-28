import { cn, escapeHtml, sanitizeHtml } from '@/lib/utils';
import { getChoiceHint, formatImpactsForUI } from '@/lib/game-ai-client';
import { SaveState } from '@/types';
import { AlertTriangle, Info } from 'lucide-react';
import { useState } from 'react';

export const ChoiceButtons = ({
  isLoading,
  error,
  saveState,
  isUrgent,
  handlePlayerChoice,
  isInitialLoading = false,
}: {
  isLoading: boolean;
  error: string | null;
  saveState: SaveState;
  isUrgent: boolean;
  handlePlayerChoice: (choice: string) => void;
  isInitialLoading?: boolean;
}) => {
  if (isLoading) {
    const loadingMessage = isInitialLoading
      ? '첫 번째 딜레마를 생성하고 있습니다...'
      : 'AI가 다음 이야기를 생성 중입니다...';

    return (
      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-black via-black/95 to-transparent p-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center space-x-2 py-6">
            <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500"></div>
            <span className="ml-3 text-sm text-gray-400">{loadingMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-black via-black/95 to-transparent p-4">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg bg-red-900/50 p-4 text-center text-red-300 backdrop-blur-sm">
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
      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-black via-black/95 to-transparent p-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center space-x-2 py-6">
            <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500"></div>
            <span className="ml-3 text-sm text-gray-400">
              첫 번째 딜레마를 준비하고 있습니다...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-10 bg-gradient-to-t from-black via-black/95 to-transparent p-4">
      <div className="mx-auto max-w-2xl">
        {/* Dilemma Prompt */}
        <DilemmaPrompt prompt={saveState.dilemma.prompt} isUrgent={isUrgent} />
        {/* Choice Buttons */}
        <div className="flex space-x-3">
          <ChoiceButton
            choice={saveState.dilemma.choice_a}
            onClick={() => handlePlayerChoice(saveState.dilemma.choice_a)}
            variant="primary"
            disabled={isLoading}
            urgency={isUrgent}
          />
          <ChoiceButton
            choice={saveState.dilemma.choice_b}
            onClick={() => handlePlayerChoice(saveState.dilemma.choice_b)}
            variant="secondary"
            disabled={isLoading || !saveState.dilemma.choice_b}
            urgency={isUrgent}
          />
        </div>
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
}: {
  choice: string | undefined;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  urgency?: boolean;
  showHints?: boolean;
}) => {
  const [isHintVisible, setIsHintVisible] = useState(false);

  const baseClasses =
    'flex-1 p-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg min-h-[48px] relative overflow-hidden';

  const variantClasses =
    variant === 'primary'
      ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white'
      : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white';

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
        <div
          className="relative z-10 text-center leading-tight"
          dangerouslySetInnerHTML={{ __html: highlightKeywords(choice || '') }}
        />
        {urgency && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-400/20 to-orange-400/20" />
        )}
        {/* 힌트 토글 버튼 */}
        {showHints && hint && hint.category !== 'general' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsHintVisible(!isHintVisible);
            }}
            className="absolute right-2 top-2 z-20 rounded-full bg-black/30 p-1 transition-colors hover:bg-black/50"
            aria-label="힌트 보기"
          >
            <Info className="h-3 w-3 text-white/70" />
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
    <div className="mb-4 rounded-2xl bg-gray-900/80 p-4 text-center backdrop-blur-sm">
      <p className="text-sm leading-relaxed text-yellow-300">
        {sanitizePrompt(prompt)}
      </p>
      {isUrgent && (
        <div className="mt-2 flex items-center justify-center space-x-1 text-xs text-yellow-400">
          <AlertTriangle className="h-3 w-3" />
          <span>중요한 결정입니다</span>
          <AlertTriangle className="h-3 w-3" />
        </div>
      )}
    </div>
  );
};
