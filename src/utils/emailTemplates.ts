/**
 * 모든 인증 이메일에서 공통으로 사용되는 이메일 템플릿
 */

/**
 * 인증 코드 이메일 템플릿 생성
 * @param {string} name 수신자 이름
 * @param {string} code 인증 코드
 * @param {string} purpose 목적 ('findId'|'resetPassword'|'register')
 * @returns {string} HTML 이메일 템플릿
 */
export function getVerificationEmailTemplate(name: string, code: string, purpose: 'findId' | 'resetPassword' | 'register'): string {
  let title = '';
  let description = '';
  
  switch (purpose) {
    case 'findId':
      title = '아이디 찾기';
      description = '아래 인증 코드를 입력하여 아이디 찾기를 완료해주세요:';
      break;
    case 'resetPassword':
      title = '비밀번호 재설정';
      description = '아래 인증 코드를 입력하여 비밀번호 재설정을 진행해주세요:';
      break;
    case 'register':
      title = '회원가입';
      description = '아래 인증 코드를 입력하여 회원가입을 완료해주세요:';
      break;
  }
  
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #336633; border-bottom: 2px solid #eee; padding-bottom: 10px;">${title} 인증 코드</h2>
      <p>안녕하세요, <strong>${name}</strong>님!</p>
      <p>${description}</p>
      <div style="background-color: #f5f8f5; border-radius: 5px; padding: 15px; margin: 20px 0; text-align: center;">
        <h3 style="font-size: 24px; letter-spacing: 5px; margin: 0; color: #336633;">${code}</h3>
      </div>
      <p style="font-size: 13px; color: #666;">인증 코드는 10분 후에 만료됩니다.</p>
      <p style="font-size: 13px; color: #666;">만약 ${title}을(를) 요청하지 않으셨다면, 이 이메일을 무시하셔도 됩니다.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        &copy; ${new Date().getFullYear()} 강원찐농부. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * 인증 이메일 제목 생성
 * @param {string} purpose 목적 ('findId'|'resetPassword'|'register')
 * @returns {string} 이메일 제목
 */
export function getVerificationEmailSubject(purpose: 'findId' | 'resetPassword' | 'register'): string {
  return '[강원찐농부] 인증번호 안내';
} 