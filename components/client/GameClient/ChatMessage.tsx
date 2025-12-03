import { cn } from '@/lib/utils';
import { Bell, User, Drama, Sunrise, MessageCircle } from 'lucide-react';
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
 * 마크다운을 React 요소로 변환
 * 지원: **bold**, *italic*, ***bold italic***
 */
const renderMarkdown = (content: string): React.ReactNode[] => {
  const sanitized = sanitizeContent(content);
  const result: React.ReactNode[] = [];
  let key = 0;

  // 마크다운 패턴: ***bold italic***, **bold**, *italic*
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(sanitized)) !== null) {
    // 매치 전 일반 텍스트
    if (match.index > lastIndex) {
      result.push(sanitized.slice(lastIndex, match.index));
    }

    // 매치된 마크다운 처리
    if (match[2]) {
      // ***bold italic***
      result.push(
        <strong key={key++} className="font-bold italic">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      // **bold**
      result.push(
        <strong key={key++} className="font-bold">
          {match[3]}
        </strong>,
      );
    } else if (match[4]) {
      // *italic*
      result.push(
        <em key={key++} className="italic">
          {match[4]}
        </em>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  // 남은 텍스트
  if (lastIndex < sanitized.length) {
    result.push(sanitized.slice(lastIndex));
  }

  return result.length > 0 ? result : [sanitized];
};

export const ChatMessage = ({
  message,
  isLatest = false,
}: {
  message: {
    type: 'system' | 'player' | 'ai';
    content: string;
    timestamp: number;
  };
  isLatest?: boolean;
}) => {
  const getMessageStyle = () => {
    switch (message.type) {
      case 'system':
        // Day 변경 메시지인지 확인
        const isDayChange =
          message.content.includes('Day') && message.content.includes('시작');

        if (isDayChange) {
          return {
            container: 'flex justify-center mb-6',
            bubble:
              'bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-purple-500/30 shadow-lg',
            icon: Sunrise,
            label: '',
          };
        } else {
          return {
            container: 'flex justify-center mb-4',
            bubble:
              'bg-gray-800/60 backdrop-blur-sm text-gray-300 px-4 py-2 rounded-lg text-sm border border-gray-600/30',
            icon: Bell,
            label: '',
          };
        }
      case 'player':
        return {
          container: 'flex justify-end mb-4',
          bubble:
            'bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-2xl rounded-br-none max-w-md shadow-lg relative',
          icon: User,
          label: '나의 선택',
        };
      case 'ai':
        return {
          container: 'flex justify-start mb-4',
          bubble:
            'bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-2xl rounded-bl-none max-w-md shadow-lg relative',
          icon: Drama,
          label: '상황 변화',
        };
      default:
        return {
          container: 'flex justify-center mb-4',
          bubble: 'bg-gray-600/50 text-gray-300 px-4 py-2 rounded-lg max-w-md',
          icon: MessageCircle,
          label: '',
        };
    }
  };

  const style = getMessageStyle();
  const animationClass = isLatest ? 'animate-fade-in' : '';
  const IconComponent = style.icon;

  return (
    <div className={cn(style.container, animationClass)}>
      <div className={style.bubble}>
        {message.type !== 'system' && (
          <div className="mb-1 flex items-center text-xs font-semibold opacity-80">
            <IconComponent className="mr-1 h-3 w-3" />
            {style.label}
          </div>
        )}
        <div className="flex items-center whitespace-pre-wrap leading-relaxed">
          {message.type === 'system' && (
            <IconComponent className="mr-2 h-4 w-4 flex-shrink-0" />
          )}
          <span>{renderMarkdown(message.content)}</span>
        </div>
      </div>
    </div>
  );
};
