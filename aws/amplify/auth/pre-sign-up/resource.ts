import { defineFunction } from '@aws-amplify/backend';

// .ac.kr 학교 이메일만 가입을 허용하는 Pre Sign-up 트리거 함수.
export const preSignUp = defineFunction({
  name: 'pre-sign-up',
  entry: './handler.ts',
});
