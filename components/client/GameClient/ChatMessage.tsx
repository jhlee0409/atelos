import { cn } from '@/lib/utils';
import { Bell, User, Drama, Sunrise, MessageCircle, Quote, GitBranch, History } from 'lucide-react';
import React from 'react';

/**
 * 메시지 내용을 안전하게 정제
 */
const sanitizeContent = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return '';
  }
  return content
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
};

/**
 * 마크다운 인라인 요소를 React 요소로 변환
 * 지원: **bold**, *italic*, ***bold italic***
 */
const renderInlineMarkdown = (
  text: string,
  keyPrefix: string,
): React.ReactNode[] => {
  const result: React.ReactNode[] = [];
  let key = 0;

  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      result.push(
        <strong key={`${keyPrefix}-${key++}`} className="font-bold italic">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      result.push(
        <strong key={`${keyPrefix}-${key++}`} className="font-bold">
          {match[3]}
        </strong>,
      );
    } else if (match[4]) {
      result.push(
        <em key={`${keyPrefix}-${key++}`} className="italic opacity-90">
          {match[4]}
        </em>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
};

/**
 * 2025 Enhanced: 이전 선택이 영향을 미쳤음을 나타내는 정보
 */
export interface ChoiceInfluence {
  hasInfluence: boolean;
  relatedChoice?: string;
  dayNumber?: number;
}

export const ChatMessage = ({
  message,
  isLatest = false,
  choiceInfluence,
}: {
  message: {
    type: 'system' | 'player' | 'ai' | 'ai-dialogue' | 'ai-thought' | 'ai-narration';
    content: string;
    timestamp: number;
  };
  isLatest?: boolean;
  /** 2025 Enhanced: 이전 선택이 현재 내러티브에 영향을 미쳤는지 표시 */
  choiceInfluence?: ChoiceInfluence;
}) => {
  const getMessageStyle = () => {
    switch (message.type) {
      case 'system':
        const isDayChange =
          message.content.includes('Day') && message.content.includes('시작');

        if (isDayChange) {
          return {
            container: 'flex justify-center mb-6',
            bubble:
              'bg-red-950/30 backdrop-blur-sm text-zinc-100 px-6 py-3 border border-red-900/50',
            icon: Sunrise,
            label: '',
            showLabel: false,
          };
        } else {
          return {
            container: 'flex justify-center mb-4',
            bubble:
              'bg-zinc-900/60 backdrop-blur-sm text-zinc-400 px-4 py-2 text-sm border border-zinc-800',
            icon: Bell,
            label: '',
            showLabel: false,
          };
        }
      case 'player':
        return {
          container: 'flex justify-end mb-4',
          bubble:
            'bg-red-900 text-white px-4 py-3 max-w-md border border-red-700',
          icon: User,
          label: '나의 선택',
          showLabel: true,
        };
      case 'ai':
        return {
          container: 'flex justify-start mb-4',
          bubble:
            'bg-zinc-900 text-zinc-100 px-4 py-3 max-w-lg border border-zinc-800',
          icon: Drama,
          label: '상황 변화',
          showLabel: true,
        };
      case 'ai-dialogue':
        // 대화 말풍선 - 인용 아이콘
        return {
          container: 'flex justify-start mb-2',
          bubble:
            'bg-zinc-800/80 text-zinc-200 px-4 py-3 max-w-lg border-l-2 border-red-900',
          icon: Quote,
          label: '',
          showLabel: false,
        };
      case 'ai-thought':
        // 독백/생각 말풍선 - 이탤릭 스타일
        return {
          container: 'flex justify-start mb-2',
          bubble:
            'bg-zinc-900/50 text-zinc-400 px-4 py-3 max-w-lg border-l-2 border-zinc-700 italic',
          icon: MessageCircle,
          label: '',
          showLabel: false,
        };
      case 'ai-narration':
        // 서술 말풍선 - 간결한 스타일
        return {
          container: 'flex justify-start mb-2',
          bubble:
            'bg-zinc-900/40 text-zinc-300 px-4 py-2 max-w-lg',
          icon: Drama,
          label: '',
          showLabel: false,
        };
      default:
        return {
          container: 'flex justify-center mb-4',
          bubble: 'bg-zinc-900/50 text-zinc-400 px-4 py-2 max-w-md',
          icon: MessageCircle,
          label: '',
          showLabel: false,
        };
    }
  };

  const style = getMessageStyle();
  const animationClass = isLatest ? 'animate-fade-in' : '';
  const IconComponent = style.icon;
  const sanitizedContent = sanitizeContent(message.content);

  return (
    <div className={cn(style.container, animationClass)}>
      <div className={style.bubble}>
        {/* 2025 Enhanced: 이전 선택 영향 표시 */}
        {choiceInfluence?.hasInfluence && message.type === 'ai' && (
          <div
            className="mb-2 flex items-center gap-1 text-[10px] text-amber-500/80 bg-amber-900/20 rounded px-2 py-1 -mx-1"
            title={choiceInfluence.relatedChoice ? `관련 선택: ${choiceInfluence.relatedChoice}` : '이전 선택이 영향을 미쳤습니다'}
          >
            <History className="h-3 w-3" />
            <span>
              {choiceInfluence.dayNumber
                ? `Day ${choiceInfluence.dayNumber}의 선택이 영향을 미쳤습니다`
                : '이전 선택이 결과에 영향을 미쳤습니다'}
            </span>
          </div>
        )}
        {style.showLabel && (
          <div className="mb-2 flex items-center text-xs font-semibold opacity-80">
            <IconComponent className="mr-1 h-3 w-3" />
            {style.label}
          </div>
        )}
        <div className="leading-relaxed">
          {message.type === 'system' ? (
            <div className="flex items-center">
              <IconComponent className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{renderInlineMarkdown(sanitizedContent, 'sys')}</span>
            </div>
          ) : message.type === 'ai-dialogue' ? (
            <div className="flex items-start gap-2">
              <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" />
              <span className="italic">
                {renderInlineMarkdown(sanitizedContent, 'dlg')}
              </span>
            </div>
          ) : message.type === 'ai-thought' ? (
            <div className="flex items-start gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-50" />
              <span>{renderInlineMarkdown(sanitizedContent, 'tht')}</span>
            </div>
          ) : (
            <span>{renderInlineMarkdown(sanitizedContent, 'msg')}</span>
          )}
        </div>
      </div>
    </div>
  );
};
