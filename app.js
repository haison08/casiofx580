/**
 * Casio fx-580VN X Controller Application
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Math Engine
  const mathEngine = new MathEngine();

  // --- Sound Effects using Web Audio API ---
  class SoundManager {
    constructor() {
      this.enabled = true;
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playClick(type = 'normal') {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (type === 'equal') {
          osc.frequency.setValueAtTime(340, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        } else if (type === 'ac') {
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        } else {
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.025);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } catch (e) {
        // Audio policy or unsupported
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }
  }

  const sound = new SoundManager();

  // --- UI Elements ---
  const elExprText = document.getElementById('expr-text');
  const elResultText = document.getElementById('result-text');
  const elFractionBox = document.getElementById('result-fraction');
  const elFracNum = document.getElementById('frac-num');
  const elFracDen = document.getElementById('frac-den');

  // Indicators
  const elIndShift = document.getElementById('ind-shift');
  const elIndAlpha = document.getElementById('ind-alpha');
  const elIndAngle = document.getElementById('ind-angle');
  const elIndUp = document.getElementById('ind-up');
  const elIndDown = document.getElementById('ind-down');
  const elIndModeName = document.getElementById('ind-mode-name');

  // Views
  const views = {
    calc: document.getElementById('view-calculate'),
    menu: document.getElementById('view-menu'),
    eqn: document.getElementById('view-equation'),
    table: document.getElementById('view-table'),
    calcPrompt: document.getElementById('view-calc-prompt')
  };

  // Buttons in top bar
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const btnToggleAngle = document.getElementById('btn-toggle-angle');
  const angleModeLbl = document.getElementById('angle-mode-lbl');
  const btnOpenHelp = document.getElementById('btn-open-help');
  const btnCloseHelp = document.getElementById('btn-close-help');
  const btnModalOk = document.getElementById('btn-modal-ok');
  const helpModal = document.getElementById('help-modal');

  // --- Calculator State ---
  const state = {
    currentMode: 'CALCULATE', // 'CALCULATE', 'MENU', 'EQUATION', 'TABLE', 'CALC_PROMPT'
    shift: false,
    alpha: false,
    expression: '',
    cursorPos: 0,
    currentResult: null,
    showingFraction: false,
    history: [],
    historyIndex: -1,

    // Equation mode state
    eqn: {
      type: null, // 'poly2', 'poly3', 'simul2'
      step: 'select_type', // 'select_type', 'select_deg', 'input_coeffs', 'show_roots'
      coeffs: [],
      coeffNames: [],
      currentCoeffIdx: 0,
      inputBuffer: '',
      roots: [],
      rootIdx: 0
    },

    // Table mode state
    table: {
      step: 'f_expr', // 'f_expr', 'start', 'end', 'step', 'result'
      expr: 'X^2 - 4',
      start: 1,
      end: 5,
      stepVal: 1,
      inputBuffer: '',
      rows: [],
      scrollIdx: 0
    },

    // CALC prompt state
    calcPrompt: {
      varName: 'X',
      inputBuffer: '',
      targetExpr: ''
    }
  };

  // --- Switch View Helper ---
  function switchView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    if (views[viewName]) {
      views[viewName].classList.remove('hidden');
    }
  }

  // --- Update LCD Display ---
  function updateDisplay() {
    // Update shift/alpha indicators
    elIndShift.classList.toggle('active', state.shift);
    elIndAlpha.classList.toggle('active', state.alpha);
    elIndAngle.textContent = mathEngine.angleMode === 'DEG' ? 'D' : 'R';
    angleModeLbl.textContent = mathEngine.angleMode;

    // History indicators
    elIndUp.classList.toggle('active', state.historyIndex > 0);
    elIndDown.classList.toggle('active', state.historyIndex >= 0 && state.historyIndex < state.history.length - 1);

    if (state.currentMode === 'CALCULATE') {
      switchView('calc');
      elIndModeName.textContent = '';
      elExprText.textContent = state.expression;

      if (state.currentResult) {
        if (state.currentResult.error) {
          elResultText.textContent = state.currentResult.error;
          elFractionBox.classList.add('hidden');
          elResultText.style.display = 'block';
        } else if (state.showingFraction && state.currentResult.fraction) {
          const parts = state.currentResult.fraction.split('/');
          elFracNum.textContent = parts[0];
          elFracDen.textContent = parts[1];
          elFractionBox.classList.remove('hidden');
          elResultText.style.display = 'none';
        } else {
          elFractionBox.classList.add('hidden');
          elResultText.style.display = 'block';
          elResultText.textContent = state.currentResult.formatted || '0';
        }
      } else {
        elFractionBox.classList.add('hidden');
        elResultText.style.display = 'block';
        elResultText.textContent = '0';
      }
    } else if (state.currentMode === 'MENU') {
      switchView('menu');
      elIndModeName.textContent = 'MENU';
    } else if (state.currentMode === 'EQUATION') {
      switchView('eqn');
      elIndModeName.textContent = 'EQN';
      renderEquationView();
    } else if (state.currentMode === 'TABLE') {
      switchView('table');
      elIndModeName.textContent = 'TABLE';
      renderTableView();
    } else if (state.currentMode === 'CALC_PROMPT') {
      switchView('calcPrompt');
      document.getElementById('calc-prompt-header').textContent = `${state.calcPrompt.varName} = ?`;
      document.getElementById('prompt-val').textContent = state.calcPrompt.inputBuffer || '0';
    }
  }

  // --- Render Equation View ---
  function renderEquationView() {
    const title = document.getElementById('eqn-step-title');
    const body = document.getElementById('eqn-body');

    if (state.eqn.step === 'select_type') {
      title.textContent = 'Chọn loại phương trình:';
      body.innerHTML = `
        <div class="eqn-row">1: Hệ phương trình</div>
        <div class="eqn-row">2: Phương trình đa thức</div>
      `;
    } else if (state.eqn.step === 'select_deg') {
      title.textContent = 'Chọn bậc (Degree? 2~3):';
      body.innerHTML = `
        <div class="eqn-row">2: Bậc 2 (ax² + bx + c = 0)</div>
        <div class="eqn-row">3: Bậc 3 (ax³ + bx² + cx + d = 0)</div>
      `;
    } else if (state.eqn.step === 'input_coeffs') {
      title.textContent = state.eqn.type === 'poly2' ? 'ax² + bx + c = 0'
        : (state.eqn.type === 'poly3' ? 'ax³ + bx² + cx + d = 0' : 'Hệ 2 phương trình:');

      const currName = state.eqn.coeffNames[state.eqn.currentCoeffIdx];
      const filledSummary = state.eqn.coeffNames.map((name, idx) => {
        const val = idx < state.eqn.currentCoeffIdx ? state.eqn.coeffs[idx] : (idx === state.eqn.currentCoeffIdx ? (state.eqn.inputBuffer || '0') : '?');
        return `${name}=${val}`;
      }).join('  ');

      body.innerHTML = `
        <div style="font-size:0.75rem; color:#223; margin-bottom:4px;">${filledSummary}</div>
        <div class="eqn-prompt-line">
          <span>Nhập hệ số <strong>${currName}</strong> = </span>
          <span class="eqn-val-active">${state.eqn.inputBuffer || '0'}</span>
          <span class="cursor"></span>
        </div>
      `;
    } else if (state.eqn.step === 'show_roots') {
      title.textContent = 'Kết quả nghiệm:';
      const rootStr = state.eqn.roots[state.eqn.rootIdx] || 'Không có nghiệm';
      const total = state.eqn.roots.length;
      body.innerHTML = `
        <div style="font-size: 1.15rem; font-weight: bold; margin-top:6px;">${rootStr}</div>
        <div style="font-size: 0.7rem; margin-top:8px; opacity:0.8;">[▲][▼] Xem nghiệm (${state.eqn.rootIdx + 1}/${total}) | [AC] Nhập lại</div>
      `;
    }
  }

  // --- Render Table View ---
  function renderTableView() {
    const title = document.getElementById('table-step-title');
    const body = document.getElementById('table-body');

    if (state.table.step === 'f_expr') {
      title.textContent = 'f(x) = ?';
      body.innerHTML = `
        <div class="eqn-prompt-line">
          <span>f(x) = </span>
          <span class="eqn-val-active">${state.table.inputBuffer}</span>
          <span class="cursor"></span>
        </div>
      `;
    } else if (state.table.step === 'start') {
      title.textContent = 'Phạm vi: Bắt đầu (Start)?';
      body.innerHTML = `
        <div class="eqn-prompt-line">
          <span>Start = </span>
          <span class="eqn-val-active">${state.table.inputBuffer || state.table.start}</span>
          <span class="cursor"></span>
        </div>
      `;
    } else if (state.table.step === 'end') {
      title.textContent = 'Phạm vi: Kết thúc (End)?';
      body.innerHTML = `
        <div class="eqn-prompt-line">
          <span>End = </span>
          <span class="eqn-val-active">${state.table.inputBuffer || state.table.end}</span>
          <span class="cursor"></span>
        </div>
      `;
    } else if (state.table.step === 'step') {
      title.textContent = 'Bước nhảy (Step)?';
      body.innerHTML = `
        <div class="eqn-prompt-line">
          <span>Step = </span>
          <span class="eqn-val-active">${state.table.inputBuffer || state.table.stepVal}</span>
          <span class="cursor"></span>
        </div>
      `;
    } else if (state.table.step === 'result') {
      title.textContent = `Bảng f(x) = ${state.table.expr}`;
      const visibleRows = state.table.rows.slice(state.table.scrollIdx, state.table.scrollIdx + 3);
      const rowsHtml = visibleRows.map((r, i) => `
        <tr>
          <td>${state.table.scrollIdx + i + 1}</td>
          <td>${r.x}</td>
          <td>${r.fx}</td>
        </tr>
      `).join('');

      body.innerHTML = `
        <table class="table-matrix">
          <thead>
            <tr><th>No.</th><th>x</th><th>f(x)</th></tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div style="font-size:0.65rem; text-align:right; margin-top:2px;">[▲][▼] Cuộn bảng</div>
      `;
    }
  }

  // --- Character / Expression Handling ---
  function insertInput(char) {
    if (state.currentMode === 'CALCULATE') {
      // If we just got a result and enter an operator, continue with Ans
      if (state.currentResult && '+-×÷^*/'.includes(char) && state.expression === '') {
        state.expression = 'Ans' + char;
      } else {
        state.expression += char;
      }
    } else if (state.currentMode === 'EQUATION') {
      if (state.eqn.step === 'input_coeffs') {
        state.eqn.inputBuffer += char;
      }
    } else if (state.currentMode === 'TABLE') {
      state.table.inputBuffer += char;
    } else if (state.currentMode === 'CALC_PROMPT') {
      state.calcPrompt.inputBuffer += char;
    }
    updateDisplay();
  }

  function deleteInput() {
    if (state.currentMode === 'CALCULATE') {
      if (state.expression.length > 0) {
        // Remove trailing multi-char functions if applicable (like sin(, cos(, etc.)
        const funcs = ['sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '√( ', '×10^', 'Ans'];
        let matched = false;
        for (const fn of funcs) {
          if (state.expression.endsWith(fn)) {
            state.expression = state.expression.slice(0, -fn.length);
            matched = true;
            break;
          }
        }
        if (!matched) {
          state.expression = state.expression.slice(0, -1);
        }
      }
    } else if (state.currentMode === 'EQUATION') {
      if (state.eqn.step === 'input_coeffs') {
        state.eqn.inputBuffer = state.eqn.inputBuffer.slice(0, -1);
      }
    } else if (state.currentMode === 'TABLE') {
      state.table.inputBuffer = state.table.inputBuffer.slice(0, -1);
    } else if (state.currentMode === 'CALC_PROMPT') {
      state.calcPrompt.inputBuffer = state.calcPrompt.inputBuffer.slice(0, -1);
    }
    updateDisplay();
  }

  function clearAll() {
    if (state.currentMode === 'CALCULATE') {
      state.expression = '';
      state.currentResult = null;
      state.showingFraction = false;
    } else if (state.currentMode === 'EQUATION') {
      if (state.eqn.step === 'show_roots') {
        state.eqn.step = 'input_coeffs';
        state.eqn.currentCoeffIdx = 0;
        state.eqn.inputBuffer = '';
      } else {
        state.eqn.inputBuffer = '';
      }
    } else if (state.currentMode === 'TABLE') {
      if (state.table.step === 'result') {
        state.table.step = 'f_expr';
        state.table.inputBuffer = '';
      } else {
        state.table.inputBuffer = '';
      }
    } else if (state.currentMode === 'CALC_PROMPT') {
      state.calcPrompt.inputBuffer = '';
    }
    updateDisplay();
  }

  // --- Perform Calculation (= button) ---
  function calculate() {
    if (state.currentMode === 'CALCULATE') {
      if (!state.expression.trim()) return;

      const res = mathEngine.evaluate(state.expression);
      state.currentResult = res;

      // Save to history
      if (!res.error) {
        state.history.push({ expr: state.expression, res });
        state.historyIndex = state.history.length;
      }

      // Default show fraction if available, otherwise decimal
      state.showingFraction = !!res.fraction;
      updateDisplay();
    } else if (state.currentMode === 'EQUATION') {
      handleEquationEnter();
    } else if (state.currentMode === 'TABLE') {
      handleTableEnter();
    } else if (state.currentMode === 'CALC_PROMPT') {
      handleCalcPromptEnter();
    }
  }

  // --- Handle CALC button ---
  function handleCalcAction() {
    if (state.currentMode !== 'CALCULATE') return;
    if (!state.expression.trim()) return;

    if (state.expression.includes('X')) {
      state.currentMode = 'CALC_PROMPT';
      state.calcPrompt.varName = 'X';
      state.calcPrompt.targetExpr = state.expression;
      state.calcPrompt.inputBuffer = String(mathEngine.variables.X || 0);
      updateDisplay();
    } else {
      calculate();
    }
  }

  function handleCalcPromptEnter() {
    const val = parseFloat(state.calcPrompt.inputBuffer) || 0;
    mathEngine.variables[state.calcPrompt.varName] = val;

    state.currentMode = 'CALCULATE';
    const res = mathEngine.evaluate(state.calcPrompt.targetExpr, { [state.calcPrompt.varName]: val });
    state.currentResult = res;
    state.showingFraction = !!res.fraction;
    updateDisplay();
  }

  // --- Handle Equation Workflow ---
  function handleEquationEnter() {
    const eqn = state.eqn;

    if (eqn.step === 'select_type') {
      const choice = eqn.inputBuffer || '1';
      if (choice === '1') {
        // Hệ 2 ẩn
        eqn.type = 'simul2';
        eqn.coeffNames = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2'];
        eqn.coeffs = [];
        eqn.currentCoeffIdx = 0;
        eqn.inputBuffer = '';
        eqn.step = 'input_coeffs';
      } else {
        // Đa thức
        eqn.step = 'select_deg';
        eqn.inputBuffer = '';
      }
      updateDisplay();
    } else if (eqn.step === 'select_deg') {
      const deg = eqn.inputBuffer || '2';
      if (deg === '3') {
        eqn.type = 'poly3';
        eqn.coeffNames = ['a', 'b', 'c', 'd'];
      } else {
        eqn.type = 'poly2';
        eqn.coeffNames = ['a', 'b', 'c'];
      }
      eqn.coeffs = [];
      eqn.currentCoeffIdx = 0;
      eqn.inputBuffer = '';
      eqn.step = 'input_coeffs';
      updateDisplay();
    } else if (eqn.step === 'input_coeffs') {
      const val = parseFloat(eqn.inputBuffer) || 0;
      eqn.coeffs.push(val);
      eqn.inputBuffer = '';
      eqn.currentCoeffIdx++;

      if (eqn.currentCoeffIdx >= eqn.coeffNames.length) {
        // All coefficients entered -> solve!
        solveCurrentEquation();
      } else {
        updateDisplay();
      }
    } else if (eqn.step === 'show_roots') {
      // Advance to next root/property
      eqn.rootIdx = (eqn.rootIdx + 1) % eqn.roots.length;
      updateDisplay();
    }
  }

  function solveCurrentEquation() {
    const eqn = state.eqn;
    const c = eqn.coeffs;

    if (eqn.type === 'poly2') {
      const sol = mathEngine.solveQuadratic(c[0], c[1], c[2]);
      const list = [...sol.roots];
      if (sol.vertexX !== undefined) {
        list.push(`${sol.extremeType} X = ${mathEngine.formatNumber(sol.vertexX)}`);
        list.push(`${sol.extremeType} Y = ${mathEngine.formatNumber(sol.vertexY)}`);
      }
      eqn.roots = list;
    } else if (eqn.type === 'poly3') {
      const sol = mathEngine.solveCubic(c[0], c[1], c[2], c[3]);
      eqn.roots = sol.roots;
    } else if (eqn.type === 'simul2') {
      const sol = mathEngine.solveLinear2(c[0], c[1], c[2], c[3], c[4], c[5]);
      eqn.roots = sol.roots || [sol.message];
    }

    eqn.step = 'show_roots';
    eqn.rootIdx = 0;
    updateDisplay();
  }

  // --- Handle Table Workflow ---
  function handleTableEnter() {
    const tbl = state.table;

    if (tbl.step === 'f_expr') {
      tbl.expr = tbl.inputBuffer || 'X^2 - 4';
      tbl.step = 'start';
      tbl.inputBuffer = '';
    } else if (tbl.step === 'start') {
      tbl.start = parseFloat(tbl.inputBuffer) || 1;
      tbl.step = 'end';
      tbl.inputBuffer = '';
    } else if (tbl.step === 'end') {
      tbl.end = parseFloat(tbl.inputBuffer) || 5;
      tbl.step = 'step';
      tbl.inputBuffer = '';
    } else if (tbl.step === 'step') {
      tbl.stepVal = parseFloat(tbl.inputBuffer) || 1;
      // Generate table
      try {
        tbl.rows = mathEngine.generateTable(tbl.expr, tbl.start, tbl.end, tbl.stepVal);
        tbl.scrollIdx = 0;
        tbl.step = 'result';
      } catch (err) {
        alert(err.message || 'Lỗi thiết lập dải giá trị!');
        tbl.step = 'start';
      }
      tbl.inputBuffer = '';
    }
    updateDisplay();
  }

  // --- S<=>D Toggle ---
  function toggleFractionDecimal() {
    if (state.currentMode === 'CALCULATE' && state.currentResult && state.currentResult.fraction) {
      state.showingFraction = !state.showingFraction;
      updateDisplay();
    }
  }

  // --- D-PAD Navigation ---
  function handleNav(direction) {
    if (state.currentMode === 'CALCULATE') {
      if (direction === 'up' && state.historyIndex > 0) {
        state.historyIndex--;
        const item = state.history[state.historyIndex];
        state.expression = item.expr;
        state.currentResult = item.res;
        state.showingFraction = !!item.res.fraction;
        updateDisplay();
      } else if (direction === 'down' && state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const item = state.history[state.historyIndex];
        state.expression = item.expr;
        state.currentResult = item.res;
        state.showingFraction = !!item.res.fraction;
        updateDisplay();
      }
    } else if (state.currentMode === 'EQUATION' && state.eqn.step === 'show_roots') {
      if (direction === 'down') {
        state.eqn.rootIdx = (state.eqn.rootIdx + 1) % state.eqn.roots.length;
        updateDisplay();
      } else if (direction === 'up') {
        state.eqn.rootIdx = (state.eqn.rootIdx - 1 + state.eqn.roots.length) % state.eqn.roots.length;
        updateDisplay();
      }
    } else if (state.currentMode === 'TABLE' && state.table.step === 'result') {
      if (direction === 'down' && state.table.scrollIdx + 3 < state.table.rows.length) {
        state.table.scrollIdx++;
        updateDisplay();
      } else if (direction === 'up' && state.table.scrollIdx > 0) {
        state.table.scrollIdx--;
        updateDisplay();
      }
    }
  }

  // --- Core Key Button Click Handler ---
  function handleKeyPress(target) {
    const key = target.closest('button');
    if (!key) return;

    sound.playClick(
      key.dataset.action === 'equal' ? 'equal' : (key.dataset.action === 'ac' ? 'ac' : 'normal')
    );

    const action = key.dataset.action;
    const nav = key.dataset.nav;

    // Handle Replay D-Pad
    if (nav) {
      handleNav(nav);
      return;
    }

    // Handle Special Actions
    if (action === 'shift') {
      state.shift = !state.shift;
      if (state.shift) state.alpha = false;
      updateDisplay();
      return;
    }

    if (action === 'alpha') {
      state.alpha = !state.alpha;
      if (state.alpha) state.shift = false;
      updateDisplay();
      return;
    }

    if (action === 'menu') {
      state.currentMode = state.currentMode === 'MENU' ? 'CALCULATE' : 'MENU';
      state.shift = false;
      state.alpha = false;
      updateDisplay();
      return;
    }

    if (action === 'on') {
      state.currentMode = 'CALCULATE';
      state.expression = '';
      state.currentResult = null;
      state.shift = false;
      state.alpha = false;
      updateDisplay();
      return;
    }

    if (action === 'ac') {
      clearAll();
      return;
    }

    if (action === 'del') {
      deleteInput();
      return;
    }

    if (action === 'equal') {
      calculate();
      return;
    }

    if (action === 'sd') {
      toggleFractionDecimal();
      return;
    }

    if (action === 'calc') {
      handleCalcAction();
      return;
    }

    // If currently in MENU mode, pressing 1, 2, 8, 9 picks mode
    if (state.currentMode === 'MENU') {
      const numInput = key.dataset.input;
      if (numInput === '1') {
        state.currentMode = 'CALCULATE';
      } else if (numInput === '8') {
        state.currentMode = 'TABLE';
        state.table.step = 'f_expr';
        state.table.inputBuffer = '';
      } else if (numInput === '9') {
        state.currentMode = 'EQUATION';
        state.eqn.step = 'select_type';
        state.eqn.inputBuffer = '';
      } else if (numInput === '2') {
        state.currentMode = 'CALCULATE';
        alert('Chế độ Số Phức (Complex Mode) đã sẵn sàng: Hỗ trợ số ảo i từ phím ENG');
      }
      updateDisplay();
      return;
    }

    // Check Alpha and Shift modifiers
    let inputVal = key.dataset.input;

    if (state.shift && key.dataset.shift) {
      inputVal = key.dataset.shift;
      state.shift = false;
    } else if (state.alpha && key.dataset.alpha) {
      inputVal = key.dataset.alpha;
      state.alpha = false;
    }

    if (inputVal) {
      if (inputVal === '(-)') inputVal = '-';
      if (inputVal === 'ENG') inputVal = 'i';
      insertInput(inputVal);
    }

    // Reset single-use shift/alpha
    if (state.shift) {
      state.shift = false;
      updateDisplay();
    }
    if (state.alpha) {
      state.alpha = false;
      updateDisplay();
    }
  }

  // --- Attach Event Listeners ---
  document.querySelector('.keypad-container').addEventListener('click', (e) => {
    handleKeyPress(e.target);
  });

  // Menu items click in MENU mode
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const mode = item.dataset.mode;
      if (mode === '1') {
        state.currentMode = 'CALCULATE';
      } else if (mode === '8') {
        state.currentMode = 'TABLE';
        state.table.step = 'f_expr';
        state.table.inputBuffer = '';
      } else if (mode === '9') {
        state.currentMode = 'EQUATION';
        state.eqn.step = 'select_type';
        state.eqn.inputBuffer = '';
      }
      updateDisplay();
    });
  });

  // Top Nav quick actions
  btnToggleSound.addEventListener('click', () => {
    const isEnabled = sound.toggle();
    btnToggleSound.querySelector('.lbl').textContent = isEnabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT';
    btnToggleSound.querySelector('.icon').textContent = isEnabled ? '🔊' : '🔇';
  });

  btnToggleAngle.addEventListener('click', () => {
    const mode = mathEngine.toggleAngleMode();
    angleModeLbl.textContent = mode;
    updateDisplay();
  });

  btnOpenHelp.addEventListener('click', () => {
    helpModal.classList.remove('hidden');
  });

  btnCloseHelp.addEventListener('click', () => {
    helpModal.classList.add('hidden');
  });

  btnModalOk.addEventListener('click', () => {
    helpModal.classList.add('hidden');
  });

  // Keyboard shortcuts listener
  window.addEventListener('keydown', (e) => {
    // Ignore keyboard events if user is inside an input modal or pressing control/meta
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key >= '0' && e.key <= '9') {
      sound.playClick('normal');
      if (state.currentMode === 'MENU') {
        if (e.key === '1') state.currentMode = 'CALCULATE';
        else if (e.key === '8') { state.currentMode = 'TABLE'; state.table.step = 'f_expr'; state.table.inputBuffer = ''; }
        else if (e.key === '9') { state.currentMode = 'EQUATION'; state.eqn.step = 'select_type'; state.eqn.inputBuffer = ''; }
        updateDisplay();
        return;
      }
      insertInput(e.key);
      e.preventDefault();
    } else if (e.key === '.') {
      sound.playClick('normal');
      insertInput('.');
      e.preventDefault();
    } else if (e.key === '+') {
      sound.playClick('normal');
      insertInput('+');
      e.preventDefault();
    } else if (e.key === '-') {
      sound.playClick('normal');
      insertInput('−');
      e.preventDefault();
    } else if (e.key === '*' || e.key === 'x') {
      sound.playClick('normal');
      if (e.key === 'x' && (state.currentMode === 'CALCULATE' || state.currentMode === 'TABLE')) {
        insertInput('X');
      } else {
        insertInput('×');
      }
      e.preventDefault();
    } else if (e.key === '/') {
      sound.playClick('normal');
      insertInput('÷');
      e.preventDefault();
    } else if (e.key === '^') {
      sound.playClick('normal');
      insertInput('^');
      e.preventDefault();
    } else if (e.key === '(' || e.key === ')') {
      sound.playClick('normal');
      insertInput(e.key);
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === '=') {
      sound.playClick('equal');
      calculate();
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      sound.playClick('normal');
      deleteInput();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      sound.playClick('ac');
      clearAll();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      handleNav('up');
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      handleNav('down');
      e.preventDefault();
    } else if (e.key.toLowerCase() === 's') {
      sound.playClick('normal');
      insertInput('sin(');
      e.preventDefault();
    } else if (e.key.toLowerCase() === 'c') {
      sound.playClick('normal');
      insertInput('cos(');
      e.preventDefault();
    } else if (e.key.toLowerCase() === 't') {
      sound.playClick('normal');
      insertInput('tan(');
      e.preventDefault();
    }
  });

  // Initial render
  updateDisplay();
});

