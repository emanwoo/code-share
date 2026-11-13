/**
 * 정보 수업 코드 공유 웹 앱 (교사 편집 / 학생 보기 전용)
 *
 * - 학생 주소:  .../exec                → 공개된 탭만 보고 복사할 수 있음
 * - 교사 주소:  .../exec?mode=teacher   → 탭 내용 편집, 공개/비공개
 *
 * 교사 확인 방법 (둘 중 하나만 맞으면 교사로 인정)
 *  1) 이 스크립트를 만든 계정으로 로그인한 상태에서 교사 주소를 열면 자동으로 들어가집니다.
 *  2) 프로젝트 설정(⚙️) → 스크립트 속성 → 속성 이름 TEACHER_PASSWORD 에 비밀번호를 저장해 두면,
 *     다른 기기·계정에서도 그 비밀번호로 들어갈 수 있습니다.
 *
 * 수업 내용은 이 파일이 아니라 교사 화면에서 고칩니다. 이 파일은 고칠 필요가 없습니다.
 */

const APP_TITLE = '정보 수업 코드';     // 처음 만들 때의 수업 제목 (교사 화면에서 바꿀 수 있음)
const START_TABS = 20;                  // 처음 준비할 탭 수
const MAX_TABS = 40;                    // 최대 탭 수
const CHUNK = 2000;                     // 저장 단위(글자 수). 바꾸지 마세요.
const LANGS = ['python', 'c', 'cpp', 'java', 'javascript', 'html', 'css', 'sql', 'plaintext'];

// ------------------------------------------------------------------
// 페이지
// ------------------------------------------------------------------
function doGet(e) {
  const teacher = e && e.parameter && e.parameter.mode === 'teacher';
  const t = HtmlService.createTemplateFromFile(teacher ? 'teacher' : 'index');
  t.appUrl = ScriptApp.getService().getUrl();
  t.initialJson = teacher ? 'null' : safeJson_(getPublicView_());
  return t.evaluate()
    .setTitle(teacher ? '교사용 · ' + APP_TITLE : APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // 구글 사이트 도구에 삽입도 가능
}

// ------------------------------------------------------------------
// 학생용 (누구나 호출 가능 → 공개된 탭만 돌려줌)
// ------------------------------------------------------------------
/** knownVersion 이 지금과 같으면 내용 없이 { same: true } 만 돌려줍니다. */
function getPublicLessons(knownVersion) {
  const view = getPublicView_();
  if (knownVersion && knownVersion === view.version) return { version: view.version, same: true };
  return view;
}

function getPublicView_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('PUBLIC_VIEW');
  if (hit) return JSON.parse(hit);
  const doc = readDoc_();
  const view = {
    title: doc.title,
    version: doc.version,
    tabs: doc.tabs.filter(t => t.published).map(t => ({ id: t.id, title: t.title, desc: t.desc, codes: t.codes }))
  };
  const json = JSON.stringify(view);
  if (json.length < 90000) cache.put('PUBLIC_VIEW', json, 21600);
  return view;
}

// ------------------------------------------------------------------
// 교사용 (모든 함수가 교사 확인을 먼저 합니다)
// ------------------------------------------------------------------
/** 비밀번호 없이 들어갈 수 있는지(만든 계정인지) 확인 */
function teacherAutoLogin() {
  return { ok: isOwner_(), hasPassword: !!getPassword_() };
}

function teacherLoad(password) {
  checkTeacher_(password);
  return { doc: readDoc_(), studentUrl: ScriptApp.getService().getUrl() };
}

function teacherSave(password, doc, baseVersion) {
  checkTeacher_(password);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const current = readDoc_();
    if (baseVersion && current.version !== baseVersion) {
      throw new Error('CONFLICT: 다른 창에서 먼저 저장된 내용이 있습니다. 새로고침한 뒤 다시 고쳐 주세요.');
    }
    const clean = sanitize_(doc);
    clean.version = String(Date.now());
    writeDoc_(clean);
    CacheService.getScriptCache().remove('PUBLIC_VIEW');
    return { version: clean.version };
  } finally {
    lock.releaseLock();
  }
}

function getPassword_() {
  return PropertiesService.getScriptProperties().getProperty('TEACHER_PASSWORD') || '';
}

function isOwner_() {
  try {
    const active = Session.getActiveUser().getEmail();
    const owner = Session.getEffectiveUser().getEmail();
    return !!active && active === owner;
  } catch (e) {
    return false;
  }
}

function checkTeacher_(password) {
  if (isOwner_()) return;
  const saved = getPassword_();
  if (saved && typeof password === 'string' && password === saved) return;
  Utilities.sleep(1500); // 비밀번호 마구 넣어보기 늦추기
  throw new Error('AUTH: 교사 확인에 실패했습니다.');
}

// ------------------------------------------------------------------
// 저장소 (스크립트 속성에 나누어 저장)
// ------------------------------------------------------------------
function readDoc_() {
  const all = PropertiesService.getScriptProperties().getProperties();
  const n = Number(all.DATA_CHUNKS || 0);
  if (!n) return seedDoc_();
  let s = '';
  for (let i = 0; i < n; i++) s += all['DATA_' + i] || '';
  try {
    const doc = JSON.parse(s);
    if (doc && Array.isArray(doc.tabs)) return doc;
  } catch (e) {}
  return seedDoc_();
}

