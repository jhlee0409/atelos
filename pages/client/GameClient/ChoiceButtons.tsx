import { cn } from '@/lib/utils';
import { SaveState } from '@/types';
import { AlertTriangle } from 'lucide-react';

export const ChoiceButtons = ({
  isLoading,
  error,
  saveState,
  isUrgent,
  handlePlayerChoice,
}: {
  isLoading: boolean;
  error: string | null;
  saveState: SaveState;
  isUrgent: boolean;
  handlePlayerChoice: (choice: string) => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center space-x-2 py-6">
        <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500"></div>
        <span className="ml-3 text-sm text-gray-400">
          AI가 다음 이야기를 생성 중입니다...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/50 p-4 text-center text-red-300 backdrop-blur-sm">
        <AlertTriangle className="mr-2 inline h-4 w-4" />
        오류: {error}
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

// 선택지 버튼 컴포넌트
const ChoiceButton = ({
  choice,
  onClick,
  variant = 'primary',
  disabled = false,
  urgency = false,
}: {
  choice: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  urgency?: boolean;
}) => {
  const baseClasses =
    'flex-1 p-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg min-h-[48px] relative overflow-hidden';

  const variantClasses =
    variant === 'primary'
      ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white'
      : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white';

  const urgencyClasses = urgency ? 'animate-pulse ring-2 ring-yellow-400' : '';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  // 핵심 키워드 강조
  const highlightKeywords = (text: string) => {
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
    let highlightedText = text;

    keywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        highlightedText = highlightedText.replace(
          keyword,
          `<span class="font-extrabold text-yellow-300">${keyword}</span>`,
        );
      }
    });

    return highlightedText;
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses,
        urgencyClasses,
        disabledClasses,
      )}
    >
      <div
        className="relative z-10 text-center leading-tight"
        dangerouslySetInnerHTML={{ __html: highlightKeywords(choice) }}
      />
      {urgency && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-400/20 to-orange-400/20" />
      )}
    </button>
  );
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
      <p className="text-sm leading-relaxed text-yellow-300">{prompt}</p>
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
