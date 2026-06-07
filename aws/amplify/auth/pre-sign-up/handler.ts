/**
 * Cognito Pre Sign-up Lambda 트리거.
 *
 * .ac.kr 학교 이메일 계정만 가입을 허용한다.
 * - 이메일/비밀번호 가입(PreSignUp_SignUp)
 * - 소셜(Google) 가입(PreSignUp_ExternalProvider)
 * 두 경로 모두 동일하게 검증한다(triggerSource 구분 없음).
 *
 * email 은 항상 소문자로 정규화한 뒤 검사한다(HUFS.AC.KR 같은 대문자 도메인 오탐 방지).
 * email 이 비어 있으면(특히 외부 IdP 가 email 클레임을 주지 않은 경우) 비정상으로 간주해 거부한다.
 *
 * @types/aws-lambda 의존 없이 컴파일되도록, 사용하는 필드만 로컬로 선언한다.
 */
interface PreSignUpEvent {
  triggerSource: string;
  request: {
    userAttributes: Record<string, string | undefined>;
  };
  response: {
    autoConfirmUser?: boolean;
    autoVerifyEmail?: boolean;
    autoVerifyPhone?: boolean;
  };
  [key: string]: unknown;
}

const ALLOWED_SUFFIX = '.ac.kr';
const REJECT_MESSAGE = '학교 이메일(.ac.kr) 계정만 가입할 수 있습니다.';

/**
 * 이메일 도메인이 .ac.kr 로 끝나는 학교 계정인지 검사.
 * 값이 없거나(undefined/빈 문자열) 형식이 어긋나면 false(=거부).
 */
function isSchoolEmail(rawEmail: string | undefined): boolean {
  if (!rawEmail) return false;

  const email = rawEmail.trim().toLowerCase();
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;

  const domain = email.slice(atIndex + 1);
  // 예: hufs.ac.kr, student.hufs.ac.kr → 허용 / ac.kr, gmail.com → 거부
  return domain.endsWith(ALLOWED_SUFFIX);
}

export const handler = async (event: PreSignUpEvent): Promise<PreSignUpEvent> => {
  const email = event.request.userAttributes.email;

  if (!isSchoolEmail(email)) {
    // 던진 메시지는 Cognito 를 통해 클라이언트(Amplify Authenticator)로 전달된다.
    throw new Error(REJECT_MESSAGE);
  }

  return event;
};
