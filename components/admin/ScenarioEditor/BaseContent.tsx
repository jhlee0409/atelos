'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Sparkles, Loader2, ImageOff } from 'lucide-react';
import type { ScenarioData } from '@/types';
import { SetStateAction, useState } from 'react';
import { VALIDATION_IDS } from '@/constants/scenario';
import { cn } from '@/lib/utils';
import { generatePosterImage, uploadImage, inferSettingFromScenario } from '@/lib/image-generator';
import { updateScenario } from '@/lib/scenario-api';
import { toast } from 'sonner';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
  errors: string[];
  onSave?: () => Promise<void>; // 이미지 생성 후 자동 저장용
};

export default function BaseContent({ scenario, setScenario, errors, onSave }: Props) {
  const [newGenre, setNewGenre] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const [isImageError, setIsImageError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null); // 저장 대기 중인 base64 이미지

  // AI로 포스터 이미지 생성
  const handleGeneratePoster = async () => {
    if (!scenario.title) {
      setGenerateError('시나리오 제목을 먼저 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setIsImageError(false);

    try {
      // 시나리오 정보에서 배경 설정 추론 (다양성 향상)
      const setting = inferSettingFromScenario({
        synopsis: scenario.synopsis,
        genre: scenario.genre,
      });

      const result = await generatePosterImage({
        title: scenario.title,
        genre: scenario.genre,
        synopsis: scenario.synopsis,
        keywords: scenario.coreKeywords,
        setting,
      });

      console.log('🎨 [BaseContent] 이미지 생성 결과:', result);
      if (result.success && result.imageBase64) {
        console.log('✅ [BaseContent] 이미지 생성 완료 (미리보기용 base64)');
        // 미리보기용으로 pending 상태에 저장 (아직 Storage에 업로드 안함)
        setPendingImageBase64(result.imageBase64);
        toast.success('이미지가 생성되었습니다. 미리보기를 확인 후 저장해주세요.');
      } else {
        console.error('❌ [BaseContent] 이미지 생성 실패:', result.error);
        setGenerateError(result.error || '이미지 생성에 실패했습니다.');
      }
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // 생성된 이미지 저장 (Storage 업로드 → Firestore 저장)
  const handleSaveGeneratedImage = async () => {
    if (!pendingImageBase64) return;

    if (!scenario.scenarioId) {
      toast.error('시나리오 ID가 필요합니다. 먼저 시나리오 ID를 입력해주세요.');
      return;
    }

    setIsSavingImage(true);
    try {
      // 1. Vercel Blob Storage에 업로드
      console.log('📤 [BaseContent] Storage 업로드 시작...');
      const uploadResult = await uploadImage({
        imageBase64: pendingImageBase64,
        scenarioId: scenario.scenarioId,
        type: 'poster',
      });

      if (!uploadResult.success || !uploadResult.imageUrl) {
        throw new Error(uploadResult.error || 'Storage 업로드에 실패했습니다.');
      }

      console.log('✅ [BaseContent] Storage 업로드 완료:', uploadResult.imageUrl);

      // 2. Firestore에 URL 저장
      const updatedScenario = {
        ...scenario,
        posterImageUrl: uploadResult.imageUrl,
      };

      await updateScenario(updatedScenario);
      setScenario(updatedScenario);
      setPendingImageBase64(null);
      toast.success('포스터 이미지가 저장되었습니다.');
    } catch (error) {
      console.error('❌ [BaseContent] 이미지 저장 실패:', error);
      toast.error(error instanceof Error ? error.message : '이미지 저장에 실패했습니다.');
    } finally {
      setIsSavingImage(false);
    }
  };

  // 생성된 이미지 취소 (다시 생성)
  const handleDiscardGeneratedImage = () => {
    setPendingImageBase64(null);
    toast.info('이미지가 취소되었습니다. 다시 생성해주세요.');
  };

  // Tag management
  const addTag = (type: 'genre' | 'coreKeywords', value: string) => {
    if (value.trim()) {
      const processedValue =
        type === 'coreKeywords' && !value.startsWith('#') ? `#${value}` : value;
      setScenario((prev) => ({
        ...prev,
        [type]: [...prev[type], processedValue.trim()],
      }));
      if (type === 'genre') setNewGenre('');
      if (type === 'coreKeywords') setNewKeyword('');
    }
  };

  const removeTag = (type: 'genre' | 'coreKeywords', index: number) => {
    setScenario((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  return (
    <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
      <CardHeader>
        <CardTitle className="font-sans text-2xl text-kairos-gold">
          시나리오 기본 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              시나리오 고유 ID <span className="text-red-500">*</span>
            </label>
            <Input
              value={scenario.scenarioId}
              onChange={(e) => {
                const value = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z_]/g, '');
                setScenario((prev) => ({ ...prev, scenarioId: value }));
              }}
              className={`border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20 ${
                errors.includes(VALIDATION_IDS.SCENARIO_ID)
                  ? 'border-red-500'
                  : ''
              }`}
              placeholder="ZERO_HOUR"
            />
            <p className="mt-1 text-xs text-socratic-grey">
              시스템에서 시나리오를 구분하는 고유한 영문 ID입니다. (예:
              ZERO_HOUR)
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              시나리오 제목 <span className="text-red-500">*</span>
            </label>
            <Input
              value={scenario.title}
              onChange={(e) =>
                setScenario((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              className={`border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20 ${
                errors.includes(VALIDATION_IDS.TITLE) ? 'border-red-500' : ''
              }`}
              placeholder="제로 아워: 도시의 법칙"
              maxLength={50}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-800">
            시나리오 포스터 이미지 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={handleGeneratePoster}
                disabled={isGenerating}
                className={`w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 ${
                  errors.includes(VALIDATION_IDS.POSTER_IMAGE_URL)
                    ? 'ring-2 ring-red-500'
                    : ''
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI가 이미지를 생성하는 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI로 포스터 이미지 생성
                  </>
                )}
              </Button>
              <p className="text-xs text-socratic-grey">
                시나리오 제목, 장르, 시놉시스, 키워드를 기반으로 AI가 포스터 이미지를 생성합니다.
              </p>
            </div>
            {generateError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{generateError}</p>
              </div>
            )}
          </div>
          {/* 이미지 미리보기 영역 */}
          <div className="mt-3">
            {/* 새로 생성된 이미지 (저장 대기 중) */}
            {pendingImageBase64 && (
              <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4">
                <p className="mb-2 text-sm font-medium text-green-700">
                  ✨ 새 이미지가 생성되었습니다 - 저장하시겠습니까?
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingImageBase64}
                  alt="생성된 포스터 미리보기"
                  className="h-64 w-44 rounded border object-cover"
                />
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={handleSaveGeneratedImage}
                    disabled={isSavingImage}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {isSavingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      '이 이미지로 저장'
                    )}
                  </Button>
                  <Button
                    onClick={handleDiscardGeneratedImage}
                    variant="outline"
                    disabled={isSavingImage}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    취소 (다시 생성)
                  </Button>
                </div>
              </div>
            )}

            {/* 기존 저장된 이미지 */}
            {!pendingImageBase64 && scenario.posterImageUrl && (
              <div className="rounded-lg border border-kairos-gold/30 bg-kairos-gold/10 p-3">
                <p
                  className={cn(
                    'text-sm text-kairos-gold',
                    isImageError && 'text-red-500',
                  )}
                >
                  {!isImageError
                    ? '✓ 저장된 포스터 이미지'
                    : '✗ 이미지를 불러올 수 없습니다'}
                </p>
                {!isImageError && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={scenario.posterImageUrl}
                    alt="포스터 미리보기"
                    className="mt-2 h-48 w-32 rounded border object-cover"
                    onError={() => setIsImageError(true)}
                  />
                )}
              </div>
            )}

            {/* 이미지 없음 */}
            {!pendingImageBase64 && !scenario.posterImageUrl && (
              <div className={cn(
                "rounded-lg border-2 border-dashed p-6 text-center",
                errors.includes(VALIDATION_IDS.POSTER_IMAGE_URL)
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 bg-gray-50"
              )}>
                <ImageOff className={cn(
                  "mx-auto h-12 w-12",
                  errors.includes(VALIDATION_IDS.POSTER_IMAGE_URL)
                    ? "text-red-400"
                    : "text-gray-400"
                )} />
                <p className={cn(
                  "mt-2 text-sm font-medium",
                  errors.includes(VALIDATION_IDS.POSTER_IMAGE_URL)
                    ? "text-red-600"
                    : "text-gray-600"
                )}>
                  포스터 이미지가 생성되지 않았습니다
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  위 버튼을 클릭하여 AI로 포스터를 생성해주세요
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-800">
            시나리오 시놉시스 <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={scenario.synopsis}
            onChange={(e) =>
              setScenario((prev) => ({
                ...prev,
                synopsis: e.target.value,
              }))
            }
            className={`min-h-[120px] border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20 ${
              errors.includes(VALIDATION_IDS.SYNOPSIS) ? 'border-red-500' : ''
            }`}
            placeholder="시나리오의 전체적인 개요와 배경을 설명하세요"
            maxLength={1000}
          />
          <p className="mt-1 text-xs text-socratic-grey">
            {scenario.synopsis.length}/1000자
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-800">
            플레이어 목표 <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={scenario.playerGoal}
            onChange={(e) =>
              setScenario((prev) => ({
                ...prev,
                playerGoal: e.target.value,
              }))
            }
            className={`border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20 ${
              errors.includes(VALIDATION_IDS.PLAYER_GOAL)
                ? 'border-red-500'
                : ''
            }`}
            placeholder="플레이어가 달성해야 할 목표를 설명하세요"
            maxLength={200}
            rows={3}
          />
          <p className="mt-1 text-xs text-socratic-grey">
            {scenario.playerGoal.length}/200자
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              장르 <span className="text-red-500">*</span>
            </label>
            <div className="mb-2 flex gap-2">
              <Input
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                className="border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                placeholder="사회 드라마, 스릴러"
                onKeyDown={(e) =>
                  e.key === 'Enter' && addTag('genre', newGenre)
                }
              />
              <Button
                onClick={() => addTag('genre', newGenre)}
                variant="outline"
                className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {scenario.genre.map((g, index) => (
                <Badge
                  key={index}
                  className="bg-socratic-grey text-white hover:bg-socratic-grey/80"
                >
                  {g}
                  <button
                    onClick={() => removeTag('genre', index)}
                    className="ml-2 hover:text-red-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="mt-1 text-xs text-socratic-grey">
              시나리오의 장르를 입력하세요.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              핵심 키워드 <span className="text-red-500">*</span>
            </label>
            <div className="mb-2 flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="border-socratic-grey bg-parchment-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                placeholder="리더십, 딜레마"
                onKeyDown={(e) =>
                  e.key === 'Enter' && addTag('coreKeywords', newKeyword)
                }
              />
              <Button
                onClick={() => addTag('coreKeywords', newKeyword)}
                variant="outline"
                className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {scenario.coreKeywords.map((k, index) => (
                <Badge
                  key={index}
                  className="bg-socratic-grey text-white hover:bg-socratic-grey/80"
                >
                  {k}
                  <button
                    onClick={() => removeTag('coreKeywords', index)}
                    className="ml-2 hover:text-red-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="mt-1 text-xs text-socratic-grey">
              시나리오의 특징을 나타내는 키워드 (최소 3개, 최대 5개, #으로 시작)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
