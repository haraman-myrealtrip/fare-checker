/* ===== 운임 자동 조회 Chrome Extension - popup.js ===== */
const MS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
let entries = [];
let sellConnectTabId = null;

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initDates();
  loadSaved();
  checkSellConnect();

  document.getElementById('btnGenerate').addEventListener('click', doGenerate);
  document.getElementById('btnBack').addEventListener('click', () => showView('viewForm'));
  document.getElementById('btnExecute').addEventListener('click', startExecution);
  document.getElementById('btnStop').addEventListener('click', stopExecution);
  document.getElementById('btnNewQuery').addEventListener('click', () => {
    entries = [];
    showView('viewForm');
  });

  // Auto-uppercase text inputs
  document.querySelectorAll('input[type="text"]').forEach(el => {
    if (el.id !== 'slackWebhook' && el.id !== 'phone') {
      el.addEventListener('input', () => { el.value = el.value.toUpperCase(); });
    }
  });
});

function initDates() {
  const d = new Date(); d.setDate(d.getDate() + 30);
  document.getElementById('depDate').value = d.toISOString().split('T')[0];
  const r = new Date(d); r.setDate(r.getDate() + 3);
  document.getElementById('retDate').value = r.toISOString().split('T')[0];
  const tm = new Date(); tm.setDate(tm.getDate() + 1);
  document.getElementById('negoDate').value = tm.toISOString().split('T')[0];
}

function loadSaved() {
  chrome.storage.local.get(['fareCheckerSettings'], (result) => {
    if (result.fareCheckerSettings) {
      const s = result.fareCheckerSettings;
      if (s.phone) document.getElementById('phone').value = s.phone;
      if (s.lname) document.getElementById('lname').value = s.lname;
      if (s.fname) document.getElementById('fname').value = s.fname;
      if (s.title) document.getElementById('title').value = s.title;
      if (s.slackWebhook) document.getElementById('slackWebhook').value = s.slackWebhook;
    }
  });
}

function saveSettings() {
  const settings = {
    phone: document.getElementById('phone').value,
    lname: document.getElementById('lname').value,
    fname: document.getElementById('fname').value,
    title: document.getElementById('title').value,
    slackWebhook: document.getElementById('slackWebhook').value
  };
  chrome.storage.local.set({ fareCheckerSettings: settings });
}

/* ---------- View management ---------- */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('visible'));
  document.getElementById(id).classList.add('visible');
}

function toggleReturn() {
  document.getElementById('retDateWrap').style.display =
    document.getElementById('tripType').value === 'OW' ? 'none' : '';
}

/* ---------- Date formatting ---------- */
function fd(s) {
  if (!s) return '';
  const d = new Date(s);
  return String(d.getDate()).padStart(2, '0') + MS[d.getMonth()];
}

function fdf(s) {
  if (!s) return '';
  const d = new Date(s);
  return String(d.getDate()).padStart(2, '0') + MS[d.getMonth()] + String(d.getFullYear()).slice(-2);
}

/* ---------- SellConnect detection ---------- */
function checkSellConnect() {
  chrome.tabs.query({ url: 'https://www.topassellconnect.com/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      sellConnectTabId = tabs[0].id;
      setStatus('connected', 'SellConnect 연결됨 (탭 감지)');
    } else {
      sellConnectTabId = null;
      setStatus('disconnected', 'SellConnect 탭 없음 — 먼저 로그인하세요');
    }
  });
}

function setStatus(state, text) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  dot.className = 'status-dot ' + state;
  txt.textContent = text;
}

