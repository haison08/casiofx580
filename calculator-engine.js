/**
 * Casio fx-580VN X Math Engine
 * Supports standard arithmetic, natural display formatting, fraction conversion,
 * variable substitution, trigonometry (DEG/RAD), quadratic/cubic solvers, and 2x2 system solvers.
 */

class MathEngine {
  constructor() {
    this.angleMode = 'DEG'; // 'DEG' or 'RAD'
    this.ans = 0;
    this.variables = {
      X: 0,
      Y: 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      F: 0,
      M: 0
    };
  }

  setAngleMode(mode) {
    if (mode === 'DEG' || mode === 'RAD') {
      this.angleMode = mode;
    }
  }

  toggleAngleMode() {
    this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
    return this.angleMode;
  }

  /**
   * Convert decimal number to simple fraction [numerator, denominator]
   * Using continued fraction algorithm
   */
  toFraction(val, maxDenominator = 1000) {
    if (isNaN(val) || !isFinite(val)) return null;
    if (Math.abs(val) > 1e10) return null;
    if (Math.abs(val - Math.round(val)) < 1e-9) {
      return { num: Math.round(val), den: 1 };
    }

    const sign = val < 0 ? -1 : 1;
    let x = Math.abs(val);

    let h1 = 1, h2 = 0;
    let k1 = 0, k2 = 1;
    let b = x;

    for (let i = 0; i < 15; i++) {
      let a = Math.floor(b);
      let h = a * h1 + h2;
      let k = a * k1 + k2;

      if (k > maxDenominator) break;

      h2 = h1; h1 = h;
      k2 = k1; k1 = k;

      if (Math.abs(x - h / k) < 1e-9) {
        return { num: sign * h, den: k };
      }

      let diff = b - a;
      if (Math.abs(diff) < 1e-10) break;
      b = 1 / diff;
    }
    return null;
  }

