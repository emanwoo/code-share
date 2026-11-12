/**
 * 정보 수업 코드 공유 웹 앱
 * - 수업 내용(탭, 설명, 코드)은 index.html 파일에서 수정합니다.
 * - 이 파일은 바꿀 필요가 없습니다. (브라우저 탭 제목만 아래에서 바꿀 수 있어요)
 */
const PAGE_TITLE = '정보 수업 코드';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(PAGE_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // 구글 사이트 도구에 삽입도 가능
}

/** QR 코드에 넣을 웹 앱 주소 */
function getUrl() {
  return ScriptApp.getService().getUrl();
}
