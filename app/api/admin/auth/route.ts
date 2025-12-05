import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const AUTH_COOKIE_NAME = 'atelos_admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7일

interface FirebaseAuthResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
}

interface FirebaseAuthError {
  error: {
    code: number;
    message: string;
  };
}

// 로그인
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!FIREBASE_API_KEY) {
      console.error('FIREBASE_API_KEY 환경 변수가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      );
    }

    // Firebase Auth REST API 호출
    const authResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      const errorData = authData as FirebaseAuthError;
      const errorMessage = getErrorMessage(errorData.error?.message);
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    const successData = authData as FirebaseAuthResponse;

    // 세션 쿠키 설정
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, successData.idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        email: successData.email,
        uid: successData.localId,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: '인증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 로그아웃
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 세션 확인
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(AUTH_COOKIE_NAME);

    if (!sessionToken?.value) {
      return NextResponse.json({ authenticated: false });
    }

    // 토큰 유효성 검증 (Firebase에 확인)
    if (!FIREBASE_API_KEY) {
      return NextResponse.json({ authenticated: false });
    }

    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: sessionToken.value }),
      }
    );

    if (!verifyResponse.ok) {
      // 토큰이 만료됨
      cookieStore.delete(AUTH_COOKIE_NAME);
      return NextResponse.json({ authenticated: false });
    }

    const userData = await verifyResponse.json();
    const user = userData.users?.[0];

    return NextResponse.json({
      authenticated: true,
      user: user
        ? {
            email: user.email,
            uid: user.localId,
          }
        : null,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}

function getErrorMessage(code: string): string {
  switch (code) {
    case 'EMAIL_NOT_FOUND':
      return '등록되지 않은 이메일입니다.';
    case 'INVALID_PASSWORD':
      return '비밀번호가 올바르지 않습니다.';
    case 'USER_DISABLED':
      return '비활성화된 계정입니다.';
    case 'INVALID_LOGIN_CREDENTIALS':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
    default:
      return '인증에 실패했습니다.';
  }
}
