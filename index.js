/**
 * Epic Roadmap Gantt — Looker Studio Community Visualization
 * Conecta à aba Roadmap gerada pelo script JIRA (Roadmap.gs).
 *
 * Campos esperados (mapeados no vizConfig.json):
 *   issueKey   → Chave         (dimensão)
 *   issueType  → Tipo          (dimensão)
 *   summary    → Resumo        (dimensão)
 *   assignee   → Responsável   (dimensão, opcional)
 *   status     → Status        (dimensão)
 *   startDate  → Início        (dimensão, formato dd/MM/yyyy)
 *   endDate    → Fim           (dimensão, formato dd/MM/yyyy)
 *   duration   → Duração (dias)(métrica, opcional)
 */

/* global dscc */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const PRJ_COLORS = {
  MAND:'#4299e1',SSEG:'#9f7aea',FOUN:'#48bb78',STR:'#ed8936',
  CVPC:'#fc8181',PER:'#f6ad55',DEFEV:'#38b2ac',ONBO:'#b794f4',
  GUARD:'#76e4f7',UX:'#f687b3',DGP:'#fbd38d',TPROC:'#faf089',
  TCON:'#90cdf4',DAEF:'#68d391',DEFAULT:'#718096'
};

const STATUS_LEGEND = [
  ['Concluído',          '#48bb78'],
  ['Em Desenvolvimento', '#4299e1'],
  ['Pronto / Deploy',    '#805ad5'],
  ['Em Refinamento',     '#ed8936'],
  ['Backlog / A Fazer',  '#4a5568'],
  ['Bloqueado',          '#fc8181'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function projColor(key) {
  const p = (key || '').replace(/-.*/, '').toUpperCase();
  return PRJ_COLORS[p] || PRJ_COLORS.DEFAULT;
}

function statusColor(s) {
  s = (s || '').toLowerCase();
  if (s.includes('conclu'))                                      return '#48bb78';
  if (s.includes('desenvolvimento') || s.includes('deploy') || s.includes('em rt')) return '#4299e1';
  if (s.includes('pronto'))                                      return '#805ad5';
  if (s.includes('refinamento') || s.includes('testes') || s.includes('homolog')) return '#ed8936';
  if (s.includes('bloqueado') || s.includes('aguardando'))       return '#fc8181';
  return '#4a5568';
}

function parseDate(s) {
  if (!s) return null;
  // dd/MM/yyyy
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  // yyyy-MM-dd (Looker Studio pode enviar assim)
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function fmtDate(d) {
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse dscc data → epics[]
// ─────────────────────────────────────────────────────────────────────────────
function parseData(data) {
  const tables  = data.tables.DEFAULT;
  const fields  = data.fields;

  // Build field index by id
  const idx = {};
  Object.keys(fields).forEach(id => {
    idx[id] = fields[id][0] ? fields[id][0].id : id;
  });

  // Helper: get value by field id
  const val = (row, id) => {
    const arr = row[id];
    if (!arr || arr.length === 0) return '';
    const v = arr[0];
    if (v === null || v === undefined) return '';
    return String(v);
  };

  const rows = tables.map(row => ({
    key:      val(row, 'issueKey'),
    type:     (val(row, 'issueType') || '').trim(),
    summary:  (val(row, 'summary')   || '').trim(),
    assignee: val(row, 'assignee'),
    status:   val(row, 'status'),
    start:    parseDate(val(row, 'startDate')),
    end:      parseDate(val(row, 'endDate')),
    dur:      parseFloat(val(row, 'duration')) || 0,
  })).filter(r => r.key);

  // Group into epics
  const epics = [];
  let cur = null;
  rows.forEach(row => {
    const t = row.type.toLowerCase();
    if (t.includes('épico') || t === 'epic' || t.includes('epico')) {
      row.children = [];
      epics.push(row);
      cur = row;
    } else if (cur) {
      cur.children.push(row);
    }
  });

  return epics;
}

// ─────────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────────
function render(data) {
  // Style options
  const style   = data.style || {};
  const MW      = parseInt((style.monthWidth  && style.monthWidth.value)  || '70');
  const BH      = parseInt((style.barHeight   && style.barHeight.value)   || '18');
  const SHOW_CH = (style.showChildBars && style.showChildBars.value) !== false;
  const DARK    = (style.darkMode && style.darkMode.value) !== false;
  const LEFT_W  = 340;

  document.body.className = DARK ? 'dark' : 'light';
  document.body.innerHTML = '';

  // ── Parse ──
  const epics = parseData(data);
  if (!epics.length) {
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:14px;opacity:.4">
      Nenhum dado encontrado. Verifique o mapeamento de campos.
    </div>`;
    return;
  }

  // ── Date range ──
  const today = new Date();
  const allD  = [];
  epics.forEach(e => {
    if (e.start) allD.push(e.start);
    if (e.end)   allD.push(e.end);
    e.children.forEach(c => {
      if (c.start) allD.push(c.start);
      if (c.end)   allD.push(c.end);
    });
  });

  let tMin = allD.length ? new Date(Math.min(...allD)) : new Date(today.getFullYear(), today.getMonth() - 2, 1);
  let tMax = allD.length ? new Date(Math.max(...allD)) : new Date(today.getFullYear(), today.getMonth() + 10, 1);
  tMin = new Date(tMin.getFullYear(), Math.max(tMin.getMonth() - 1, 0), 1);
  tMax = new Date(tMax.getFullYear(), tMax.getMonth() + 2, 1);

  const months = [];
  let mc = new Date(tMin);
  while (mc < tMax) { months.push(new Date(mc)); mc = new Date(mc.getFullYear(), mc.getMonth() + 1, 1); }
  const totalW  = months.length * MW;
  const totalMs = tMax - tMin;
  const x = d => d ? Math.round(((d - tMin) / totalMs) * totalW) : null;
  const todayX  = x(today);

  // ── Wrapper ──
  const wrap = document.createElement('div');
  wrap.className = 'gz-wrap';
  document.body.appendChild(wrap);

  // ── Legend ──
  const legend = document.createElement('div');
  legend.className = 'gz-legend';
  legend.innerHTML = STATUS_LEGEND.map(([l, c]) =>
    `<div class="gz-legend-item"><div class="gz-legend-swatch" style="background:${c}"></div>${l}</div>`
  ).join('') + `<div style="flex:1"></div><div style="font-size:10px;opacity:.4">⬤ = sem data</div>`;
  wrap.appendChild(legend);

  // ── Layout ──
  const layout = document.createElement('div');
  layout.className = 'gz-body';
  wrap.appendChild(layout);

  // Left
  const gLeft = document.createElement('div');
  gLeft.className = 'gz-left';
  gLeft.style.width = gLeft.style.minWidth = LEFT_W + 'px';
  gLeft.innerHTML = `<div class="gz-left-hdr">Épico / Issue</div>`;
  const leftBody = document.createElement('div');
  leftBody.className = 'gz-left-body';
  gLeft.appendChild(leftBody);
  layout.appendChild(gLeft);

  // Right
  const gRight = document.createElement('div');
  gRight.className = 'gz-right';
  layout.appendChild(gRight);

  // Timeline header
  const tlHdr = document.createElement('div');
  tlHdr.className = 'gz-tl-hdr';
  tlHdr.innerHTML = months.map((m, i) => {
    const isCur = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
    const isQ   = m.getMonth() % 3 === 0;
    return `<div class="gz-month ${isCur ? 'cur' : ''} ${isQ ? 'q' : ''}" style="width:${MW}px">
      ${MONTHS_PT[m.getMonth()]} ${m.getFullYear().toString().slice(2)}
    </div>`;
  }).join('');
  gRight.appendChild(tlHdr);

  // Gantt body
  const ganttBody = document.createElement('div');
  ganttBody.className = 'gz-gantt-body';
  ganttBody.style.width = totalW + 'px';
  gRight.appendChild(ganttBody);

  // Grid lines
  months.forEach((m, i) => {
    const gl = document.createElement('div');
    gl.className = 'gz-grid';
    gl.style.left = (i * MW) + 'px';
    ganttBody.appendChild(gl);
  });
  if (todayX >= 0 && todayX <= totalW) {
    const tl = document.createElement('div');
    tl.className = 'gz-grid today';
    tl.style.left = todayX + 'px';
    ganttBody.appendChild(tl);
  }

  // ── Tooltip ──
  const tip = document.createElement('div');
  tip.className = 'gz-tip';
  document.body.appendChild(tip);

  function showTip(el, e) {
    const d = el.dataset;
    tip.innerHTML = `
      <div class="gz-tip-key">${d.k}</div>
      <div class="gz-tip-title">${d.s}</div>
      <div class="gz-tip-row"><span class="gz-tip-lbl">Status</span><span class="gz-tip-val" style="color:${statusColor(d.st)}">${d.st}</span></div>
      ${d.sd && d.sd !== '—' ? `<div class="gz-tip-row"><span class="gz-tip-lbl">Início</span><span class="gz-tip-val">${d.sd}</span></div>` : ''}
      ${d.ed && d.ed !== '—' ? `<div class="gz-tip-row"><span class="gz-tip-lbl">Fim</span><span class="gz-tip-val">${d.ed}</span></div>` : ''}
      ${d.as ? `<div class="gz-tip-row"><span class="gz-tip-lbl">Responsável</span><span class="gz-tip-val">${d.as.split('-')[0].trim().split(' ').slice(0, 3).join(' ')}</span></div>` : ''}
      ${d.ch ? `<div class="gz-tip-row"><span class="gz-tip-lbl">Issues</span><span class="gz-tip-val">${d.ch}</span></div>` : ''}
    `;
    tip.style.display = 'block';
    moveTip(e);
  }

  function moveTip(e) {
    let lx = e.clientX + 16, ty = e.clientY - 10;
    if (lx + 310 > window.innerWidth)  lx = e.clientX - 316;
    if (ty + 160 > window.innerHeight) ty = e.clientY - 150;
    tip.style.left = lx + 'px';
    tip.style.top  = ty + 'px';
  }

  function hideTip() { tip.style.display = 'none'; }

  function attachTip(el) {
    el.addEventListener('mouseenter', e => showTip(el, e));
    el.addEventListener('mousemove',  e => moveTip(e));
    el.addEventListener('mouseleave', hideTip);
  }

  // ── Build rows ──
  epics.forEach((epic, ei) => {
    const col    = projColor(epic.key);
    const sdot   = statusColor(epic.status);
    const eId    = 'e' + ei;
    const hasKid = epic.children.length > 0;
    const epicH  = BH + 24;  // bar height + vertical padding

    // ── Left label (epic) ──
    const ll = document.createElement('div');
    ll.className = 'gz-row epic';
    ll.innerHTML = `<div class="gz-label" style="height:${epicH}px;width:${LEFT_W}px;min-width:${LEFT_W}px">
      ${hasKid
        ? `<button class="gz-toggle" data-eid="${eId}">▶</button>`
        : '<div class="gz-toggle-sp"></div>'}
      <div class="gz-dot" style="background:${sdot}"></div>
      <div class="gz-key" style="color:${col}">${esc(epic.key)}</div>
      <div class="gz-name" title="${esc(epic.summary)}">${esc(epic.summary)}</div>
    </div>`;
    leftBody.appendChild(ll);

    // ── Right bar (epic) ──
    const br = document.createElement('div');
    br.className = 'gz-row epic';
    const sx = x(epic.start), ex = x(epic.end);
    let barH = '';
    if (sx !== null && ex !== null && ex > sx) {
      const w = Math.max(ex - sx, 4);
      barH = `<div class="gz-bar"
        style="left:${sx}px;width:${w}px;background:${col};height:${BH}px"
        data-k="${esc(epic.key)}" data-s="${esc(epic.summary)}"
        data-st="${esc(epic.status)}" data-as="${esc(epic.assignee)}"
        data-sd="${fmtDate(epic.start)}" data-ed="${fmtDate(epic.end)}"
        data-ch="${epic.children.length}">
        ${w > 70 ? `<span class="gz-bar-lbl">${esc(epic.key)}</span>` : ''}
      </div>`;
    } else if (sx !== null) {
      barH = `<div class="gz-nodate"
        style="left:${sx - 7}px;border-color:${col};color:${col}"
        data-k="${esc(epic.key)}" data-s="${esc(epic.summary)}"
        data-st="${esc(epic.status)}" data-as="${esc(epic.assignee)}"
        data-sd="${fmtDate(epic.start)}" data-ed="" data-ch="${epic.children.length}">⬤</div>`;
    }
    br.innerHTML = `<div class="gz-tl" style="width:${totalW}px;height:${epicH}px">${barH}</div>`;
    ganttBody.appendChild(br);

    // Attach tooltip to bar
    br.querySelectorAll('.gz-bar, .gz-nodate').forEach(attachTip);

    // Filter interaction on epic click
    br.querySelectorAll('.gz-bar').forEach(bar => {
      bar.addEventListener('click', () => {
        if (typeof dscc !== 'undefined' && dscc.sendInteraction) {
          dscc.sendInteraction('onClick', 'FILTER', {
            concepts: ['issueKey'],
            values: [[epic.key]]
          });
        }
      });
    });

    // ── Children ──
    if (!SHOW_CH) return;

    epic.children.forEach((child) => {
      const cs   = statusColor(child.status);
      const childH = Math.max(BH - 4, 10) + 18;

      // Left label
      const cl = document.createElement('div');
      cl.className = 'gz-row child';
      cl.dataset.pid = eId;
      cl.innerHTML = `<div class="gz-label" style="height:${childH}px;width:${LEFT_W}px;min-width:${LEFT_W}px;padding-left:30px">
        <div class="gz-dot" style="background:${cs}"></div>
        <div class="gz-key" style="color:${col};font-size:8px">${esc(child.key)}</div>
        <div class="gz-name" style="font-size:10px;opacity:.7" title="${esc(child.summary)}">${esc(child.summary)}</div>
      </div>`;
      leftBody.appendChild(cl);

      // Right bar
      const cbr = document.createElement('div');
      cbr.className = 'gz-row child';
      cbr.dataset.pid = eId;
      const csx = x(child.start), cex = x(child.end);
      let cbH = '';
      if (csx !== null && cex !== null && cex > csx) {
        const cw = Math.max(cex - csx, 2);
        cbH = `<div class="gz-bar"
          style="left:${csx}px;width:${cw}px;background:${cs};height:${Math.max(BH - 8, 6)}px;opacity:.75"
          data-k="${esc(child.key)}" data-s="${esc(child.summary)}"
          data-st="${esc(child.status)}" data-as="${esc(child.assignee)}"
          data-sd="${fmtDate(child.start)}" data-ed="${fmtDate(child.end)}" data-ch=""></div>`;
      } else if (csx !== null) {
        cbH = `<div class="gz-nodate"
          style="left:${csx - 7}px;border-color:${cs};color:${cs}"
          data-k="${esc(child.key)}" data-s="${esc(child.summary)}"
          data-st="${esc(child.status)}" data-as="${esc(child.assignee)}"
          data-sd="${fmtDate(child.start)}" data-ed="" data-ch="">⬤</div>`;
      }
      cbr.innerHTML = `<div class="gz-tl" style="width:${totalW}px;height:${childH}px">${cbH}</div>`;
      ganttBody.appendChild(cbr);

      cbr.querySelectorAll('.gz-bar, .gz-nodate').forEach(attachTip);
    });
  });

  // ── Toggle buttons ──
  document.querySelectorAll('.gz-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.eid;
      const open = btn.classList.toggle('open');
      btn.textContent = open ? '▼' : '▶';
      document.querySelectorAll(`.gz-row.child[data-pid="${id}"]`).forEach(r => {
        r.classList.toggle('open', open);
      });
    });
  });

  // ── Scroll sync ──
  let syncing = false;
  gRight.addEventListener('scroll', () => {
    if (syncing) return; syncing = true;
    leftBody.scrollTop = gRight.scrollTop;
    syncing = false;
  });
  leftBody.addEventListener('scroll', () => {
    if (syncing) return; syncing = true;
    gRight.scrollTop = leftBody.scrollTop;
    syncing = false;
  });

  // ── Scroll to today ──
  if (todayX > 0) {
    setTimeout(() => { gRight.scrollLeft = Math.max(0, todayX - gRight.clientWidth * 0.3); }, 80);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────
if (typeof dscc !== 'undefined') {
  dscc.subscribeToData(render, { transform: dscc.objectTransform });
} else {
  // Desenvolvimento local: exibe mensagem de fallback
  document.body.innerHTML = `<div style="font-family:sans-serif;padding:30px;color:#718096">
    <p>Este arquivo deve ser carregado via Looker Studio Community Visualization.<br>
    Para desenvolvimento local, use o <a href="https://github.com/googledatastudio/tooling/tree/master/packages/ds-component" style="color:#4299e1">dscc-scripts</a> simulator.</p>
  </div>`;
}
