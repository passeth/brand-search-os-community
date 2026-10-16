/** Fixed deployment origin; never derive OAuth destinations from request Host headers. */
export function appOrigin(value = process.env.APP_URL): string {
  if (!value) throw new Error('APP_URL을 분석 도구의 주소로 설정하세요.');
  const url = new URL(value);
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('APP_URL은 경로 없는 HTTPS 주소여야 합니다. 로컬 개발은 http://localhost를 허용합니다.');
  }
  return url.origin;
}
export function callbackURL() { return `${appOrigin()}/api/google/callback`; }
