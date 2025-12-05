import { NextRequest, NextResponse } from 'next/server';
import { uploadBase64Image, type ImageType } from '@/lib/blob-storage';

interface UploadImageRequestBody {
  imageBase64: string;
  scenarioId: string;
  type: ImageType;
  fileName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadImageRequestBody = await request.json();
    const { imageBase64, scenarioId, type, fileName } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: '이미지 데이터가 필요합니다.' },
        { status: 400 },
      );
    }

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId가 필요합니다.' },
        { status: 400 },
      );
    }

    if (!type || (type !== 'poster' && type !== 'character')) {
      return NextResponse.json(
        { error: '유효한 이미지 타입(poster 또는 character)을 지정해주세요.' },
        { status: 400 },
      );
    }

    console.log(`📤 [Upload API] ${type} 이미지 업로드 시작: ${scenarioId}`);

    const uploadResult = await uploadBase64Image(
      imageBase64,
      scenarioId,
      type,
      fileName
    );

    if (uploadResult.success && uploadResult.url) {
      console.log('✅ [Upload API] Vercel Blob Storage 업로드 성공:', uploadResult.url);
      return NextResponse.json({
        success: true,
        imageUrl: uploadResult.url,
        storagePath: uploadResult.path,
      });
    }

    console.error('❌ [Upload API] Storage 업로드 실패:', uploadResult.error);
    return NextResponse.json(
      {
        error: uploadResult.error || 'Vercel Blob Storage 업로드에 실패했습니다.',
      },
      { status: 500 },
    );
  } catch (error) {
    console.error('❌ [Upload API] 업로드 실패:', error);
    return NextResponse.json(
      { error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
