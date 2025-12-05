'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, Sparkles, Loader2, UserCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Character, Relationship, ScenarioData } from '@/types';
import { SetStateAction, useState } from 'react';
import { generateCharacterImage, uploadImage } from '@/lib/image-generator';
import { updateScenario } from '@/lib/scenario-api';
import { toast } from 'sonner';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
  errors: string[];
};

export default function CharacterContent({
  scenario,
  setScenario,
  errors,
}: Props) {
  // Character management
  const addCharacter = () => {
    const newCharacter: Character = {
      roleId: '',
      roleName: '',
      characterName: '',
      backstory: '',
      imageUrl: '',
      weightedTraitTypes: [],
      currentTrait: null,
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      characters: [...prev.characters, newCharacter],
    }));
  };

  const saveCharacter = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      characters: prev.characters.map((char, i) =>
        i === index ? { ...char, isEditing: false } : char,
      ),
    }));
  };

  const editCharacter = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      characters: prev.characters.map((char, i) =>
        i === index ? { ...char, isEditing: true } : char,
      ),
    }));
  };

  const removeCharacter = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      characters: prev.characters.filter((_, i) => i !== index),
    }));
  };

  const updateCharacter = (
    index: number,
    field: keyof Character,
    value: any,
  ) => {
    setScenario((prev) => ({
      ...prev,
      characters: prev.characters.map((char, i) =>
        i === index ? { ...char, [field]: value } : char,
      ),
    }));
  };

  // Relationship management
  const addRelationship = () => {
    const newRelationship: Relationship = {
      id: Date.now().toString(),
      personA: '',
      personB: '',
      value: 0,
      reason: '',
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      initialRelationships: [...prev.initialRelationships, newRelationship],
    }));
  };

  const saveRelationship = (id: string) => {
    setScenario((prev) => ({
      ...prev,
      initialRelationships: prev.initialRelationships.map((rel) =>
        rel.id === id ? { ...rel, isEditing: false } : rel,
      ),
    }));
  };

  const editRelationship = (id: string) => {
    setScenario((prev) => ({
      ...prev,
      initialRelationships: prev.initialRelationships.map((rel) =>
        rel.id === id ? { ...rel, isEditing: true } : rel,
      ),
    }));
  };

  const removeRelationship = (id: string) => {
    setScenario((prev) => ({
      ...prev,
      initialRelationships: prev.initialRelationships.filter(
        (rel) => rel.id !== id,
      ),
    }));
  };

  const updateRelationship = (
    id: string,
    field: keyof Relationship,
    value: any,
  ) => {
    setScenario((prev) => ({
      ...prev,
      initialRelationships: prev.initialRelationships.map((rel) =>
        rel.id === id ? { ...rel, [field]: value } : rel,
      ),
    }));
  };

  return (
    <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-sans text-2xl text-kairos-gold">
            등장인물 및 관계 설정
          </CardTitle>
          <Button
            onClick={addCharacter}
            variant="outline"
            className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
          >
            <Plus className="mr-2 h-4 w-4" />
            인물 추가
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {scenario.characters.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-800">
                등장인물이 없습니다
              </h3>
              <p className="mb-4 text-sm text-socratic-grey">
                시나리오에 등장할 인물들을 추가해보세요.
              </p>
              <Button
                onClick={addCharacter}
                className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
              >
                <Plus className="mr-2 h-4 w-4" />첫 번째 인물 추가
              </Button>
            </div>
          ) : (
            scenario.characters.map((character, index) => (
              <CharacterCard
                key={index}
                scenario={scenario}
                setScenario={setScenario}
                errors={errors}
                character={character}
                index={index}
                saveCharacter={saveCharacter}
                removeCharacter={removeCharacter}
                editCharacter={editCharacter}
                updateCharacter={updateCharacter}
              />
            ))
          )}

          {/* 초기 관계 설정 */}
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-medium text-gray-800">초기 관계 설정</h4>
              <Button
                onClick={addRelationship}
                variant="outline"
                size="sm"
                className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                disabled={scenario.characters.length < 2}
              >
                <Plus className="mr-2 h-4 w-4" />
                관계 추가
              </Button>
            </div>

            {scenario.initialRelationships.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Plus className="h-6 w-6 text-gray-400" />
                </div>
                <h4 className="text-md mb-2 font-medium text-gray-800">
                  관계 설정이 없습니다
                </h4>
                <p className="mb-3 text-sm text-socratic-grey">
                  등장인물 간의 초기 관계를 설정해보세요.
                </p>
                {scenario.characters.length >= 2 ? (
                  <Button
                    onClick={addRelationship}
                    size="sm"
                    className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    관계 추가
                  </Button>
                ) : (
                  <p className="text-xs text-socratic-grey">
                    관계 설정을 위해서는 최소 2명의 등장인물이 필요합니다.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {scenario.initialRelationships.map((relationship) => (
                  <Card
                    key={relationship.id}
                    className={`${relationship.isEditing ? 'border-kairos-gold/50 bg-white/50' : 'border-socratic-grey/30 bg-gray-50/50'} relative`}
                  >
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      {relationship.isEditing ? (
                        <>
                          <Button
                            onClick={() => saveRelationship(relationship.id)}
                            size="sm"
                            className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                          >
                            저장
                          </Button>
                          <button
                            onClick={() => removeRelationship(relationship.id)}
                            className="text-socratic-grey hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Badge className="border-green-300 bg-green-100 text-green-800">
                            추가됨
                          </Badge>
                          <Button
                            onClick={() => editRelationship(relationship.id)}
                            size="sm"
                            variant="outline"
                            className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                          >
                            수정
                          </Button>
                          <button
                            onClick={() => removeRelationship(relationship.id)}
                            className="text-socratic-grey hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <CardContent className="pt-6">
                      <div className="mb-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-800">
                            인물 A <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={relationship.personA}
                            onValueChange={(value) =>
                              updateRelationship(
                                relationship.id,
                                'personA',
                                value,
                              )
                            }
                            disabled={!relationship.isEditing}
                          >
                            <SelectTrigger className="border-socratic-grey bg-white">
                              <SelectValue placeholder="인물 A 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {scenario.characters.map((char, index) => (
                                <SelectItem
                                  key={index}
                                  value={char.characterName}
                                >
                                  {char.characterName || `인물 ${index + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-800">
                            인물 B <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={relationship.personB}
                            onValueChange={(value) =>
                              updateRelationship(
                                relationship.id,
                                'personB',
                                value,
                              )
                            }
                            disabled={!relationship.isEditing}
                          >
                            <SelectTrigger className="border-socratic-grey bg-white">
                              <SelectValue placeholder="인물 B 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {scenario.characters.map((char, index) => (
                                <SelectItem
                                  key={index}
                                  value={char.characterName}
                                >
                                  {char.characterName || `인물 ${index + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-800">
                            초기 관계도 수치: {relationship.value}
                          </label>
                          <Slider
                            value={[relationship.value]}
                            onValueChange={(value) =>
                              updateRelationship(
                                relationship.id,
                                'value',
                                value[0],
                              )
                            }
                            min={-100}
                            max={100}
                            step={1}
                            className="w-full"
                            disabled={!relationship.isEditing}
                          />
                          <div className="mt-1 flex justify-between text-xs text-socratic-grey">
                            <span>-100 (적대)</span>
                            <span>0 (중립)</span>
                            <span>100 (우호)</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-800">
                            관계 설정 이유
                          </label>
                          <Input
                            value={relationship.reason}
                            onChange={(e) =>
                              updateRelationship(
                                relationship.id,
                                'reason',
                                e.target.value,
                              )
                            }
                            className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                            placeholder="과거의 악연"
                            maxLength={50}
                            disabled={!relationship.isEditing}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type CharacterCardProps = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
  errors: string[];
  character: Character;
  index: number;
  saveCharacter: (index: number) => void;
  removeCharacter: (index: number) => void;
  editCharacter: (index: number) => void;
  updateCharacter: (index: number, field: keyof Character, value: any) => void;
};

const CharacterCard = ({
  scenario,
  character,
  index,
  saveCharacter,
  removeCharacter,
  editCharacter,
  updateCharacter,
}: CharacterCardProps) => {
  const [isImageError, setIsImageError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null); // 저장 대기 중인 base64 이미지

  // AI로 캐릭터 이미지 생성
  const handleGenerateCharacterImage = async () => {
    if (!character.characterName) {
      setGenerateError('캐릭터 이름을 먼저 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setIsImageError(false);

    try {
      const result = await generateCharacterImage({
        characterName: character.characterName,
        roleName: character.roleName || '',
        backstory: character.backstory || '',
        scenarioTitle: scenario.title || '',
        scenarioGenre: scenario.genre || [],
      });

      if (result.success && result.imageBase64) {
        // 미리보기용으로 pending 상태에 저장 (아직 Storage에 업로드 안함)
        setPendingImageBase64(result.imageBase64);
        toast.success('캐릭터 이미지가 생성되었습니다. 미리보기를 확인 후 저장해주세요.');
      } else {
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
      console.log('📤 [CharacterContent] Storage 업로드 시작...');
      const uploadResult = await uploadImage({
        imageBase64: pendingImageBase64,
        scenarioId: scenario.scenarioId,
        type: 'character',
        fileName: character.characterName,
      });

      if (!uploadResult.success || !uploadResult.imageUrl) {
        throw new Error(uploadResult.error || 'Storage 업로드에 실패했습니다.');
      }

      console.log('✅ [CharacterContent] Storage 업로드 완료:', uploadResult.imageUrl);

      // 2. 로컬 상태 업데이트
      updateCharacter(index, 'imageUrl', uploadResult.imageUrl);

      // 3. Firestore에 저장
      const updatedCharacters = [...scenario.characters];
      updatedCharacters[index] = {
        ...updatedCharacters[index],
        imageUrl: uploadResult.imageUrl,
      };
      const updatedScenario = {
        ...scenario,
        characters: updatedCharacters,
      };

      await updateScenario(updatedScenario);
      setPendingImageBase64(null);
      toast.success('캐릭터 이미지가 저장되었습니다.');
    } catch (error) {
      console.error('❌ [CharacterContent] 이미지 저장 실패:', error);
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
  return (
    <Card
      key={index}
      className={`${character.isEditing ? 'border-kairos-gold/50 bg-white/50' : 'border-socratic-grey/30 bg-gray-50/50'} relative`}
    >
      <div className="absolute right-3 top-3 flex items-center gap-2">
        {character.isEditing ? (
          <>
            <Button
              onClick={() => saveCharacter(index)}
              size="sm"
              className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
            >
              저장
            </Button>
            <button
              onClick={() => removeCharacter(index)}
              className="text-socratic-grey transition-colors hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Badge className="border-green-300 bg-green-100 text-green-800">
              추가됨
            </Badge>
            <Button
              onClick={() => editCharacter(index)}
              size="sm"
              variant="outline"
              className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
            >
              수정
            </Button>
            <button
              onClick={() => removeCharacter(index)}
              className="text-socratic-grey transition-colors hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <CardContent className="pt-6">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              배역 ID <span className="text-red-500">*</span>
            </label>
            <Input
              value={character.roleId}
              onChange={(e) => {
                const value = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, '');
                updateCharacter(index, 'roleId', value);
              }}
              className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
              placeholder="GUARDIAN"
              disabled={!character.isEditing}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              배역명 <span className="text-red-500">*</span>
            </label>
            <Input
              value={character.roleName}
              onChange={(e) =>
                updateCharacter(index, 'roleName', e.target.value)
              }
              className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
              placeholder="수호자"
              disabled={!character.isEditing}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              캐릭터 이름 <span className="text-red-500">*</span>
            </label>
            <Input
              value={character.characterName}
              onChange={(e) =>
                updateCharacter(index, 'characterName', e.target.value)
              }
              className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
              placeholder="박준경"
              disabled={!character.isEditing}
            />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              배경 설정
            </label>
            <Textarea
              value={character.backstory}
              onChange={(e) =>
                updateCharacter(index, 'backstory', e.target.value)
              }
              className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
              placeholder="캐릭터의 배경 스토리를 입력하세요"
              maxLength={300}
              rows={3}
              disabled={!character.isEditing}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              캐릭터 이미지
            </label>
            <div className="space-y-2">
              {character.isEditing && (
                <Button
                  type="button"
                  onClick={handleGenerateCharacterImage}
                  disabled={isGenerating}
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3 w-3" />
                      AI로 이미지 생성
                    </>
                  )}
                </Button>
              )}
              {/* 새로 생성된 이미지 (저장 대기 중) */}
              {pendingImageBase64 && (
                <div className="mt-2 rounded-lg border-2 border-green-500 bg-green-50 p-3">
                  <p className="mb-2 text-xs font-medium text-green-700">
                    ✨ 새 이미지 생성됨 - 저장하시겠습니까?
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingImageBase64}
                    alt={`${character.characterName || '캐릭터'} 이미지`}
                    className="h-32 w-32 rounded-lg border object-cover shadow-sm"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      onClick={handleSaveGeneratedImage}
                      disabled={isSavingImage}
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {isSavingImage ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        '저장'
                      )}
                    </Button>
                    <Button
                      onClick={handleDiscardGeneratedImage}
                      variant="outline"
                      disabled={isSavingImage}
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}

              {/* 기존 저장된 이미지 */}
              {!pendingImageBase64 && character.imageUrl && (
                !isImageError ? (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={character.imageUrl}
                      alt={`${character.characterName || '캐릭터'} 이미지`}
                      className="h-24 w-24 rounded-lg border object-cover shadow-sm"
                      onError={() => setIsImageError(true)}
                    />
                    <p className="mt-1 text-xs text-green-600">
                      ✓ 저장된 이미지
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-red-500">
                    이미지를 불러올 수 없습니다
                  </p>
                )
              )}

              {/* 이미지 없음 */}
              {!pendingImageBase64 && !character.imageUrl && (
                <div className="mt-2 flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                  <UserCircle className="h-8 w-8 text-gray-400" />
                  <p className="mt-1 text-center text-xs text-gray-500">
                    미생성
                  </p>
                </div>
              )}
              {generateError && (
                <p className="text-sm text-red-500">{generateError}</p>
              )}
              <p className="mt-1 text-xs text-socratic-grey">
                캐릭터 정보를 기반으로 AI가 이미지를 생성합니다.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-800">
            가중치 특성 유형
          </label>
          {scenario.traitPool.buffs.length === 0 &&
          scenario.traitPool.debuffs.length === 0 ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                먼저 아래 "시나리오 시스템 규칙" 섹션에서 특성 풀을
                생성해주세요.
              </p>
            </div>
          ) : (
            <>
              {character.isEditing && (
                <Select
                  disabled={!character.isEditing}
                  onValueChange={(value) => {
                    const allTraits = [
                      ...scenario.traitPool.buffs,
                      ...scenario.traitPool.debuffs,
                    ];
                    const selectedTrait = allTraits.find(
                      (trait) => trait.weightType === value,
                    );
                    if (
                      selectedTrait &&
                      !character.weightedTraitTypes.includes(
                        selectedTrait.weightType,
                      )
                    ) {
                      updateCharacter(index, 'weightedTraitTypes', [
                        ...character.weightedTraitTypes,
                        selectedTrait.weightType,
                      ]);
                    }
                  }}
                >
                  <SelectTrigger className="mb-2 border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20">
                    <SelectValue placeholder="특성 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      긍정 특성 (BUFF)
                    </div>
                    {scenario.traitPool.buffs.map((trait, traitIndex) => (
                      <SelectItem
                        key={`buff-${traitIndex}`}
                        value={trait.weightType}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          <span>{trait.traitName}</span>
                          <span className="text-xs text-socratic-grey">
                            ({trait.weightType})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    <div className="mt-1 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                      부정 특성 (DEBUFF)
                    </div>
                    {scenario.traitPool.debuffs.map((trait, traitIndex) => (
                      <SelectItem
                        key={`debuff-${traitIndex}`}
                        value={trait.weightType}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          <span>{trait.traitName}</span>
                          <span className="text-xs text-socratic-grey">
                            ({trait.weightType})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex flex-wrap gap-2">
                {character.weightedTraitTypes.map((weightType, wtIndex) => {
                  const allTraits = [
                    ...scenario.traitPool.buffs,
                    ...scenario.traitPool.debuffs,
                  ];
                  const trait = allTraits.find(
                    (t) => t.weightType === weightType,
                  );
                  const isPositive = scenario.traitPool.buffs.some(
                    (t) => t.weightType === weightType,
                  );

                  return (
                    <Badge
                      key={wtIndex}
                      className={`${isPositive ? 'border-green-300 bg-green-100 text-green-800' : 'border-red-300 bg-red-100 text-red-800'} hover:opacity-80`}
                    >
                      <span
                        className={`mr-1 h-2 w-2 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                      ></span>
                      {trait?.traitName || weightType}
                      {character.isEditing && (
                        <button
                          onClick={() => {
                            const newTraitTypes =
                              character.weightedTraitTypes.filter(
                                (_, i) => i !== wtIndex,
                              );
                            updateCharacter(
                              index,
                              'weightedTraitTypes',
                              newTraitTypes,
                            );
                          }}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>

              <p className="mt-1 text-xs text-socratic-grey">
                특성 풀에서 이 캐릭터에게 적용될 가중치 특성을 선택하세요
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