  factorial(n) {
    if (n < 0 || Math.floor(n) !== n || n > 69) throw new Error('Math ERROR');
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  evaluate(expr, customVars = {}) {
    if (!expr || expr.trim() === '') return { value: 0, formatted: '0' };

    try {
      const sanitized = this.preprocess(expr, customVars);
      const val = this.parseAndEval(sanitized);

      if (isNaN(val)) throw new Error('Math ERROR');
      if (!isFinite(val)) throw new Error('Math ERROR');

      this.ans = val;

      const frac = this.toFraction(val);
      return {
        value: val,
        fraction: frac && frac.den !== 1 ? `${frac.num}/${frac.den}` : null,
        formatted: this.formatNumber(val)
      };
    } catch (err) {
      return { error: err.message || 'Syntax ERROR' };
    }
  }

  formatNumber(val) {
    if (Math.abs(val) === 0) return '0';
    if (Math.abs(val) >= 1e10 || (Math.abs(val) < 1e-4 && Math.abs(val) > 0)) {
      return Number(val.toPrecision(7)).toExponential();
    }
    const rounded = Number(parseFloat(val.toFixed(10)));
    return rounded.toString();
  }

  preprocess(expr, customVars = {}) {
    let s = expr;

    // Normalize symbols
    s = s.replace(/×/g, '*')
         .replace(/÷/g, '/')
         .replace(/−/g, '-')
         .replace(/π/g, `(${Math.PI})`)
         .replace(/Ans/g, `(${this.ans})`);

    // Handle variables: X, Y, A, B, C, D, E, F, M
    // Replace with value. Ensure 2X -> 2*(val)
    const vars = { ...this.variables, ...customVars };
    const varKeys = Object.keys(vars);

    for (const k of varKeys) {
      const val = vars[k] !== undefined ? vars[k] : 0;
      // Preceded by digit -> insert *
      const regexBefore = new RegExp(`(\\d)(${k})`, 'g');
      s = s.replace(regexBefore, `$1*(${val})`);

      // Followed by digit -> insert *
      const regexAfter = new RegExp(`(${k})(\\d)`, 'g');
      s = s.replace(regexAfter, `(${val})*$2`);

      // Standalone or with operators
      const regexGeneral = new RegExp(`(^|[^a-zA-Z0-9_])${k}(?![a-zA-Z0-9_])`, 'g');
      s = s.replace(regexGeneral, `$1(${val})`);
    }

    // Natural Casio replacements
    s = s.replace(/e(?![a-zA-Z0-9_])/g, `(${Math.E})`);
    s = s.replace(/(\d+)\s*%/g, '($1*0.01)');
    s = s.replace(/×10\^([-\d]+|\([-\d]+\))/g, '*(10^$1)');

    // Auto-close missing trailing parentheses (Casio Natural V.P.A.M. behavior)
    const openCount = (s.match(/\(/g) || []).length;
    const closeCount = (s.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      s += ')'.repeat(openCount - closeCount);
    }

    return s;
  }

  /**
   * Tokenizer & Shunting-Yard Parser with AST evaluation
   */
  parseAndEval(expression) {
    const tokens = this.tokenize(expression);
    const rpn = this.shuntingYard(tokens);
    return this.evaluateRPN(rpn);
  }

  tokenize(s) {
    const tokens = [];
    let i = 0;
    const len = s.length;

    while (i < len) {
      const c = s[i];

      if (/\s/.test(c)) {
        i++;
        continue;
      }

      // Check numbers (e.g. 123, 3.14)
      if (/\d|\./.test(c)) {
        let numStr = '';
        while (i < len && /[\d.]/.test(s[i])) {
          numStr += s[i];
          i++;
        }
        tokens.push({ type: 'number', value: parseFloat(numStr) });
        continue;
      }

      // Functions with names
      const funcMatch = s.slice(i).match(/^(sin⁻¹|cos⁻¹|tan⁻¹|asin|acos|atan|sinh|cosh|tanh|sin|cos|tan|ln|log|sqrt|√|cbrt|∛|abs|fact)/);
      if (funcMatch) {
        let fn = funcMatch[1];
        if (fn === '√') fn = 'sqrt';
        if (fn === '∛') fn = 'cbrt';
        if (fn === 'sin⁻¹') fn = 'asin';
        if (fn === 'cos⁻¹') fn = 'acos';
        if (fn === 'tan⁻¹') fn = 'atan';
        tokens.push({ type: 'function', value: fn });
        i += funcMatch[0].length;
        continue;
      }

      // Operators & brackets
      if ('+-*/^!(),'.includes(c)) {
        tokens.push({ type: 'operator', value: c });
        i++;
        continue;
      }

      // If unrecognized
      throw new Error('Syntax ERROR');
    }

    // Insert implicit multiplications and handle unary minus
    return this.processImplicitAndUnary(tokens);
  }

  processImplicitAndUnary(tokens) {
    const processed = [];

    for (let i = 0; i < tokens.length; i++) {
      const curr = tokens[i];
      const prev = processed[processed.length - 1];

      // Unary minus: if '-' is preceded by nothing, an operator (except '!'), or '('
      if (curr.type === 'operator' && curr.value === '-') {
        if (!prev || (prev.type === 'operator' && prev.value !== ')') || (prev.type === 'operator' && prev.value === '(')) {
          processed.push({ type: 'operator', value: 'u-' });
          continue;
        }
      }

      // Unary plus: ignore if leading or right after '('
      if (curr.type === 'operator' && curr.value === '+') {
        if (!prev || (prev.type === 'operator' && prev.value === '(')) {
          continue;
        }
      }

      // Implicit multiplication check:
      // (number or ')' or '!') followed by (number, '(', or function)
      if (prev) {
        const prevCanEndExpr = prev.type === 'number' ||
          (prev.type === 'operator' && (prev.value === ')' || prev.value === '!'));
        const currCanStartExpr = curr.type === 'number' ||
          curr.type === 'function' ||
          (curr.type === 'operator' && curr.value === '(');

        if (prevCanEndExpr && currCanStartExpr) {
          processed.push({ type: 'operator', value: '*' });
        }
      }

      processed.push(curr);
    }

    return processed;
  }

  shuntingYard(tokens) {
    const output = [];
    const opStack = [];

    const precedence = {
      '+': 2, '-': 2,
      '*': 3, '/': 3,
      'u-': 4,
      '^': 5,
      '!': 6
    };

    const isRightAssociative = op => op === '^' || op === 'u-';

    for (const token of tokens) {
      if (token.type === 'number') {
        output.push(token);
      } else if (token.type === 'function') {
        opStack.push(token);
      } else if (token.type === 'operator') {
        const op = token.value;

        if (op === '(') {
          opStack.push(token);
        } else if (op === ')') {
          while (opStack.length && opStack[opStack.length - 1].value !== '(') {
            output.push(opStack.pop());
          }
          if (!opStack.length) throw new Error('Syntax ERROR');
          opStack.pop(); // Pop '('

          // If top of stack is function, pop it to output
          if (opStack.length && opStack[opStack.length - 1].type === 'function') {
            output.push(opStack.pop());
          }
        } else {
          // Normal operator
          while (opStack.length) {
            const top = opStack[opStack.length - 1];
            if (top.value === '(') break;

            const precCurr = precedence[op] || 0;
            const precTop = precedence[top.value] || (top.type === 'function' ? 99 : 0);

            if (precTop > precCurr || (precTop === precCurr && !isRightAssociative(op))) {
              output.push(opStack.pop());
            } else {
              break;
            }
          }
          opStack.push(token);
        }
      }
    }

    while (opStack.length) {
      const top = opStack.pop();
      if (top.value === '(' || top.value === ')') throw new Error('Syntax ERROR');
      output.push(top);
    }

    return output;
  }

  evaluateRPN(rpn) {
    const stack = [];

    for (const token of rpn) {
      if (token.type === 'number') {
        stack.push(token.value);
      } else if (token.type === 'operator') {
        if (token.value === 'u-') {
          if (stack.length < 1) throw new Error('Syntax ERROR');
          stack.push(-stack.pop());
        } else if (token.value === '!') {
          if (stack.length < 1) throw new Error('Syntax ERROR');
          stack.push(this.factorial(stack.pop()));
        } else {
          if (stack.length < 2) throw new Error('Syntax ERROR');
          const b = stack.pop();
          const a = stack.pop();

          switch (token.value) {
            case '+': stack.push(a + b); break;
            case '-': stack.push(a - b); break;
            case '*': stack.push(a * b); break;
            case '/':
              if (Math.abs(b) < 1e-15) throw new Error('Math ERROR');
              stack.push(a / b);
              break;
            case '^':
              if (a < 0 && !Number.isInteger(b)) throw new Error('Math ERROR');
              stack.push(Math.pow(a, b));
              break;
            default:
              throw new Error('Syntax ERROR');
          }
        }
      } else if (token.type === 'function') {
        if (stack.length < 1) throw new Error('Syntax ERROR');
        const x = stack.pop();
        const rad = this.angleMode === 'DEG' ? (x * Math.PI) / 180 : x;

        switch (token.value) {
          case 'sin':
            if (this.angleMode === 'DEG' && x % 180 === 0) stack.push(0);
            else stack.push(Math.sin(rad));
            break;
          case 'cos':
            if (this.angleMode === 'DEG' && (x - 90) % 180 === 0) stack.push(0);
            else stack.push(Math.cos(rad));
            break;
          case 'tan': {
            if (this.angleMode === 'DEG' && (x - 90) % 180 === 0) throw new Error('Math ERROR');
            const res = Math.tan(rad);
            stack.push(Math.abs(res) < 1e-15 ? 0 : res);
            break;
          }
          case 'asin': {
            if (x < -1 || x > 1) throw new Error('Math ERROR');
            const val = Math.asin(x);
            stack.push(this.angleMode === 'DEG' ? (val * 180) / Math.PI : val);
            break;
          }
          case 'acos': {
            if (x < -1 || x > 1) throw new Error('Math ERROR');
            const val = Math.acos(x);
            stack.push(this.angleMode === 'DEG' ? (val * 180) / Math.PI : val);
            break;
          }
          case 'atan': {
            const val = Math.atan(x);
            stack.push(this.angleMode === 'DEG' ? (val * 180) / Math.PI : val);
            break;
          }
          case 'ln':
            if (x <= 0) throw new Error('Math ERROR');
            stack.push(Math.log(x));
            break;
          case 'log':
            if (x <= 0) throw new Error('Math ERROR');
            stack.push(Math.log10(x));
            break;
          case 'sqrt':
            if (x < 0) throw new Error('Math ERROR');
            stack.push(Math.sqrt(x));
            break;
          case 'cbrt':
            stack.push(Math.cbrt(x));
            break;
          case 'abs':
            stack.push(Math.abs(x));
            break;
          default:
            throw new Error('Syntax ERROR');
        }
      }
    }

    if (stack.length !== 1) throw new Error('Syntax ERROR');
    return stack[0];
  }

  // --- EQUATION SOLVERS ---

  /**
   * Solve Quadratic Equation: ax² + bx + c = 0
   */
  solveQuadratic(a, b, c) {
    if (a === 0) {
      if (b === 0) {
        return c === 0 ? { type: 'infinite', message: 'Vô số nghiệm' } : { type: 'none', message: 'Vô nghiệm' };
      }
      return {
        type: 'linear',
        x1: -c / b,
        text: `x = ${this.formatNumber(-c / b)}`
      };
    }

    const delta = b * b - 4 * a * c;
    const vertexX = -b / (2 * a);
    const vertexY = c - (b * b) / (4 * a);
    const extremeType = a > 0 ? 'Cực tiểu (Min)' : 'Cực đại (Max)';

    if (Math.abs(delta) < 1e-12) {
      const x = -b / (2 * a);
      return {
        type: 'double',
        x1: x,
        vertexX,
        vertexY,
        extremeType,
        roots: [`x = ${this.formatNumber(x)}`]
      };
    } else if (delta > 0) {
      const sqrtDelta = Math.sqrt(delta);
      const x1 = (-b + sqrtDelta) / (2 * a);
      const x2 = (-b - sqrtDelta) / (2 * a);
      return {
        type: 'two_real',
        x1,
        x2,
        vertexX,
        vertexY,
        extremeType,
        roots: [
          `x1 = ${this.formatNumber(x1)}`,
          `x2 = ${this.formatNumber(x2)}`
        ]
      };
    } else {
      // Complex roots
      const realPart = -b / (2 * a);
      const imagPart = Math.sqrt(-delta) / (2 * Math.abs(a));
      return {
        type: 'complex',
        realPart,
        imagPart,
        vertexX,
        vertexY,
        extremeType,
        roots: [
          `x1 = ${this.formatNumber(realPart)} + ${this.formatNumber(imagPart)}i`,
          `x2 = ${this.formatNumber(realPart)} - ${this.formatNumber(imagPart)}i`
        ]
      };
    }
  }

  /**
   * Solve Cubic Equation: ax³ + bx² + cx + d = 0
   */
  solveCubic(a, b, c, d) {
    if (a === 0) return this.solveQuadratic(b, c, d);

    // Normalize: x³ + Ax² + Bx + C = 0
    const A = b / a;
    const B = c / a;
    const C = d / a;

    // Substitute x = t - A/3 -> t³ + pt + q = 0
    const p = B - (A * A) / 3;
    const q = (2 * A * A * A) / 27 - (A * B) / 3 + C;
    const discriminant = (q * q) / 4 + (p * p * p) / 27;

    const shift = A / 3;
    const roots = [];

    if (Math.abs(discriminant) < 1e-11) {
      if (Math.abs(p) < 1e-11 && Math.abs(q) < 1e-11) {
        roots.push(-shift);
      } else {
        const u = Math.cbrt(-q / 2);
        roots.push(2 * u - shift);
        roots.push(-u - shift);
      }
    } else if (discriminant > 0) {
      const u = Math.cbrt(-q / 2 + Math.sqrt(discriminant));
      const v = Math.cbrt(-q / 2 - Math.sqrt(discriminant));
      roots.push(u + v - shift);
      const real = -(u + v) / 2 - shift;
      const imag = (Math.sqrt(3) / 2) * Math.abs(u - v);
      return {
        type: 'cubic_complex',
        roots: [
          `x1 = ${this.formatNumber(roots[0])}`,
          `x2 = ${this.formatNumber(real)} + ${this.formatNumber(imag)}i`,
          `x3 = ${this.formatNumber(real)} - ${this.formatNumber(imag)}i`
        ]
      };
    } else {
      // 3 real roots
      const r = Math.sqrt(-(p * p * p) / 27);
      const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r))));
      const m = 2 * Math.cbrt(r);

