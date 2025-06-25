import { SaveState } from '@/types';
import { ChatMessage } from './ChatMessage';

export const ChatHistory = ({ saveState }: { saveState: SaveState }) => {
  return (
    <div
      id="chat-container"
      className="flex-1 overflow-y-auto px-4 pb-4"
      style={{ height: 'calc(100vh - 140px)' }}
    >
      <div className="mx-auto max-w-2xl pt-4">
        {saveState.chatHistory.map((message, index) => {
          const isLatest = index === saveState.chatHistory.length - 1;

          return (
            <ChatMessage
              key={message.timestamp}
              message={message}
              isLatest={isLatest}
            />
          );
        })}
      </div>
    </div>
  );
};