function writeDoc_(doc) {
  const s = JSON.stringify(doc);
  if (Utilities.newBlob(s).getBytes().length > 450000) {
    throw new Error('SIZE: 저장할 내용이 너무 큽니다. 쓰지 않는 탭이나 긴 코드를 줄여 주세요.');
  }
  const props = PropertiesService.getScriptProperties();
  const old = Number(props.getProperty('DATA_CHUNKS') || 0);
  const parts = {};
  let i = 0, pos = 0;
  while (pos < s.length) {
    let end = Math.min(pos + CHUNK, s.length);
    const c = s.charCodeAt(end - 1);
    if (end < s.length && c >= 0xD800 && c <= 0xDBFF) end--; // 이모지가 반으로 잘리지 않게
    parts['DATA_' + i] = s.slice(pos, end);
    pos = end;
    i++;
  }
  parts.DATA_CHUNKS = String(i);
  props.setProperties(parts, false);
  for (let k = i; k < old; k++) props.deleteProperty('DATA_' + k);
}

function sanitize_(doc) {
  const str = (v, max) => String(v == null ? '' : v).slice(0, max);
  const tabs = (doc && Array.isArray(doc.tabs) ? doc.tabs : []).slice(0, MAX_TABS).map((t, i) => ({
    id: str(t && t.id, 40) || ('t' + Date.now() + '_' + i),
    title: str(t && t.title, 80).trim() || (i + 1) + '단계',
    published: !!(t && t.published === true),
    desc: str(t && t.desc, 5000),
    codes: (t && Array.isArray(t.codes) ? t.codes : []).slice(0, 10).map(c => ({
      name: str(c && c.name, 60),
      lang: LANGS.indexOf(c && c.lang) >= 0 ? c.lang : 'python',
      code: str(c && c.code, 50000)
    }))
  }));
  return { title: str(doc && doc.title, 60).trim() || APP_TITLE, tabs: tabs };
}

// ------------------------------------------------------------------
// 처음 내용 (탭 20개: 1~4는 예시 코드, 1번만 공개)
// ------------------------------------------------------------------
function seedDoc_() {
  const L = lines => lines.join('\n');
  const samples = [
    {
      title: '1. 출력과 변수',
      desc: '코드를 복사하기 버튼으로 복사한 뒤, 내 편집기에 붙여넣고 실행해 보세요.',
      codes: [{ name: 'hello.py', lang: 'python', code: L([
        'name = "홍길동"',
        'age = 17',
        'print("안녕하세요!", name, "입니다.")',
        'print(f"나이는 {age}살 입니다.")'
      ]) }]
    },
    {
      title: '2. 입력과 조건문',
      desc: '점수를 입력받아 학점을 출력합니다. 들여쓰기(4칸)를 잘 살펴보세요.',
      codes: [{ name: 'grade.py', lang: 'python', code: L([
        'score = int(input("점수를 입력하세요: "))',
        '',
        'if score >= 90:',
        '    grade = "A"',
        'elif score >= 80:',
        '    grade = "B"',
        'elif score >= 70:',
        '    grade = "C"',
        'else:',
        '    grade = "F"',
        '',
        'print("학점:", grade)'
      ]) }]
    },
    {
      title: '3. 반복문',
      desc: '구구단 한 단을 출력한 뒤, 중첩 반복문으로 2단부터 9단까지 출력합니다.',
      codes: [
        { name: 'loop1.py', lang: 'python', code: L([
          'dan = 3',
          'for i in range(1, 10):',
          '    print(f"{dan} x {i} = {dan * i}")'
        ]) },
        { name: 'loop2.py', lang: 'python', code: L([
          'for dan in range(2, 10):',
          '    print(f"--- {dan}단 ---")',
          '    for i in range(1, 10):',
          '        if i % 2 == 0:',
          '            continue  # 짝수 줄은 건너뛰기',
          '        print(f"{dan} x {i} = {dan * i}")'
        ]) }
      ]
    },
    {
      title: '4. 함수',
      desc: '리스트의 평균을 구하는 함수를 만들어 봅시다.',
      codes: [{ name: 'func.py', lang: 'python', code: L([
        'def average(numbers):',
        '    """리스트의 평균을 돌려줍니다."""',
        '    if len(numbers) == 0:',
        '        return 0',
        '    total = 0',
        '    for n in numbers:',
        '        total += n',
        '    return total / len(numbers)',
        '',
        '',
        'scores = [85, 92, 78, 64, 99]',
        'print("평균:", average(scores))',
        'print("최고점:", max(scores), "/ 최저점:", min(scores))'
      ]) }]
    }
  ];
  const tabs = [];
  for (let i = 0; i < START_TABS; i++) {
    const s = samples[i] || { title: (i + 1) + '단계', desc: '', codes: [] };
    tabs.push({ id: 't' + (i + 1), title: s.title, published: i === 0, desc: s.desc, codes: s.codes });
  }
  return { title: APP_TITLE, version: '0', tabs: tabs };
}

function safeJson_(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}
