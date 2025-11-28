'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { testGeminiConnection } from '@/lib/gemini-client';

export default function GeminiTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const isConnected = await testGeminiConnection();

      if (isConnected) {
        setResult({
          success: true,
          message: '✅ 제미나이 API 연결이 성공적으로 확인되었습니다!',
        });
      } else {
        setResult({
          success: false,
          message:
            '❌ 제미나이 API 연결에 실패했습니다. API 키를 확인해주세요.',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ 연결 테스트 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>제미나이 API 연결 테스트</CardTitle>
        <CardDescription>제미나이 API 연결 상태를 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleTest} disabled={isLoading} className="w-full">
          {isLoading ? '테스트 중...' : '연결 테스트'}
        </Button>

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <p className="mb-2 font-medium">환경 변수 설정 방법:</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              프로젝트 루트에{' '}
              <code className="rounded bg-muted px-1">.env.local</code> 파일
              생성
            </li>
            <li>다음 내용 추가:</li>
          </ol>
          <pre className="mt-2 rounded bg-muted p-2 text-xs">
            {`GOOGLE_GEMINI_API_KEY=your_api_key_here`}
          </pre>
          <p className="mt-2 text-xs text-green-600">
            ✓ API 키는 서버에서만 사용되며 클라이언트에 노출되지 않습니다.
          </p>
          <p className="mt-2 text-xs">
            API 키는{' '}
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Google AI Studio
            </a>
            에서 발급받을 수 있습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
