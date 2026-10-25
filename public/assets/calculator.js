/* Basic + scientific calculator with a paper-tape history. */
(function () {
  "use strict";

  var root = document.querySelector("[data-calc]");
  if (!root) return;

  var exprEl = root.querySelector("[data-expr]");
  var resultEl = root.querySelector("[data-result]");
  var angleBtn = root.querySelector("[data-angle]");
  var tapeList = document.querySelector("[data-tape]");
  var tapeEmpty = document.querySelector("[data-tape-empty]");
  var tapeClear = document.querySelector("[data-tape-clear]");

  var FUNCS = { sin: 1, cos: 1, tan: 1, ln: 1, log: 1, sqrt: 1 };
  var OPS = { "+": 1, "-": 1, "*": 1, "/": 1, "^": 1 };
  var SHOW = { "*": "×", "/": "÷", "-": "−", neg: "−", pi: "π", sqrt: "√" };

  var tokens = [];
  var justEvaluated = false;
  var lastAnswer = 0;
  var angle = "deg";
  var tape = [];

  function CalcError(message) { this.message = message; }

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* storage blocked */ }
    return null;
  }

  // ---------- Tokens ----------

  function isNum(t) { return typeof t === "string" && /^(\d+\.?\d*|\.\d*)(e[+-]?\d+)?$/.test(t); }
  function last() { return tokens[tokens.length - 1]; }
  function endsValue() {
    var t = last();
    return t !== undefined && (isNum(t) || t === ")" || t === "pi" || t === "e" || t === "%" || t === "!");
  }
  function openParens() {
    var n = 0;
    tokens.forEach(function (t) { if (t === "(") n++; else if (t === ")") n--; });
    return n;
  }
  function freshStart() {
    if (justEvaluated) { tokens = []; justEvaluated = false; }
  }
  function continueFromAnswer() { justEvaluated = false; }

  function pushValue(v) {
    if (endsValue()) tokens.push("*");
    if (v < 0) tokens.push("neg");
    tokens.push(plain(Math.abs(v)));
  }

  function press(k) {
    if (/^\d$/.test(k)) {
      freshStart();
      var t = last();
      if (isNum(t) && t.indexOf("e") === -1) tokens[tokens.length - 1] = t === "0" ? k : t + k;
      else tokens.push(k);
    } else if (k === ".") {
      freshStart();
      var d = last();
      if (isNum(d) && d.indexOf("e") === -1) { if (d.indexOf(".") === -1) tokens[tokens.length - 1] = d + "."; }
      else tokens.push("0.");
    } else if (OPS[k]) {
      continueFromAnswer();
      var p = last();
      if (p === undefined) {
        if (k === "-") tokens.push("neg");
        else tokens.push("0", k);
      } else if (p === "(" || p === "neg") {
        if (k === "-" && p === "(") tokens.push("neg");
      } else if (OPS[p]) {
        if (k === "-" && p !== "-" && p !== "+") tokens.push("neg");
        else tokens[tokens.length - 1] = k;
      } else {
        tokens.push(k);
      }
    } else if (k === "(") {
      freshStart();
      tokens.push("(");
    } else if (k === ")") {
      continueFromAnswer();
      if (openParens() > 0 && endsValue()) tokens.push(")");
    } else if (FUNCS[k]) {
      freshStart();
      tokens.push(k, "(");
    } else if (k === "pi" || k === "e") {
      freshStart();
      tokens.push(k);
    } else if (k === "%" || k === "!") {
      continueFromAnswer();
      if (endsValue()) tokens.push(k);
    } else if (k === "sq") {
      continueFromAnswer();
      if (endsValue()) tokens.push("^", "2");
    } else if (k === "inv") {
      continueFromAnswer();
      if (endsValue()) tokens.push("^", "neg", "1");
    } else if (k === "pow10") {
      freshStart();
      if (endsValue()) tokens.push("*");
      tokens.push("10", "^", "(");
    } else if (k === "ans") {
      freshStart();
      pushValue(lastAnswer);
    } else if (k === "sign") {
      continueFromAnswer();
      toggleSign();
    } else if (k === "back") {
      if (justEvaluated) { tokens = []; justEvaluated = false; }
      else backspace();
    } else if (k === "clear") {
      tokens = [];
      justEvaluated = false;
    } else if (k === "=") {
      equals();
      return;
    }
    render();
  }

  function toggleSign() {
    var i = tokens.length - 1;
    if (i < 0) { tokens.push("neg"); return; }
    if (!isNum(tokens[i]) && tokens[i] !== "pi" && tokens[i] !== "e") return;
    if (tokens[i - 1] === "neg") tokens.splice(i - 1, 1);
    else tokens.splice(i, 0, "neg");
  }

  function backspace() {
    var t = last();
    if (t === undefined) return;
    if (isNum(t) && t.length > 1 && t.indexOf("e") === -1) {
      tokens[tokens.length - 1] = t.slice(0, -1);
      return;
    }
    tokens.pop();
    if (t === "(" && FUNCS[last()]) tokens.pop();
  }

  // ---------- Evaluation (recursive descent, no eval) ----------

  function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) throw new CalcError("Factorial needs a whole number of 0 or more");
    if (n > 170) throw new CalcError("That number is too large to show");
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  function applyFn(name, x) {
    var rad = angle === "deg" ? x * Math.PI / 180 : x;
    var v;
    switch (name) {
      case "sin": v = Math.sin(rad); break;
      case "cos": v = Math.cos(rad); break;
      case "tan":
        if (angle === "deg" && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-9) throw new CalcError("tan is undefined at 90°, 270° and so on");
        v = Math.tan(rad);
        break;
      case "ln":
        if (x <= 0) throw new CalcError("ln needs a number above 0");
        return Math.log(x);
      case "log":
        if (x <= 0) throw new CalcError("log needs a number above 0");
        return Math.log10(x);
      case "sqrt":
        if (x < 0) throw new CalcError("√ needs a number of 0 or more");
        return Math.sqrt(x);
    }
    return Math.abs(v) < 1e-12 ? 0 : v;
  }

  function evaluate(tks) {
    var i = 0;
    function peek() { return tks[i]; }
    function next() { return tks[i++]; }
    function startsFactor(t) { return t !== undefined && (isNum(t) || t === "(" || t === "pi" || t === "e" || FUNCS[t]); }
    function topLevelHasMulDiv(from, to) {
      var depth = 0;
      for (var j = from; j < to; j++) {
        if (tks[j] === "(") depth++;
        else if (tks[j] === ")") depth--;
        else if (depth === 0 && (tks[j] === "*" || tks[j] === "/")) return true;
      }
      return false;
    }

    function parseExpr() {
      var v = parseTerm();
      while (peek() === "+" || peek() === "-") {
        var op = next();
        var start = i;
        var r = parseTerm();
        // "50 + 10%" means 50 plus 10% of 50, like a desk calculator.
        if (tks[i - 1] === "%" && !topLevelHasMulDiv(start, i)) r = v * r;
        v = op === "+" ? v + r : v - r;
      }
      return v;
    }
    function parseTerm() {
      var v = parseUnary();
      for (;;) {
        var t = peek();
        if (t === "*" || t === "/") {
          next();
          var r = parseUnary();
          if (t === "/") {
            if (r === 0) throw new CalcError("Can't divide by zero");
            v /= r;
          } else v *= r;
        } else if (startsFactor(t)) {
          v *= parseUnary(); // implicit multiplication: 2π, 3(4)
        } else break;
      }
      return v;
    }
    function parseUnary() {
      if (peek() === "neg") { next(); return -parseUnary(); }
      return parsePower();
    }
    function parsePower() {
      var b = parsePostfix();
      if (peek() === "^") { next(); return Math.pow(b, parseUnary()); }
      return b;
    }
    function parsePostfix() {
      var v = parsePrimary();
      while (peek() === "%" || peek() === "!") v = next() === "%" ? v / 100 : factorial(v);
      return v;
    }
    function parsePrimary() {
      var t = next();
      if (t === undefined) throw new CalcError("Finish the expression first");
      if (isNum(t)) {
        if (t === "." || t === "0.") return 0;
        return parseFloat(t);
      }
      if (t === "pi") return Math.PI;
      if (t === "e") return Math.E;
      if (t === "(") {
        var v = parseExpr();
        if (peek() === ")") next(); // unclosed brackets close at the end
        return v;
      }
      if (FUNCS[t]) {
        next(); // "("
        var a = parseExpr();
        if (peek() === ")") next();
        return applyFn(t, a);
      }
      throw new CalcError("Finish the expression first");
    }

    if (!tks.length) return 0;
    var result = parseExpr();
    if (i < tks.length) throw new CalcError("Finish the expression first");
    if (Number.isNaN(result)) throw new CalcError("That result isn't a real number");
    if (!Number.isFinite(result)) throw new CalcError("That number is too large to show");
    return parseFloat(result.toPrecision(12));
  }

  // ---------- Formatting ----------

  function plain(v) {
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e15 || a < 1e-9)) return v.toExponential().replace("e+", "e");
    return String(v);
  }
  function pretty(v) {
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e15 || a < 1e-9)) {
      return v.toExponential(8).replace(/\.?0+e/, "e").replace("e+", "e").replace("-", "−");
    }
    return v.toLocaleString("en-US", { maximumFractionDigits: 10 }).replace("-", "−");
  }
  function exprText(tks) {
    var out = "";
    tks.forEach(function (t) {
      var shown = SHOW[t] || t;
      if (isNum(t) && t.indexOf("e") === -1) {
        var parts = t.split(".");
        shown = Number(parts[0]).toLocaleString("en-US") + (parts.length > 1 ? "." + parts[1] : "");
      }
      if (t === "+" || t === "-" || t === "*" || t === "/") shown = " " + shown + " ";
      out += shown;
    });
    var missing = openParens();
    for (var j = 0; j < missing; j++) out += ")";
    return out;
  }

  function setResult(text, state) {
    resultEl.textContent = text;
    resultEl.setAttribute("data-state", state);
    var len = text.length;
    resultEl.setAttribute("data-size", state === "error" ? "" : len > 16 ? "s" : len > 11 ? "m" : "");
  }

  function render() {
    exprEl.textContent = exprText(tokens);
    exprEl.scrollLeft = exprEl.scrollWidth;
    if (!tokens.length) { setResult("0", "final"); return; }
    if (justEvaluated) return;
    if (!endsValue()) { if (tokens.length === 1 && tokens[0] === "neg") setResult("−", "preview"); return; }
    try {
      setResult(pretty(evaluate(tokens)), "preview");
    } catch (e) {
      if (!(e instanceof CalcError)) throw e;
      // Keep the last preview; the error shows on "=".
    }
  }

  function equals() {
    if (!tokens.length) return;
    var text = exprText(tokens);
    try {
      var v = evaluate(tokens);
      lastAnswer = v;
      exprEl.textContent = text + " =";
      setResult(pretty(v), "final");
      addToTape(text, v);
      tokens = [];
      if (v < 0) tokens.push("neg");
      tokens.push(plain(Math.abs(v)));
      justEvaluated = true;
    } catch (e) {
      if (!(e instanceof CalcError)) throw e;
      exprEl.textContent = text;
      setResult(e.message, "error");
    }
  }

  // ---------- Tape ----------

  function renderTape() {
    tapeList.innerHTML = "";
    tape.forEach(function (entry) {
      var li = document.createElement("li");
      li.className = "tape__item";
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", entry.expr + " equals " + pretty(entry.value) + ". Use this number");
      var ex = document.createElement("span");
      ex.className = "tape__expr";
      ex.textContent = entry.expr;
      var val = document.createElement("span");
      val.className = "tape__value";
      val.textContent = pretty(entry.value);
      b.appendChild(ex);
      b.appendChild(val);
      b.addEventListener("click", function () {
        freshStart();
        pushValue(entry.value);
        render();
      });
      li.appendChild(b);
      tapeList.appendChild(li);
    });
    tapeEmpty.hidden = tape.length > 0;
    tapeClear.hidden = tape.length === 0;
  }

  function addToTape(expr, value) {
    tape.unshift({ expr: expr, value: value });
    if (tape.length > 50) tape.length = 50;
    store("calcdesk.tape", JSON.stringify(tape));
    renderTape();
    tapeList.scrollTop = 0;
  }

  tapeClear.addEventListener("click", function () {
    tape = [];
    store("calcdesk.tape", "[]");
    renderTape();
  });

  // ---------- Mode & angle ----------

  function setMode(mode) {
    root.setAttribute("data-mode", mode);
    root.querySelectorAll("[data-mode-btn]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-mode-btn") === mode));
    });
    store("calcdesk.mode", mode);
  }
  function setAngle(a) {
    angle = a;
    angleBtn.textContent = a === "deg" ? "Degrees" : "Radians";
    angleBtn.setAttribute("aria-label", "Angle unit: " + (a === "deg" ? "degrees" : "radians") + ". Switch unit");
    store("calcdesk.angle", a);
    render();
  }

  root.querySelectorAll("[data-mode-btn]").forEach(function (b) {
    b.addEventListener("click", function () { setMode(b.getAttribute("data-mode-btn")); });
  });
  angleBtn.addEventListener("click", function () { setAngle(angle === "deg" ? "rad" : "deg"); });

  // ---------- Input ----------

  root.addEventListener("click", function (e) {
    var key = e.target.closest("[data-k]");
    if (key) press(key.getAttribute("data-k"));
  });

  var KEYMAP = {
    Enter: "=", "=": "=", Backspace: "back", Escape: "clear", Delete: "clear",
    "+": "+", "-": "-", "*": "*", x: "*", X: "*", "/": "/", "^": "^",
    "(": "(", ")": ")", "%": "%", "!": "!", ".": ".", ",": ".", p: "pi"
  };

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var target = e.target;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    var k = /^\d$/.test(e.key) ? e.key : KEYMAP[e.key];
    if (!k) return;
    // Enter on a focused link or button elsewhere on the page keeps its normal job.
    if (e.key === "Enter" && target && /^(A|BUTTON)$/.test(target.tagName) && !root.contains(target)) return;
    e.preventDefault();
    press(k);
    var btn = root.querySelector('[data-k="' + (k === "=" ? "=" : k) + '"]');
    if (btn) {
      btn.setAttribute("data-pressed", "");
      setTimeout(function () { btn.removeAttribute("data-pressed"); }, 90);
    }
  });

  // ---------- Start ----------

  try { tape = JSON.parse(store("calcdesk.tape") || "[]").filter(function (x) { return x && typeof x.value === "number"; }); } catch (e) { tape = []; }
  if (tape.length) lastAnswer = tape[0].value;
  setMode(store("calcdesk.mode") === "sci" ? "sci" : "basic");
  setAngle(store("calcdesk.angle") === "rad" ? "rad" : "deg");
  renderTape();
  render();
})();