/* ---------- Entry generation ---------- */
function doGenerate() {
  const v = {
    al: document.getElementById('airline').value.toUpperCase().trim(),
    trip: document.getElementById('tripType').value,
    ori: document.getElementById('origin').value.toUpperCase().trim(),
    dst: document.getElementById('dest').value.toUpperCase().trim(),
    dep: document.getElementById('depDate').value,
    ret: document.getElementById('retDate').value,
    c1: document.getElementById('cls1').value.toUpperCase().trim(),
    c2: document.getElementById('cls2').value.toUpperCase().trim(),
    ln: document.getElementById('lname').value.toUpperCase().trim(),
    fn: document.getElementById('fname').value.toUpperCase().trim(),
    ti: document.getElementById('title').value,
    ph: document.getElementById('phone').value.replace(/[^0-9]/g, ''),
    ac: document.getElementById('acctCode').value.trim().toUpperCase(),
    nd: document.getElementById('negoDate').value
  };

  if (!v.al || !v.ori || !v.dst || !v.dep || !v.c1 || !v.ln || !v.fn || !v.ph) {
    alert('필수 항목을 모두 입력해주세요.'); return;
  }
  if (v.trip === 'RT' && !v.ret) { alert('왕복 선택 시 귀국일을 입력해주세요.'); return; }
  if (!v.nd) { alert('미래 발권일을 입력해주세요.'); return; }

  saveSettings();

  const depF = fd(v.dep), retF = v.trip === 'RT' ? fd(v.ret) : '', ndF = fdf(v.nd);
  entries = [];
  let s = 1;

  // IG - Clear workspace
  entries.push({ s: s++, l: '워크스페이스 초기화', c: 'IG', g: 'pnr', color: 'b' });

  // AN - Schedule query
  let an = 'AN' + depF + v.ori + v.dst + '/A' + v.al;
  if (v.trip === 'RT') an += '*' + retF;
  entries.push({ s: s++, l: '스케줄 조회', c: an, g: 'pnr', color: 'b' });

  // SS - Seat booking
  entries.push({ s: s++, l: '가편 좌석 (' + v.c1 + ')', c: 'SS1' + v.c1 + '1', g: 'pnr', color: 'b', note: '라인 1번 기준' });
  if (v.trip === 'RT') {
    entries.push({ s: s++, l: '복편 좌석 (' + v.c1 + ')', c: 'SS1' + v.c1 + '11', g: 'pnr', color: 'b', note: '복편 라인 확인' });
  }

  // Alt class
  if (v.c2) {
    entries.push({ s: '-', l: '[대안] ' + v.c2 + ' 가편', c: 'SS1' + v.c2 + '1', g: 'pnr', color: 'g', alt: true });
    if (v.trip === 'RT') {
      entries.push({ s: '-', l: '[대안] ' + v.c2 + ' 복편', c: 'SS1' + v.c2 + '11', g: 'pnr', color: 'g', alt: true });
    }
  }

  // NM, APM, CTCM
  entries.push({ s: s++, l: '이름', c: 'NM1' + v.ln + '/' + v.fn + ',' + v.ti, g: 'pnr', color: 'b' });
  entries.push({ s: s++, l: 'APM', c: 'APM-' + v.ph, g: 'pnr', color: 'b' });
  entries.push({ s: s++, l: 'CTCM', c: 'SR CTCM-' + v.ph, g: 'pnr', color: 'b' });

  // ER - Save
  entries.push({ s: s++, l: '저장', c: 'ER', g: 'pnr', color: 'b' });

  // FXP - Published fare
  entries.push({ s: s++, l: '공시 운임', c: 'FXP', g: 'fare', color: 'p' });

  // NEGO fare
  if (v.ac) {
    entries.push({ s: s++, l: 'NEGO (A/C: ' + v.ac + ')', c: 'FXP/R,' + ndF + ',U*' + v.ac, g: 'fare', color: 'p', note: v.ac + ' / ' + ndF });
  } else {
    entries.push({ s: s++, l: 'NEGO (A/C 없음)', c: 'FXP/R,' + ndF + ',UP', g: 'fare', color: 'p', note: 'A/C 없음 / ' + ndF });
  }

  // Cancel sequence: TTE/ALL -> XI -> ER
  entries.push({ s: s++, l: 'TST 삭제', c: 'TTE/ALL', g: 'cancel', color: 'r', cancel: true });
  entries.push({ s: s++, l: '전 구간 캔슬', c: 'XI', g: 'cancel', color: 'r', cancel: true });
  entries.push({ s: s++, l: '캔슬 저장', c: 'ER', g: 'cancel', color: 'r', cancel: true });

  renderReview();
  showView('viewReview');
}

/* ---------- Review rendering ---------- */
function renderReview() {
  const list = document.getElementById('entryList');
  const gLabels = { pnr: 'PNR 생성', fare: '운임 조회', cancel: 'PNR 캔슬' };
  const gClass = { pnr: '', fare: 'fare', cancel: 'cancel' };
  let h = '', lastG = '';

  entries.forEach(e => {
    if (e.g !== lastG) {
      h += '<div class="entry-group ' + gClass[e.g] + '">' + gLabels[e.g] + '</div>';
      lastG = e.g;
    }
    const cls = (e.cancel ? ' cancel' : '') + (e.alt ? ' alt' : '');
    h += '<div class="entry-item' + cls + '">';
    h += '<span class="entry-num ' + e.color + '">' + e.s + '</span>';
    h += '<span class="entry-label">' + e.l + '</span>';
    h += '<span class="entry-cmd">' + e.c + '</span>';
    h += '</div>';
  });

  list.innerHTML = h;
}

/* ---------- Execution ---------- */
let execRunning = false;
let execIdx = 0;