      roots.push(m * Math.cos(phi / 3) - shift);
      roots.push(m * Math.cos((phi + 2 * Math.PI) / 3) - shift);
      roots.push(m * Math.cos((phi + 4 * Math.PI) / 3) - shift);
      roots.sort((x, y) => y - x);
    }

    return {
      type: 'cubic_real',
      roots: roots.map((val, idx) => `x${idx + 1} = ${this.formatNumber(val)}`)
    };
  }

  /**
   * Solve 2x2 System of Linear Equations:
   * a1*x + b1*y = c1
   * a2*x + b2*y = c2
   */
  solveLinear2(a1, b1, c1, a2, b2, c2) {
    const D = a1 * b2 - a2 * b1;
    const Dx = c1 * b2 - c2 * b1;
    const Dy = a1 * c2 - a2 * c1;

    if (Math.abs(D) < 1e-12) {
      if (Math.abs(Dx) < 1e-12 && Math.abs(Dy) < 1e-12) {
        return { type: 'infinite', message: 'Vô số nghiệm' };
      } else {
        return { type: 'none', message: 'Vô nghiệm' };
      }
    }

    const x = Dx / D;
    const y = Dy / D;

    return {
      type: 'unique',
      x,
      y,
      roots: [
        `x = ${this.formatNumber(x)}`,
        `y = ${this.formatNumber(y)}`
      ]
    };
  }

  /**
   * Generate Table of values for f(x)
   */
  generateTable(funcExpr, start, end, step) {
    if (step <= 0 || start > end) throw new Error('Range ERROR');
    const count = Math.floor((end - start) / step) + 1;
    if (count > 50) throw new Error('Range ERROR (Max 50)');

    const rows = [];
    for (let x = start; x <= end + 1e-9; x += step) {
      const cleanX = Number(x.toFixed(6));
      try {
        const evalRes = this.evaluate(funcExpr, { X: cleanX });
        rows.push({
          x: cleanX,
          fx: evalRes.error ? 'ERROR' : evalRes.formatted
        });
      } catch (e) {
        rows.push({ x: cleanX, fx: 'ERROR' });
      }
    }
    return rows;
  }
}

// Export for usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathEngine;
}
