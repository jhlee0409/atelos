// 비교 연산자 영단어 매핑
export const COMPARISON_OPERATORS = {
  // 영어 키워드 -> 실제 연산자
  greater_than: '>',
  greater_equal: '>=',
  less_than: '<',
  less_equal: '<=',
  equal: '==',
  not_equal: '!=',
} as const;

// 역방향 매핑 (기호 -> 영단어)
export const OPERATOR_TO_ENGLISH = {
  '>': 'greater_than',
  '>=': 'greater_equal',
  '<': 'less_than',
  '<=': 'less_equal',
  '==': 'equal',
  '!=': 'not_equal',
} as const;

// 비교 연산 실행 함수
export const compareValues = (
  value1: number,
  operator: string,
  value2: number,
): boolean => {
  // 영단어인 경우 기호로 변환
  const actualOperator =
    COMPARISON_OPERATORS[operator as keyof typeof COMPARISON_OPERATORS] ||
    operator;

  switch (actualOperator) {
    case '>':
      return value1 > value2;
    case '>=':
      return value1 >= value2;
    case '<':
      return value1 < value2;
    case '<=':
      return value1 <= value2;
    case '==':
      return value1 === value2;
    case '!=':
      return value1 !== value2;
    default:
      console.warn(`Unknown comparison operator: ${operator}`);
      return false;
  }
};

// 연산자 표시명 관련 함수는 현재 사용되지 않아 제거됨
