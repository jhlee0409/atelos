import { SaveState, ChangeSummaryData } from '@/types';
import { ChatMessage } from './ChatMessage';
import { ChangeSummary } from './ChangeSummary';

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

  // 메시지 타입 결정 함수
  const determineType = (text: string): 'ai-dialogue' | 'ai-thought' | 'ai-narration' => {
    if (isDialogue(text)) {
      return 'ai-dialogue';
    } else if (isThought(text)) {
      return 'ai-thought';
    }
    return 'ai-narration';
  };

  // 문단이 1개여도 타입을 구분
  if (paragraphs.length === 1) {
    return [{
      type: determineType(paragraphs[0]),
      content: paragraphs[0],
      timestamp: baseTimestamp,
    }];
  }

  return paragraphs.map((paragraph, index) => ({
    type: determineType(paragraph),
    content: paragraph,
    timestamp: baseTimestamp + index,
  }));
};

export const ChatHistory = ({ saveState }: { saveState: SaveState }) => {
  // 메시지를 처리하여 AI 메시지는 분리
  const processedMessages: Array<{
    type: 'system' | 'player' | 'ai' | 'ai-dialogue' | 'ai-thought' | 'ai-narration' | 'change-summary';
    content: string;
    timestamp: number;
    changeSummary?: ChangeSummaryData;
  }> = [];

  saveState.chatHistory.forEach((message) => {
    if (message.type === 'ai') {
      // AI 메시지는 대화/서술로 분리
      const parts = splitAIMessageIntoParts(message.content, message.timestamp);
      processedMessages.push(...parts);
    } else if (message.type === 'change-summary') {
      // 변화 요약 메시지는 그대로 (changeSummary 포함)
      processedMessages.push({
        type: 'change-summary',
        content: message.content,
        timestamp: message.timestamp,
        changeSummary: message.changeSummary,
      });
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

          // 변화 요약 메시지는 ChangeSummary 컴포넌트로 렌더링
          if (message.type === 'change-summary' && message.changeSummary) {
            return (
              <ChangeSummary
                key={`${message.timestamp}-${index}`}
                data={message.changeSummary}
                isCompact={false}
              />
            );
          }

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
