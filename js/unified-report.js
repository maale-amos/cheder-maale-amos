// unified-report.js — One modal for every report type (התנהגות / קריאה /
// כתיבה / שיעור פרטני / שיחה / אסיפה). Built fresh, doesn't depend on any
// of the broken individual saveXxx flows. 2026-06-01.
(function () {
  'use strict';

  const TYPES = [
    { key: 'behavior',     label: 'התנהגות',        icon: 'bi-clipboard-check', api: 'addBehavior',     cats: 'dynamic' },
    { key: 'reading',      label: 'קריאה',          icon: 'bi-book',            api: 'addBehavior',     cats: ['קריאה'] },
    { key: 'writing',      label: 'כתיבה',          icon: 'bi-pencil',          api: 'addBehavior',     cats: ['כתיבה'] },
    { key: 'lesson',       label: 'שיעור פרטני',    icon: 'bi-mortarboard',     api: 'addBehavior',     cats: ['שיעור פרטני'] },
    { key: 'conversation', label: 'שיחה עם תלמיד',  icon: 'bi-chat-dots',       api: 'addConversation', cats: ['שיחה'] },
    { key: 'meeting',      label: 'אסיפת הורים',    icon: 'bi-people',          api: 'addMeeting',      cats: ['אסיפה'] },
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&"'<>]/g, c => ({'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'}[c]));
  }

  function getStudents() {
    if (Array.isArray(window._allStudents) && window._allStudents.length) return window._allStudents;
    try {
      const d = JSON.parse(localStorage.getItem('cheder_bht_data') || '{}');
      if (Array.isArray(d.students)) return d.students;
    } catch {}
    return [];
  }

  function getBehaviorCategories() {
    if (Array.isArray(window._categories) && window._categories.length) return window._categories;
    try {
      const d = JSON.parse(localStorage.getItem('cheder_bht_data') || '{}');
      if (Array.isArray(d.categories)) return d.categories;
    } catch {}
    return [];
  }

  function getRabbis() {
    try {
      const d = JSON.parse(localStorage.getItem('cheder_bht_data') || '{}');
      if (Array.isArray(d.staff)) return d.staff.map(s => s['שם']||s.name).filter(Boolean);
    } catch {}
    return ['הרב ירושלמי', 'הרב יודלוב', 'הרב קליין', 'הרב שניידר'];
  }

  // Open the panel pre-selected on a specific type
  function showModalWithType(typeKey) {
    showModal();
    setTimeout(() => {
      const btn = document.querySelector('.ur-type-btn[data-type="' + typeKey + '"]');
      if (btn) btn.click();
    }, 80);
  }

  function showModal() {
    // Remove any existing copies
    document.getElementById('unified-report-modal')?.remove();
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());

    const students = getStudents().filter(s => (s['סטטוס']||'פעיל') !== 'סיים');
    const rabbis = getRabbis();

    const html = `
<div class="modal fade" id="unified-report-modal" tabindex="-1" style="z-index:100000">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content" dir="rtl">
      <div class="modal-header" style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff">
        <h5 class="modal-title">📝 דיווח חדש</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label fw-bold">מה לדווח?</label>
          <div id="ur-type-buttons" class="d-flex flex-wrap gap-2">
            ${TYPES.map((t, i) => `
              <button type="button" class="btn ${i===0?'btn-primary':'btn-outline-primary'} btn-lg ur-type-btn" data-type="${t.key}">
                <i class="bi ${t.icon}"></i> ${t.label}
              </button>`).join('')}
          </div>
        </div>

        <hr>

        <div class="mb-3">
          <label class="form-label fw-bold">תלמיד</label>
          <input id="ur-student" class="form-control form-control-lg" list="ur-student-list" placeholder="הקלד שם...">
          <datalist id="ur-student-list">
            ${students.map(s => `<option value="${esc(((s['שם פרטי']||'')+' '+(s['שם משפחה']||'')).trim())}"></option>`).join('')}
          </datalist>
          <small class="text-muted">${students.length} תלמידים זמינים</small>
        </div>

        <div class="mb-3" id="ur-cat-row">
          <label class="form-label fw-bold">קטגוריה</label>
          <select id="ur-cat" class="form-select form-select-lg">
            <option value="">בחר...</option>
          </select>
        </div>

        <div class="mb-3" id="ur-rabbi-row" style="display:none">
          <label class="form-label fw-bold">רב</label>
          <select id="ur-rabbi" class="form-select">
            <option value="">בחר רב...</option>
            ${rabbis.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label fw-bold">תיאור</label>
          <textarea id="ur-desc" class="form-control" rows="4" placeholder="מה קרה? פירוט..."></textarea>
        </div>

        <div class="mb-3" id="ur-sev-row">
          <label class="form-label fw-bold">חומרה</label>
          <select id="ur-sev" class="form-select">
            <option value="נמוכה">נמוכה</option>
            <option value="בינונית" selected>בינונית</option>
            <option value="גבוהה">גבוהה</option>
          </select>
        </div>

        <div id="ur-status" class="alert d-none"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>
        <button type="button" id="ur-save" class="btn btn-success btn-lg" style="min-width:160px">
          💾 שמור דיווח
        </button>
      </div>
    </div>
  </div>
</div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    const modalEl = document.getElementById('unified-report-modal');

    let currentType = TYPES[0];

    function setType(key) {
      currentType = TYPES.find(t => t.key === key) || TYPES[0];
      // Highlight active button
      modalEl.querySelectorAll('.ur-type-btn').forEach(b => {
        const active = b.dataset.type === currentType.key;
        b.classList.toggle('btn-primary', active);
        b.classList.toggle('btn-outline-primary', !active);
      });
      // Update category dropdown
      const catSel = document.getElementById('ur-cat');
      const catRow = document.getElementById('ur-cat-row');
      if (currentType.cats === 'dynamic') {
        const opts = getBehaviorCategories().map(c => c['קטגוריה'] || c.name).filter(Boolean);
        catSel.innerHTML = '<option value="">בחר קטגוריה...</option>' + opts.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
        catRow.style.display = '';
      } else if (Array.isArray(currentType.cats) && currentType.cats.length === 1) {
        catSel.innerHTML = `<option value="${esc(currentType.cats[0])}" selected>${esc(currentType.cats[0])}</option>`;
        catRow.style.display = 'none';
        catSel.value = currentType.cats[0];
      }
      // Severity is only for behavior
      document.getElementById('ur-sev-row').style.display = currentType.key === 'behavior' ? '' : 'none';
      // Rabbi is for reading/writing/lesson
      document.getElementById('ur-rabbi-row').style.display = ['reading','writing','lesson'].includes(currentType.key) ? '' : 'none';
    }

    // Wire type buttons
    modalEl.querySelectorAll('.ur-type-btn').forEach(btn => {
      btn.onclick = () => setType(btn.dataset.type);
    });
    setType(TYPES[0].key);

    // Wire save — INLINE handler, re-entry guarded
    let inFlight = false;
    const saveBtn = document.getElementById('ur-save');
    const handler = async function (ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      if (inFlight) return;
      inFlight = true;
      await doSave(currentType);
      setTimeout(() => { inFlight = false; }, 2500);
    };
    saveBtn.onclick = handler;
    saveBtn.addEventListener('click', handler);

    // Robust close: button × / ביטול / ESC / click outside dialog
    function hardClose() {
      try {
        const inst = window.bootstrap && bootstrap.Modal ? bootstrap.Modal.getInstance(modalEl) : null;
        if (inst) inst.hide();
      } catch {}
      setTimeout(() => { try { modalEl.remove(); } catch {} }, 200);
      document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    modalEl.querySelectorAll('[data-bs-dismiss="modal"]').forEach(b => {
      b.addEventListener('click', hardClose);
      b.onclick = hardClose;
    });
    // Click on backdrop (outside modal-dialog) closes it
    modalEl.addEventListener('click', (ev) => {
      if (ev.target === modalEl) hardClose();
    });
    // ESC anywhere
    const escHandler = (ev) => { if (ev.key === 'Escape') hardClose(); };
    document.addEventListener('keydown', escHandler);
    modalEl.addEventListener('hidden.bs.modal', () => {
      document.removeEventListener('keydown', escHandler);
    });

    // Show
    try {
      const bs = (window.bootstrap && bootstrap.Modal) ? new bootstrap.Modal(modalEl, { keyboard: true, backdrop: true }) : null;
      if (bs) bs.show(); else { modalEl.classList.add('show'); modalEl.style.display = 'block'; }
    } catch (e) { modalEl.style.display = 'block'; modalEl.classList.add('show'); }

    setTimeout(() => { document.getElementById('ur-student')?.focus(); }, 200);
  }

  async function doSave(type) {
    const stEl = document.getElementById('ur-status');
    const showStatus = (msg, cls) => { stEl.className = 'alert alert-' + cls; stEl.textContent = msg; stEl.classList.remove('d-none'); };
    const saveBtn = document.getElementById('ur-save');

    const typed = (document.getElementById('ur-student').value || '').trim();
    const cat = document.getElementById('ur-cat').value;
    const desc = (document.getElementById('ur-desc').value || '').trim();
    const sev = document.getElementById('ur-sev')?.value || 'בינונית';
    const rabbi = document.getElementById('ur-rabbi')?.value || '';

    const students = getStudents();
    let stu = students.find(s => `${s['שם פרטי']||''} ${s['שם משפחה']||''}`.trim() === typed);
    if (!stu && typed) {
      const q = typed.toLowerCase();
      const m = students.filter(s => `${s['שם פרטי']||''} ${s['שם משפחה']||''}`.toLowerCase().includes(q));
      if (m.length === 1) stu = m[0];
    }

    if (!stu) { showStatus('יש להקליד שם תלמיד מהרשימה', 'warning'); return; }
    if (!cat) { showStatus('יש לבחור קטגוריה', 'warning'); return; }
    if (!desc) { showStatus('יש להוסיף תיאור', 'warning'); return; }
    if (['reading','writing','lesson'].includes(type.key) && !rabbi) {
      showStatus('יש לבחור רב', 'warning'); return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ שומר...';
    showStatus('שומר...', 'info');

    const now = new Date();
    const reporter = (function(){ try { return JSON.parse(sessionStorage.getItem('user')||'{}').username||'admin'; } catch { return 'admin'; }})();
    const obj = {
      'מזהה': Math.floor(now.getTime() / 1000) * 1000 + Math.floor(Math.random() * 1000),
      'תלמיד_מזהה': String(stu['מזהה']||''),
      'שם תלמיד': `${stu['שם פרטי']||''} ${stu['שם משפחה']||''}`.trim(),
      'קטגוריה': cat,
      'תיאור': desc,
      'חומרה': type.key === 'behavior' ? sev : 'נמוכה',
      'תאריך': now.toISOString(),
      'דווח_עי': reporter,
    };
    if (rabbi) obj['רב'] = rabbi;
    try {
      if (typeof getHebrewInfo === 'function') {
        const info = getHebrewInfo(now);
        obj['תאריך_עברי'] = info.hdate || '';
        obj['פרשה'] = info.parsha || '';
      }
    } catch {}

    let saved = false;
    try {
      if (typeof window.api === 'function') {
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('api timeout 8s')), 8000));
        const r = await Promise.race([window.api(type.api, [obj]), timeout]);
        if (r && r.ok !== false) saved = true;
      }
    } catch (e) {
      console.warn('[unified] api err:', e && e.message);
    }

    // Always also write to localStorage (idempotent by מזהה)
    try {
      const data = JSON.parse(localStorage.getItem('cheder_bht_data') || '{}');
      const targetKey = type.api === 'addBehavior' ? 'behavior'
                     : type.api === 'addConversation' ? 'conversations'
                     : type.api === 'addMeeting' ? 'meetings' : 'behavior';
      if (!Array.isArray(data[targetKey])) data[targetKey] = [];
      const exists = data[targetKey].some(e => String(e['מזהה']||'') === String(obj['מזהה']));
      if (!exists) data[targetKey].push(obj);
      localStorage.setItem('cheder_bht_data', JSON.stringify(data));
      saved = true;
    } catch (e) {
      showStatus('שגיאה: ' + e.message, 'danger');
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 שמור דיווח';
      return;
    }

    // Update in-memory + redraw
    try {
      if (type.api === 'addBehavior') {
        if (!Array.isArray(window._events)) window._events = [];
        window._events.unshift(obj);
        window._events.sort((a,b) => new Date(b['תאריך']) - new Date(a['תאריך']));
        if (typeof window.drawEvents === 'function' && document.getElementById('b-list')) {
          window.drawEvents(window._events.filter(e => e['סטטוס_אישור'] !== 'ממתין לאישור'));
        }
      }
    } catch {}

    showStatus('✓ ' + type.label + ' נשמר בהצלחה!', 'success');
    if (typeof window.toast === 'function') {
      try { window.toast('✓ ' + type.label + ': ' + obj['שם תלמיד'], 'success'); } catch {}
    }

    setTimeout(() => {
      const m = document.getElementById('unified-report-modal');
      if (!m) return;
      try {
        const inst = window.bootstrap && bootstrap.Modal ? bootstrap.Modal.getInstance(m) : null;
        if (inst) inst.hide();
      } catch {}
      setTimeout(() => { try { m.remove(); } catch {} }, 400);
      document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }, 800);
  }

  // Hide every other floating button on the page so the only thing left is
  // ours. Pack-12/13/18/32/37/40/47/103/118 each add a circular button at
  // various bottom-left offsets — the cluster was Yosef's main complaint.
  function hideOtherFloaters() {
    if (document.getElementById('ur-hide-style')) return;
    const s = document.createElement('style');
    s.id = 'ur-hide-style';
    s.textContent = `
      /* Hide every fixed-position floating button/div in the corners except ours */
      body > button[style*="position:fixed"][style*="bottom"]:not(#ur-fab),
      body > div[style*="position:fixed"][style*="bottom"]:not(#ur-fab):not(#bht-save-dbg):not(.modal):not(.modal-backdrop):not(.toast),
      body > button[style*="position: fixed"][style*="bottom"]:not(#ur-fab),
      body > div[style*="position: fixed"][style*="bottom"]:not(#ur-fab),
      #queue-badge-118,
      #stale-data-banner,
      #quick-add-fab-130,
      #tour-overlay,
      [id*="packs deployed"],
      [class*="walkthrough"],
      [class*="tour-popup"] { display: none !important; }
      .legacy-fab { display: none !important; }

      /* Hide the legacy green "אירוע חדש" / "+ אירוע" / "+ דיווח חדש" buttons
         that each category page builds. The unified report panel + per-page
         "📝 הוסף ..." button cover this now, so the duplicate green button just
         creates a broken save path. */
      button.btn-success[onclick*="addEventModal"],
      button.btn-success[onclick*="addReadingModal"],
      button.btn-success[onclick*="addWritingModal"],
      button.btn-success[onclick*="addLessonsKleinModal"],
      button.btn-success[onclick*="convAddModal"],
      button.btn-success[onclick*="meetAddModal"],
      #b-actions button.btn-success { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  // INLINE PANEL on home page — Yosef wants the form embedded directly
  // in the page (no floating side button), centered above the students
  // section so it's the first thing you see and you can start typing.
  function buildInlineFormHTML() {
    const students = getStudents().filter(s => (s['סטטוס']||'פעיל') !== 'סיים');
    const rabbis = getRabbis();
    return `
      <div class="card shadow-lg" style="border:0;border-radius:18px;overflow:hidden;direction:rtl">
        <div class="card-header text-white" style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:18px 26px">
          <h4 class="mb-0 fw-bold">📝 דיווח חדש</h4>
          <div class="small" style="opacity:.9">מקום אחד לכל הסוגים — מלא ושמור</div>
        </div>
        <div class="card-body" style="padding:22px">
          <div class="mb-3">
            <label class="form-label fw-bold">מה לדווח?</label>
            <div id="urp-type-buttons" class="d-flex flex-wrap gap-2">
              ${TYPES.map((t, i) => `
                <button type="button" class="btn ${i===0?'btn-primary':'btn-outline-primary'} urp-type-btn" data-type="${t.key}">
                  <i class="bi ${t.icon}"></i> ${t.label}
                </button>`).join('')}
            </div>
          </div>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">תלמיד</label>
              <input id="urp-student" class="form-control form-control-lg" list="urp-student-list" placeholder="הקלד שם...">
              <datalist id="urp-student-list">
                ${students.map(s => `<option value="${esc(((s['שם פרטי']||'')+' '+(s['שם משפחה']||'')).trim())}"></option>`).join('')}
              </datalist>
              <small class="text-muted">${students.length} תלמידים</small>
            </div>
            <div class="col-md-6" id="urp-cat-row">
              <label class="form-label fw-bold">קטגוריה</label>
              <select id="urp-cat" class="form-select form-select-lg">
                <option value="">בחר...</option>
              </select>
            </div>
            <div class="col-md-6" id="urp-rabbi-row" style="display:none">
              <label class="form-label fw-bold">רב</label>
              <select id="urp-rabbi" class="form-select">
                <option value="">בחר רב...</option>
                ${rabbis.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-6" id="urp-sev-row">
              <label class="form-label fw-bold">חומרה</label>
              <select id="urp-sev" class="form-select">
                <option value="נמוכה">נמוכה</option>
                <option value="בינונית" selected>בינונית</option>
                <option value="גבוהה">גבוהה</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label fw-bold">תיאור</label>
              <textarea id="urp-desc" class="form-control" rows="3" placeholder="מה קרה? פירוט..."></textarea>
            </div>
            <div class="col-12">
              <div id="urp-status" class="alert d-none mb-2"></div>
              <button type="button" id="urp-save" class="btn btn-success btn-lg w-100" style="background:linear-gradient(135deg,#16a34a,#22c55e);border:0;padding:14px;border-radius:12px;font-weight:700;font-size:18px">
                💾 שמור דיווח
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function wireInlinePanel(panel) {
    let currentType = TYPES[0];
    function setType(key) {
      currentType = TYPES.find(t => t.key === key) || TYPES[0];
      panel.querySelectorAll('.urp-type-btn').forEach(b => {
        const active = b.dataset.type === currentType.key;
        b.classList.toggle('btn-primary', active);
        b.classList.toggle('btn-outline-primary', !active);
      });
      const catSel = panel.querySelector('#urp-cat');
      const catRow = panel.querySelector('#urp-cat-row');
      if (currentType.cats === 'dynamic') {
        const opts = getBehaviorCategories().map(c => c['קטגוריה'] || c.name).filter(Boolean);
        catSel.innerHTML = '<option value="">בחר קטגוריה...</option>' + opts.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
        catRow.style.display = '';
      } else if (Array.isArray(currentType.cats) && currentType.cats.length === 1) {
        catSel.innerHTML = `<option value="${esc(currentType.cats[0])}" selected>${esc(currentType.cats[0])}</option>`;
        catRow.style.display = 'none';
        catSel.value = currentType.cats[0];
      }
      panel.querySelector('#urp-sev-row').style.display = currentType.key === 'behavior' ? '' : 'none';
      panel.querySelector('#urp-rabbi-row').style.display = ['reading','writing','lesson'].includes(currentType.key) ? '' : 'none';
    }
    panel.querySelectorAll('.urp-type-btn').forEach(btn => {
      btn.onclick = () => setType(btn.dataset.type);
    });
    setType(TYPES[0].key);

    let inFlight = false;
    const saveBtn = panel.querySelector('#urp-save');
    const handler = async function (ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      if (inFlight) return;
      inFlight = true;
      await doSaveInline(currentType, panel);
      setTimeout(() => { inFlight = false; }, 2500);
    };
    saveBtn.onclick = handler;
    saveBtn.addEventListener('click', handler);
  }

  async function doSaveInline(type, panel) {
    const stEl = panel.querySelector('#urp-status');
    const showStatus = (msg, cls) => { stEl.className = 'alert alert-' + cls + ' mb-2'; stEl.textContent = msg; stEl.classList.remove('d-none'); };
    const saveBtn = panel.querySelector('#urp-save');

    const typed = (panel.querySelector('#urp-student').value || '').trim();
    const cat = panel.querySelector('#urp-cat').value;
    const desc = (panel.querySelector('#urp-desc').value || '').trim();
    const sev = panel.querySelector('#urp-sev')?.value || 'בינונית';
    const rabbi = panel.querySelector('#urp-rabbi')?.value || '';

    const students = getStudents();
    let stu = students.find(s => `${s['שם פרטי']||''} ${s['שם משפחה']||''}`.trim() === typed);
    if (!stu && typed) {
      const q = typed.toLowerCase();
      const m = students.filter(s => `${s['שם פרטי']||''} ${s['שם משפחה']||''}`.toLowerCase().includes(q));
      if (m.length === 1) stu = m[0];
    }
    if (!stu) { showStatus('יש להקליד שם תלמיד מהרשימה', 'warning'); return; }
    if (!cat) { showStatus('יש לבחור קטגוריה', 'warning'); return; }
    if (!desc) { showStatus('יש להוסיף תיאור', 'warning'); return; }
    if (['reading','writing','lesson'].includes(type.key) && !rabbi) {
      showStatus('יש לבחור רב', 'warning'); return;
    }

    saveBtn.disabled = true;
    const origLabel = saveBtn.innerHTML;
    saveBtn.innerHTML = '⏳ שומר...';
    showStatus('שומר...', 'info');

    const now = new Date();
    const reporter = (function(){ try { return JSON.parse(sessionStorage.getItem('user')||'{}').username||'admin'; } catch { return 'admin'; }})();
    const obj = {
      'מזהה': Math.floor(now.getTime() / 1000) * 1000 + Math.floor(Math.random() * 1000),
      'תלמיד_מזהה': String(stu['מזהה']||''),
      'שם תלמיד': `${stu['שם פרטי']||''} ${stu['שם משפחה']||''}`.trim(),
      'קטגוריה': cat,
      'תיאור': desc,
      'חומרה': type.key === 'behavior' ? sev : 'נמוכה',
      'תאריך': now.toISOString(),
      'דווח_עי': reporter,
    };
    if (rabbi) obj['רב'] = rabbi;
    try {
      if (typeof getHebrewInfo === 'function') {
        const info = getHebrewInfo(now);
        obj['תאריך_עברי'] = info.hdate || '';
        obj['פרשה'] = info.parsha || '';
      }
    } catch {}

    let saved = false;
    try {
      if (typeof window.api === 'function') {
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('api timeout 8s')), 8000));
        const r = await Promise.race([window.api(type.api, [obj]), timeout]);
        if (r && r.ok !== false) saved = true;
      }
    } catch (e) { console.warn('[urp] api err:', e && e.message); }

    try {
      const data = JSON.parse(localStorage.getItem('cheder_bht_data') || '{}');
      const targetKey = type.api === 'addBehavior' ? 'behavior'
                     : type.api === 'addConversation' ? 'conversations'
                     : type.api === 'addMeeting' ? 'meetings' : 'behavior';
      if (!Array.isArray(data[targetKey])) data[targetKey] = [];
      const exists = data[targetKey].some(e => String(e['מזהה']||'') === String(obj['מזהה']));
      if (!exists) data[targetKey].push(obj);
      localStorage.setItem('cheder_bht_data', JSON.stringify(data));
      saved = true;
    } catch (e) {
      showStatus('שגיאה: ' + e.message, 'danger');
      saveBtn.disabled = false;
      saveBtn.innerHTML = origLabel;
      return;
    }

    try {
      if (type.api === 'addBehavior') {
        if (!Array.isArray(window._events)) window._events = [];
        window._events.unshift(obj);
        window._events.sort((a,b) => new Date(b['תאריך']) - new Date(a['תאריך']));
        if (typeof window.drawEvents === 'function' && document.getElementById('b-list')) {
          window.drawEvents(window._events.filter(e => e['סטטוס_אישור'] !== 'ממתין לאישור'));
        }
      }
    } catch {}

    showStatus('✓ ' + type.label + ' נשמר בהצלחה!', 'success');
    if (typeof window.toast === 'function') {
      try { window.toast('✓ ' + type.label + ': ' + obj['שם תלמיד'], 'success'); } catch {}
    }
    // Clear the form for the next entry
    setTimeout(() => {
      panel.querySelector('#urp-student').value = '';
      panel.querySelector('#urp-desc').value = '';
      saveBtn.disabled = false;
      saveBtn.innerHTML = origLabel;
      setTimeout(() => { stEl.classList.add('d-none'); }, 4000);
      panel.querySelector('#urp-student').focus();
    }, 1500);
  }

  function addInlinePanel() {
    hideOtherFloaters();
    document.getElementById('ur-fab')?.remove();
    const home = document.getElementById('page-home');
    if (!home) return;
    if (home.querySelector('#urp-inline')) return;
    const wrap = document.createElement('div');
    wrap.id = 'urp-inline';
    wrap.className = 'mb-4';
    wrap.innerHTML = buildInlineFormHTML();
    home.insertBefore(wrap, home.firstChild);
    wireInlinePanel(wrap);
  }

  // Refresh the inline panel's student & category lists whenever fresh data
  // arrives — first page load often renders the panel BEFORE the sheet pull
  // finishes, so the dropdowns start empty and need to catch up.
  function refreshInlineLists() {
    const panel = document.getElementById('urp-inline');
    if (!panel) return;
    // Students datalist
    const stuList = panel.querySelector('#urp-student-list');
    if (stuList) {
      const students = getStudents().filter(s => (s['סטטוס']||'פעיל') !== 'סיים');
      stuList.innerHTML = students.map(s => `<option value="${esc(((s['שם פרטי']||'')+' '+(s['שם משפחה']||'')).trim())}"></option>`).join('');
      const smallCount = panel.querySelector('#urp-student + datalist + small');
      if (smallCount) smallCount.textContent = students.length + ' תלמידים';
    }
    // Category dropdown (only when behavior type is active)
    const catSel = panel.querySelector('#urp-cat');
    if (catSel && panel.querySelector('.urp-type-btn.btn-primary')?.dataset?.type === 'behavior') {
      const cur = catSel.value;
      const opts = getBehaviorCategories().map(c => c['קטגוריה'] || c.name).filter(Boolean);
      catSel.innerHTML = '<option value="">בחר קטגוריה...</option>' + opts.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
      if (cur && opts.includes(cur)) catSel.value = cur;
    }
  }
  // Listen for the sync events emitted after pullAllFromSheet etc.
  window.addEventListener('cheder-data-refreshed', refreshInlineLists);
  setInterval(refreshInlineLists, 4000);

  // Inject a "דיווח חדש" button into each category page so users can also
  // start a report from where they're already looking at the data, not only
  // from the global FAB. The injected button opens the unified panel with
  // the matching type pre-selected.
  const PAGE_TYPE_MAP = {
    'page-behavior':     'behavior',
    'page-reading':      'reading',
    'page-writing':      'writing',
    'page-lessonsKlein': 'lesson',
    'page-conversations':'conversation',
    'page-meetings':     'meeting',
  };
  function injectPageButtons() {
    Object.entries(PAGE_TYPE_MAP).forEach(([pageId, typeKey]) => {
      const page = document.getElementById(pageId);
      if (!page) return;
      if (page.querySelector('.ur-page-add-btn')) return;
      const labelEntry = TYPES.find(t => t.key === typeKey);
      const label = labelEntry ? labelEntry.label : 'דיווח';
      // Insert at the top of the page content
      const btn = document.createElement('button');
      btn.className = 'btn btn-success btn-lg ur-page-add-btn mb-3';
      btn.style.cssText = 'background:linear-gradient(135deg,#1e3a8a,#3b82f6);border:0;padding:10px 22px;border-radius:24px;font-weight:600;box-shadow:0 4px 14px rgba(30,58,138,0.3)';
      btn.innerHTML = '📝 הוסף ' + label;
      btn.onclick = () => showModalWithType(typeKey);
      // Place at the very top of the page
      page.insertBefore(btn, page.firstChild);
    });
  }

  // Run on hashchange + interval (pages get re-rendered)
  window.addEventListener('hashchange', () => setTimeout(injectPageButtons, 500));
  setInterval(injectPageButtons, 3000);
  setTimeout(injectPageButtons, 1500);

  // Expose globally for any other code that wants to open it
  window.openUnifiedReport = showModal;
  window.openUnifiedReportWithType = showModalWithType;

  function bootstrap() {
    hideOtherFloaters();
    addInlinePanel();
    // Re-run on home navigation in case the page got re-rendered
    window.addEventListener('hashchange', () => {
      if ((location.hash.replace('#','') || 'home') === 'home') {
        setTimeout(addInlinePanel, 400);
      }
    });
    setInterval(() => {
      const home = document.getElementById('page-home');
      if (home && !home.classList.contains('d-none') && !home.querySelector('#urp-inline')) {
        addInlinePanel();
      }
      // Always re-hide floaters in case packs add new ones
      document.querySelectorAll('body > button[style*="position:fixed"], body > div[style*="position:fixed"]').forEach(el => {
        if (el.closest?.('.modal') || el.classList?.contains('toast') || el.id === 'bht-save-dbg') return;
        const s = el.style.cssText || '';
        if (s.includes('bottom') && s.includes('left')) el.style.display = 'none';
      });
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(bootstrap, 1000));
  } else {
    setTimeout(bootstrap, 1000);
  }

  console.warn('%c📝 unified-report.js — single panel for every category', 'color:#1e3a8a;font-weight:bold;font-size:14px');
})();
