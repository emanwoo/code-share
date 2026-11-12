# 정보 수업 코드 공유

수업 시간에 단계별 코드를 탭으로 보여주고, 학생들이 **들여쓰기 그대로** 복사해서 자기 편집기에 붙여넣을 수 있게 하는 웹 페이지입니다.

## 기능

- 탭으로 단계 구분 (위쪽 탭, 아래 이전/다음 버튼, 키보드 ←/→)
- 📋 복사하기 버튼: 들여쓰기 유지, 줄 번호는 복사되지 않음
- 글자 크기 조절 (가−/가+ 버튼, 키보드 +/−, 14~48px)
- 밝은/어두운 화면 전환, 전체 화면, 접속 QR 코드
- 주소 끝에 `#3`을 붙이면 3번 탭이 바로 열림

## 파일

| 파일 | 용도 |
|---|---|
| `index.html` | 그대로 웹에 올려 쓰는 페이지 (GitHub Pages, Netlify 등) |
| `apps-script/Code.gs` | Google Apps Script 웹 앱 실행 코드 |
| `apps-script/index.html` | Google Apps Script용 페이지 |

## 수업 내용 바꾸기

`index.html`(또는 `apps-script/index.html`)을 열면 `<div id="lessons">` 안에 탭이 있습니다. `<section>` 하나가 탭 하나입니다.

```html
<section data-title="5. 리스트">
  <p>설명 문장</p>
  <script type="text/x-code" data-lang="python" data-name="list.py">
  코드를 그대로 붙여넣기
  </script>
</section>
```

- 코드 안의 `<`, `>`, `&`는 바꾸지 않고 그대로 씁니다.
- 블록 전체가 들여쓰기 되어 있어도 공통 들여쓰기는 자동으로 빠집니다.
- `data-lang`: python, c, java, javascript, html 등 (생략하면 python)
- 화면 위쪽 제목은 파일 아래쪽의 `COURSE_TITLE`에서 바꿉니다.

## 방법 1: GitHub Pages로 공개하기

1. 이 저장소의 **Settings → Pages**로 갑니다.
2. **Source: Deploy from a branch**, **Branch: main / (root)** 를 고르고 **Save**를 누릅니다.
3. 1~2분 뒤 `https://<아이디>.github.io/<저장소이름>/` 주소로 열립니다. 이 주소를 학생에게 줍니다.

`index.html`을 고쳐서 올리면 같은 주소에 자동으로 반영됩니다.
(무료 계정은 저장소가 **공개(Public)** 일 때만 Pages를 쓸 수 있습니다.)

## 방법 2: Google Apps Script로 공개하기

1. https://script.google.com → **새 프로젝트**
2. `Code.gs` 내용을 지우고 `apps-script/Code.gs`를 붙여넣기
3. 파일 옆 **＋ → HTML**, 이름 `index` → `apps-script/index.html` 내용 붙여넣기 → 저장
4. **배포 → 새 배포 → 웹 앱**
   - 다음 사용자 인증 정보로 실행: **나**
   - 액세스 권한: **모든 사용자**
5. 권한 승인 후 나오는 `.../exec` 주소를 학생에게 줍니다.

**내용을 고친 뒤에는** 반드시 **배포 → 배포 관리 → 연필 아이콘 → 버전: 새 버전 → 배포** 를 해야 같은 주소에 반영됩니다. ("새 배포"를 누르면 주소가 새로 생깁니다.)
