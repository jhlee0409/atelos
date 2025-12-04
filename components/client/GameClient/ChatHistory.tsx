import { SaveState } from '@/types';
import { ChatMessage } from './ChatMessage';

/**
 * AI 메시지를 대화/독백/서술 단위로 분리
 * - 쌍따옴표("): 대화 (dialogue)
 * - 홑따옴표('): 독백/생각 (thought)
 * - 그 외: 서술 (narration)
 */
const splitAIMessageIntoParts = (
  content: string,
  baseTimestamp: number,
): Array<{
  type: 'ai' | 'ai-dialogue' | 'ai-thought' | 'ai-narration';
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

  // 대화인지 확인 (쌍따옴표, 꺾쇠)
  const isDialogue = (text: string): boolean => {
    return (
      text.startsWith('"') ||
      text.startsWith('"') ||
      text.startsWith('「') ||
      text.startsWith('『') ||
      text.startsWith('**"') ||
      text.startsWith('**"')
    );
  };

  // 독백인지 확인 (홑따옴표)
  const isThought = (text: string): boolean => {
    return (
      text.startsWith("'") ||
      text.startsWith("'") ||
      text.startsWith("**'") ||
      text.startsWith("**'")
    );
  };

  return paragraphs.map((paragraph, index) => {
    let type: 'ai-dialogue' | 'ai-thought' | 'ai-narration' = 'ai-narration';
    if (isDialogue(paragraph)) {
      type = 'ai-dialogue';
    } else if (isThought(paragraph)) {
      type = 'ai-thought';
    }
    return {
      type,
      content: paragraph,
      timestamp: baseTimestamp + index,
    };
  });
};

export const ChatHistory = ({ saveState }: { saveState: SaveState }) => {
  // 메시지를 처리하여 AI 메시지는 분리
  const processedMessages: Array<{
    type: 'system' | 'player' | 'ai' | 'ai-dialogue' | 'ai-thought' | 'ai-narration';
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