async function startExecution() {
  // Re-check SellConnect
  checkSellConnect();
  await new Promise(r => setTimeout(r, 300));

  if (!sellConnectTabId) {
    alert('SellConnect 탭을 찾을 수 없습니다.\n먼저 SellConnect에 로그인해주세요.');
    return;
  }

  const realEntries = entries.filter(e => !e.alt);
  execRunning = true;
  execIdx = 0;
  showView('viewExec');
  setStatus('running', '자동 조회 실행 중...');

  const log = document.getElementById('execLog');
  log.innerHTML = '';

  for (let i = 0; i < realEntries.length; i++) {
    if (!execRunning) {
      addLog(log, 'info', '--- 사용자에 의해 중지됨 ---');
      setStatus('disconnected', '실행 중지됨');
      return;
    }

    execIdx = i;
    const entry = realEntries[i];
    renderExecCard(realEntries, i);
    addLog(log, 'cmd', '> ' + entry.c);

    try {
      // Send command to content script
      const response = await sendCommand(entry.c, entry);
      addLog(log, 'ok', response.substring(0, 200));

      // Check for errors in response
      const errorCheck = checkForErrors(entry, response);
      if (errorCheck) {
        addLog(log, 'err', '⚠ ' + errorCheck);
        await sendSlackNotification(entry, errorCheck, response);
      }

      // Store FXP results
      if (entry.g === 'fare') {
        chrome.storage.local.get(['fareResults'], (r) => {
          const results = r.fareResults || {};
          results[entry.l] = response;
          chrome.storage.local.set({ fareResults: results });
        });
      }

    } catch (err) {
      addLog(log, 'err', 'ERROR: ' + err.message);
      await sendSlackNotification(entry, err.message, '');
    }

    // Brief pause between commands
    await new Promise(r => setTimeout(r, 1500));
  }

  // Done!
  execRunning = false;
  setStatus('connected', '조회 완료');
  renderResult();
  showView('viewResult');
}

function stopExecution() {
  execRunning = false;
}

function renderExecCard(realEntries, idx) {
  const entry = realEntries[idx];
  const progress = document.getElementById('execProgress');
  let dots = '';
  realEntries.forEach((_, i) => {
    let cls = 'exec-dot';
    if (i < idx) cls += ' done';
    else if (i === idx) cls += ' current';
    dots += '<div class="' + cls + '"></div>';
  });
  progress.innerHTML = dots;

  const card = document.getElementById('execCard');
  card.className = 'exec-current-card' + (entry.cancel ? ' cancel' : '');
  card.innerHTML =
    '<div class="exec-step-label">STEP ' + entry.s + ' / ' + realEntries.length + ' — ' + entry.l + '</div>' +
    '<div class="exec-step-cmd">' + entry.c + '</div>' +
    '<div class="exec-step-status sending">전송 중...</div>';
}

function addLog(container, type, text) {
  const div = document.createElement('div');
  div.className = 'log-entry ' + type;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/* ---------- Send command to content script ---------- */
function sendCommand(cmd, entry) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(sellConnectTabId, {
      type: 'EXECUTE_COMMAND',
      command: cmd,
      entry: { l: entry.l, g: entry.g, cancel: entry.cancel }
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response && response.success) {
        resolve(response.result || '');
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

/* ---------- Error detection ---------- */
function checkForErrors(entry, response) {
  const resp = response.toUpperCase();

  // General errors
  if (resp.includes('RESTRICTED') || resp.includes('NOT ALLOWED')) {
    return '제한된 명령: ' + entry.c;
  }
  if (resp.includes('INVALID') && !resp.includes('INVALID DATE')) {
    return '잘못된 형식: ' + entry.c;
  }
  if (resp.includes('ERROR') || resp.includes('UNABLE')) {
    return '에러 발생: ' + entry.c;
  }

  // SS specific: check if class not available
  if (entry.c.startsWith('SS') && (resp.includes('UC') || resp.includes('UN') || resp.includes('NO'))) {
    return '좌석 없음/미확인: ' + entry.c;
  }

  // XI specific
  if (entry.c === 'XI' && resp.includes('RESTRICTED')) {
    return 'XI RESTRICTED - TTE/ALL 먼저 필요';
  }

  return null;
}

/* ---------- Slack notification ---------- */
async function sendSlackNotification(entry, issue, response) {
  const webhook = document.getElementById('slackWebhook').value.trim();
  if (!webhook) return;

  const entryInfo = entries.filter(e => !e.alt);
  const airline = entryInfo.find(e => e.c.startsWith('AN'))?.c || '';
  const airlineMatch = airline.match(/\/A(\w{2})/);
  const airlineName = airlineMatch ? airlineMatch[1] : '??';

  const routeMatch = airline.match(/AN\d{2}[A-Z]{3}([A-Z]{3})([A-Z]{3})/);
  const route = routeMatch ? routeMatch[1] + '-' + routeMatch[2] : '??';

  const message = {
    text: `[운임조회 알림] ${airlineName} ${route} | ${issue} | 엔트리: ${entry.c}`
  };

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (e) {
    console.log('Slack notification failed:', e);
  }
}

/* ---------- Result display ---------- */
function renderResult() {
  chrome.storage.local.get(['fareResults'], (r) => {
    const results = r.fareResults || {};
    const body = document.getElementById('resultBody');
    let html = '';

    for (const [label, text] of Object.entries(results)) {
      html += '=== ' + label + ' ===\n' + text + '\n\n';
    }

    body.textContent = html || '결과 없음';
    chrome.storage.local.remove('fareResults');
  });
}
