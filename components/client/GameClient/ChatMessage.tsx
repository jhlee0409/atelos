import { cn } from '@/lib/utils';
import { Bell, User, Drama, Sunrise, MessageCircle, Quote } from 'lucide-react';
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

export const ChatMessage = ({
  message,
  isLatest = false,
}: {
  message: {
    type: 'system' | 'player' | 'ai' | 'ai-dialogue' | 'ai-thought' | 'ai-narration';
    content: string;
    timestamp: number;
  };
  isLatest?: boolean;
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
              'bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-purple-500/30 shadow-lg',
            icon: Sunrise,
            label: '',
            showLabel: false,
          };
        } else {
          return {
            container: 'flex justify-center mb-4',
            bubble:
              'bg-gray-800/60 backdrop-blur-sm text-gray-300 px-4 py-2 rounded-lg text-sm border border-gray-600/30',
            icon: Bell,
            label: '',
            showLabel: false,
          };
        }
      case 'player':
        return {
          container: 'flex justify-end mb-4',
          bubble:
            'bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-2xl rounded-br-none max-w-md shadow-lg',
          icon: User,
          label: '나의 선택',
          showLabel: true,
        };
      case 'ai':
        return {
          container: 'flex justify-start mb-4',
          bubble:
            'bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-2xl rounded-bl-none max-w-lg shadow-lg',
          icon: Drama,
          label: '상황 변화',
          showLabel: true,
        };
      case 'ai-dialogue':
        // 대화 말풍선 - 더 밝은 색상, 인용 아이콘
        return {
          container: 'flex justify-start mb-2',
          bubble:
            'bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-3 rounded-2xl rounded-bl-none max-w-lg shadow-md border-l-4 border-indigo-300',
          icon: Quote,
          label: '',
          showLabel: false,
        };
      case 'ai-thought':
        // 독백/생각 말풍선 - 은은한 색상, 이탤릭 스타일
        return {
          container: 'flex justify-start mb-2',
          bubble:
            'bg-gradient-to-r from-slate-600/80 to-slate-500/80 text-slate-100 px-4 py-3 rounded-2xl rounded-bl-none max-w-lg shadow-sm border-l-4 border-slate-400/50 italic',
          icon: MessageCircle,
          label: '',
          showLabel: false,
        };
      case 'ai-narration':
        // 서술 말풍선 - 어두운 색상, 간결한 스타일
        return {
          container: 'flex justify-start mb-2',
          bubble:
            'bg-gray-700/80 text-gray-100 px-4 py-2 rounded-xl rounded-bl-none max-w-lg shadow-sm',
          icon: Drama,
          label: '',
          showLabel: false,
        };
      default:
        return {
          container: 'flex justify-center mb-4',
          bubble: 'bg-gray-600/50 text-gray-300 px-4 py-2 rounded-lg max-w-md',
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
