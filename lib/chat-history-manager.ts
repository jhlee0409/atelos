// ===========================================
// 채팅 히스토리 관리 시스템 (토큰 최적화)
// ===========================================

export interface ChatMessage {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    day?: number;
    tokenCount?: number;
    isKeyEvent?: boolean;
    statChanges?: Record<string, number>;
  };
}

export class ChatHistoryManager {
  private messages: ChatMessage[] = [];
  private maxMessages: number = 50;
  private maxTokens: number = 5000;
  private keyEvents: Set<string> = new Set();

  constructor(maxMessages = 50, maxTokens = 5000) {
    this.maxMessages = maxMessages;
    this.maxTokens = maxTokens;
  }

  // 메시지 추가
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const newMessage: ChatMessage = {
      ...message,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    // 중요 이벤트 마킹
    if (this.isKeyEvent(message.content)) {
      newMessage.metadata = {
        ...newMessage.metadata,
        isKeyEvent: true,
      };
      this.keyEvents.add(newMessage.id);
    }

    this.messages.push(newMessage);
    this.pruneHistory();
  }

  // 프롬프트용 압축된 히스토리 가져오기
  getCompressedHistory(maxTokens: number = 1000): string {
    const recentMessages = this.getRecentMessages(5);
    const keyMessages = this.getKeyEventMessages(3);
    
    // 중복 제거하며 병합
    const uniqueMessages = new Map<string, ChatMessage>();
    [...keyMessages, ...recentMessages].forEach(msg => {
      uniqueMessages.set(msg.id, msg);
    });

    // 시간순 정렬
    const sortedMessages = Array.from(uniqueMessages.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    // 압축된 형태로 변환
    let compressed = sortedMessages
      .map(msg => this.compressMessage(msg))
      .join(' → ');

    // 토큰 제한 적용
    if (compressed.length > maxTokens * 4) {
      compressed = compressed.substring(0, maxTokens * 4) + '...';
    }

    return compressed;
  }

  // 메시지 압축
  private compressMessage(message: ChatMessage): string {
    const { role, content, metadata } = message;
    
    // 핵심 내용만 추출
    let compressed = content.substring(0, 100);
    
    // 역할별 프리픽스
    const prefix = role === 'user' ? '선택' : '결과';
    
    // 중요 스탯 변화 포함
    if (metadata?.statChanges) {
      const changes = Object.entries(metadata.statChanges)
        .filter(([, value]) => Math.abs(value) > 5)
        .map(([key, value]) => `${key}:${value > 0 ? '+' : ''}${value}`)
        .join(',');
      if (changes) {
        compressed += ` [${changes}]`;
      }
    }

    return `${prefix}: ${compressed}`;
  }

  // 최근 메시지 가져오기
  private getRecentMessages(count: number): ChatMessage[] {
    return this.messages.slice(-count);
  }

  // 중요 이벤트 메시지 가져오기
  private getKeyEventMessages(count: number): ChatMessage[] {
    return this.messages
      .filter(msg => msg.metadata?.isKeyEvent)
      .slice(-count);
  }

  // 중요 이벤트 판별
  private isKeyEvent(content: string): boolean {
    const keyPhrases = [
      '사망', '죽음', '발견', '동맹', '배신', 
      '탈출', '구조', '붕괴', '성공', '실패',
      '위기', '해결', '희생', '구출', '포기'
    ];
    
    return keyPhrases.some(phrase => content.includes(phrase));
  }

  // 히스토리 정리 (메모리 관리)
  private pruneHistory(): void {
    // 메시지 수 제한
    if (this.messages.length > this.maxMessages) {
      // 중요 이벤트는 보존
      const keyEvents = this.messages.filter(msg => msg.metadata?.isKeyEvent);
      const recentMessages = this.messages.slice(-20);
      
      // 중복 제거하며 병합
      const preserved = new Map<string, ChatMessage>();
      [...keyEvents, ...recentMessages].forEach(msg => {
        preserved.set(msg.id, msg);
      });
      
      this.messages = Array.from(preserved.values())
        .sort((a, b) => a.timestamp - b.timestamp);
    }
  }

  // 날짜별 요약
  getDailySummary(day: number): string {
    const dayMessages = this.messages.filter(
      msg => msg.metadata?.day === day
    );
    
    if (dayMessages.length === 0) return '';
    
    // 주요 선택과 결과만 추출
    const summary = dayMessages
      .filter(msg => msg.role === 'user' || msg.metadata?.isKeyEvent)
      .map(msg => this.compressMessage(msg))
      .join(', ');
    
    return `Day ${day}: ${summary}`;
  }

  // 전체 여정 요약 (엔딩용)
  getJourneySummary(): string {
    const summaries: string[] = [];
    
    // 각 날짜별 요약
    for (let day = 1; day <= 7; day++) {
      const summary = this.getDailySummary(day);
      if (summary) summaries.push(summary);
    }
    
    return summaries.join('\n');
  }

  // 컨텍스트 윈도우 최적화
  getOptimizedContext(currentDay: number, tokenBudget: number = 500): {
    context: string;
    tokenCount: number;
  } {
    // 현재 날짜와 이전 날짜 중심으로 컨텍스트 구성
    const relevantDays = [currentDay - 1, currentDay];
    const relevantMessages = this.messages.filter(
      msg => msg.metadata?.day && relevantDays.includes(msg.metadata.day)
    );
    
    // 중요도 점수 계산
    const scoredMessages = relevantMessages.map(msg => ({
      message: msg,
      score: this.calculateImportanceScore(msg, currentDay),
    }));
    
    // 점수순 정렬 후 상위 메시지 선택
    scoredMessages.sort((a, b) => b.score - a.score);
    
    let context = '';
    let tokenCount = 0;
    
    for (const { message } of scoredMessages) {
      const compressed = this.compressMessage(message);
      const msgTokens = Math.ceil(compressed.length / 4 * 1.5); // 한국어 토큰 추정
      
      if (tokenCount + msgTokens > tokenBudget) break;
      
      context += compressed + ' ';
      tokenCount += msgTokens;
    }
    
    return { context: context.trim(), tokenCount };
  }

  // 메시지 중요도 점수 계산
  private calculateImportanceScore(message: ChatMessage, currentDay: number): number {
    let score = 0;
    
    // 최근 메시지일수록 높은 점수
    const dayDiff = currentDay - (message.metadata?.day || 0);
    score += Math.max(0, 10 - dayDiff * 2);
    
    // 중요 이벤트는 추가 점수
    if (message.metadata?.isKeyEvent) score += 20;
    
    // 큰 스탯 변화는 추가 점수
    if (message.metadata?.statChanges) {
      const totalChange = Object.values(message.metadata.statChanges)
        .reduce((sum, val) => sum + Math.abs(val), 0);
      score += Math.min(totalChange, 15);
    }
    
    // 사용자 선택은 추가 점수
    if (message.role === 'user') score += 5;
    
    return score;
  }

  // ID 생성
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 통계 정보
  getStats(): {
    totalMessages: number;
    keyEvents: number;
    estimatedTokens: number;
    oldestMessage: Date | null;
  } {
    const totalTokens = this.messages.reduce((sum, msg) => {
      const tokens = Math.ceil(msg.content.length / 4 * 1.5);
      return sum + tokens;
    }, 0);
    
    return {
      totalMessages: this.messages.length,
      keyEvents: this.keyEvents.size,
      estimatedTokens: totalTokens,
      oldestMessage: this.messages.length > 0 
        ? new Date(this.messages[0].timestamp)
        : null,
    };
  }

  // 히스토리 초기화
  clear(): void {
    this.messages = [];
    this.keyEvents.clear();
  }

  // 내보내기/가져오기
  export(): string {
    return JSON.stringify({
      messages: this.messages,
      keyEvents: Array.from(this.keyEvents),
    });
  }

  import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.messages = parsed.messages || [];
      this.keyEvents = new Set(parsed.keyEvents || []);
    } catch (error) {
      console.error('Failed to import chat history:', error);
    }
  }
}