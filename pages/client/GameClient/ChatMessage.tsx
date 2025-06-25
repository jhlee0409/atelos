import { cn } from '@/lib/utils';
import { Bell, User, Drama, Sunrise, MessageCircle } from 'lucide-react';

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
          {message.content}
        </div>
      </div>
    </div>
  );
};
