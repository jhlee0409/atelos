import { SaveState } from '@/types';
import { ChatMessage } from './ChatMessage';

/**
 * AI 메시지를 대화/서술 단위로 분리
 * 따옴표로 시작하는 문단은 대화, 그 외는 서술
 */
const splitAIMessageIntoParts = (
  content: string,
  baseTimestamp: number,
): Array<{
  type: 'ai' | 'ai-dialogue' | 'ai-narration';
  content: string;
  timestamp: number;
}> => {
  // 줄바꿈 정규화
  const normalized = content
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  // 문단으로 분리
  const paragraphs = normalized
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return [{ type: 'ai', content, timestamp: baseTimestamp }];
  }

  // 문단이 1개면 분리하지 않음
  if (paragraphs.length === 1) {
    return [{ type: 'ai', content: paragraphs[0], timestamp: baseTimestamp }];
  }

  // 대화인지 확인하는 함수 (따옴표로 시작)
  const isDialogue = (text: string): boolean => {
    return (
      text.startsWith('"') ||
      text.startsWith('"') ||
      text.startsWith("'") ||
      text.startsWith(''') ||
      text.startsWith('「') ||
      text.startsWith('『') ||
      text.startsWith('**"') ||
      text.startsWith('**"') ||
      text.startsWith("**'")
    );
  };

  return paragraphs.map((paragraph, index) => ({
    type: isDialogue(paragraph) ? 'ai-dialogue' : 'ai-narration',
    content: paragraph,
    timestamp: baseTimestamp + index,
  }));
};

export const ChatHistory = ({ saveState }: { saveState: SaveState }) => {
  // 메시지를 처리하여 AI 메시지는 분리
  const processedMessages: Array<{
    type: 'system' | 'player' | 'ai' | 'ai-dialogue' | 'ai-narration';
    content: string;
    timestamp: number;
  }> = [];

  saveState.chatHistory.forEach((message) => {
    if (message.type === 'ai') {
      // AI 메시지는 대화/서술로 분리
      const parts = splitAIMessageIntoParts(message.content, message.timestamp);
      processedMessages.push(...parts);
    } else {
      // 다른 타입은 그대로
      processedMessages.push(message);
    }
  });

  return (
    <div
      id="chat-container"
      className="flex-1 overflow-y-auto px-4 pb-4"
      style={{ height: 'calc(100vh - 140px)' }}
    >
      <div className="mx-auto max-w-2xl pt-4">
        {processedMessages.map((message, index) => {
          const isLatest = index === processedMessages.length - 1;

          return (
            <ChatMessage
              key={`${message.timestamp}-${index}`}
              message={message}
              isLatest={isLatest}
            />
          );
        })}
      </div>
    </div>
  );
};
