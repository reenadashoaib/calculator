/* Percentage, loan, BMI, tip and age calculators. Each runs only on its own page. */
(function () {
  "use strict";

  function $(sel, el) { return (el || document).querySelector(sel); }
  function num(input) {
    var v = String(input.value).trim().replace(",", ".");
    return v === "" ? NaN : Number(v);
  }
  function fmt(v, maxDigits, minDigits) {
    if (!Number.isFinite(v)) return "–";
    return v.toLocaleString(undefined, {
      minimumFractionDigits: minDigits || 0,
      maximumFractionDigits: maxDigits === undefined ? 4 : maxDigits
    });
  }
  function money(v) { return fmt(v, 2, 2); }
  function hint(el, text, isError) {
    if (!el) return;
    el.textContent = text || "";
    el.setAttribute("data-state", isError ? "error" : "");
  }
  function live(form, fn) {
    form.addEventListener("input", fn);
    form.addEventListener("change", fn);
    form.addEventListener("submit", function (e) { e.preventDefault(); fn(); });
    fn();
  }

  // ---------- Percentage ----------
  document.querySelectorAll("[data-pct]").forEach(function (form) {
    var kind = form.getAttribute("data-pct");
    var a = $("[data-a]", form), b = $("[data-b]", form), out = $("[data-out]", form), note = $("[data-note]", form);
    live(form, function () {
      var x = num(a), y = num(b), r = NaN, text = "";
      if (kind === "of") r = x / 100 * y;
      if (kind === "is") {
        if (y === 0) text = "The second number can't be 0.";
        else r = x / y * 100;
      }
      if (kind === "change") {
        if (x === 0) text = "The starting value can't be 0.";
        else {
          r = (y - x) / Math.abs(x) * 100;
          if (Number.isFinite(r)) text = r > 0 ? "An increase of " + fmt(Math.abs(r), 2) + "%." : r < 0 ? "A decrease of " + fmt(Math.abs(r), 2) + "%." : "No change.";
        }
      }
      out.textContent = Number.isFinite(r) ? fmt(r, kind === "of" ? undefined : 2) + (kind === "of" ? "" : "%") : "–";
      if (note) hint(note, text, /can't/.test(text));
    });
  });

  // ---------- Loan ----------
  var loan = $("[data-tool=loan]");
  if (loan) {
    live(loan, function () {
      var P = num($("[name=amount]", loan));
      var rate = num($("[name=rate]", loan));
      var years = num($("[name=years]", loan));
      var note = $("[data-note]", loan);
      var body = $("[data-schedule]");
      var outs = { pay: $("[data-out=pay]", loan), interest: $("[data-out=interest]", loan), total: $("[data-out=total]", loan) };
      function clear(msg) {
        outs.pay.textContent = outs.interest.textContent = outs.total.textContent = "–";
        body.innerHTML = "";
        hint(note, msg, true);
      }
      if (!(P > 0)) return clear("Enter a loan amount above 0.");
      if (!(rate >= 0) || rate > 100) return clear("Enter an interest rate between 0 and 100.");
      if (!(years > 0) || years > 50) return clear("Enter a term between 1 and 50 years.");

      var n = Math.round(years * 12);
      var r = rate / 100 / 12;
      var pay = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      outs.pay.textContent = money(pay);
      outs.total.textContent = money(pay * n);
      outs.interest.textContent = money(pay * n - P);
      hint(note, n + " monthly payments.");

      var balance = P, rows = "", yInt = 0, yPrin = 0;
      for (var m = 1; m <= n; m++) {
        var interest = balance * r;
        var principal = Math.min(pay - interest, balance);
        balance -= principal;
        yInt += interest;
        yPrin += principal;
        if (m % 12 === 0 || m === n) {
          rows += "<tr><td>" + Math.ceil(m / 12) + "</td><td class=\"num\">" + money(yPrin) + "</td><td class=\"num\">" +
            money(yInt) + "</td><td class=\"num\">" + money(Math.max(balance, 0)) + "</td></tr>";
          yInt = yPrin = 0;
        }
      }
      body.innerHTML = rows;
    });
  }

  // ---------- BMI ----------
  var bmi = $("[data-tool=bmi]");
  if (bmi) {
    var metricFields = $("[data-units=metric]", bmi);
    var imperialFields = $("[data-units=imperial]", bmi);
    live(bmi, function () {
      var imperial = $("[name=units]:checked", bmi).value === "imperial";
      metricFields.hidden = imperial;
      imperialFields.hidden = !imperial;
      var note = $("[data-note]", bmi);
      var m, kg;
      if (imperial) {
        var ft = num($("[name=ft]", bmi)), inch = num($("[name=in]", bmi)) || 0, lb = num($("[name=lb]", bmi));
        m = ((ft || 0) * 12 + inch) * 0.0254;
        kg = lb * 0.45359237;
      } else {
        m = num($("[name=cm]", bmi)) / 100;
        kg = num($("[name=kg]", bmi));
      }
      var outBmi = $("[data-out=bmi]", bmi), outCat = $("[data-out=category]", bmi), outRange = $("[data-out=range]", bmi);
      var marker = $("[data-marker]", bmi);
      if (!(m > 0.5 && m < 2.8) || !(kg > 10 && kg < 500)) {
        outBmi.textContent = outCat.textContent = outRange.textContent = "–";
        marker.hidden = true;
        hint(note, "Enter your height and weight to see your BMI.");
        return;
      }
      var v = kg / (m * m);
      var cat = v < 18.5 ? "Underweight" : v < 25 ? "Healthy weight" : v < 30 ? "Overweight" : "Obesity";
      outBmi.textContent = fmt(v, 1);
      outCat.textContent = cat;
      var lo = 18.5 * m * m, hi = 24.9 * m * m;
      outRange.textContent = imperial
        ? fmt(lo / 0.45359237, 0) + "–" + fmt(hi / 0.45359237, 0) + " lb"
        : fmt(lo, 1) + "–" + fmt(hi, 1) + " kg";
      // Scale runs from BMI 0 to 40.
      marker.hidden = false;
      marker.style.left = Math.min(Math.max(v, 0), 40) / 40 * 100 + "%";
      hint(note, "Healthy weight range is for your height, using BMI 18.5 to 24.9.");
    });
  }

  // ---------- Tip ----------
  var tip = $("[data-tool=tip]");
  if (tip) {
    var custom = $("[name=custom]", tip);
    custom.addEventListener("focus", function () { $("[name=pct][value=custom]", tip).checked = true; });
    live(tip, function () {
      var bill = num($("[name=bill]", tip));
      var choice = $("[name=pct]:checked", tip).value;
      var pct = choice === "custom" ? num(custom) : Number(choice);
      var people = Math.floor(num($("[name=people]", tip)));
      var note = $("[data-note]", tip);
      var outs = ["tip", "total", "each-tip", "each"].map(function (k) { return $("[data-out=" + k + "]", tip); });
      function clear(msg) { outs.forEach(function (o) { o.textContent = "–"; }); hint(note, msg, true); }
      if (!(bill > 0)) return clear("Enter the bill amount.");
      if (!(pct >= 0) || pct > 100) return clear("Enter a tip between 0 and 100%.");
      if (!(people >= 1)) return clear("Enter at least 1 person.");
      var t = bill * pct / 100;
      outs[0].textContent = money(t);
      outs[1].textContent = money(bill + t);
      outs[2].textContent = money(t / people);
      outs[3].textContent = money((bill + t) / people);
      hint(note, people > 1 ? "Split " + people + " ways." : "");
    });
  }

  // ---------- Age ----------
  var age = $("[data-tool=age]");
  if (age) {
    var onInput = $("[name=on]", age);
    var today = new Date();
    function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
    if (!onInput.value) onInput.value = iso(today);
    function parse(v) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
      return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
    }
    function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // m is 1-12
    function utc(p) { return Date.UTC(p.y, p.m - 1, p.d); }
    live(age, function () {
      var from = parse($("[name=born]", age).value), to = parse(onInput.value);
      var note = $("[data-note]", age);
      var outs = { age: $("[data-out=age]", age), months: $("[data-out=months]", age), days: $("[data-out=days]", age), next: $("[data-out=next]", age) };
      function clear(msg, err) { Object.keys(outs).forEach(function (k) { outs[k].textContent = "–"; }); hint(note, msg, err); }
      if (!from || !to) return clear("Enter a date of birth.");
      if (utc(from) > utc(to)) return clear("The date of birth must be on or before the other date.", true);

      var y = to.y - from.y, mo = to.m - from.m, d = to.d - from.d;
      if (d < 0) {
        mo -= 1;
        var pm = to.m === 1 ? 12 : to.m - 1, py = to.m === 1 ? to.y - 1 : to.y;
        d += daysIn(py, pm);
      }
      if (mo < 0) { y -= 1; mo += 12; }
      outs.age.textContent = y + (y === 1 ? " year" : " years") + ", " + mo + (mo === 1 ? " month" : " months") + ", " + d + (d === 1 ? " day" : " days");
      var totalDays = Math.round((utc(to) - utc(from)) / 864e5);
      outs.months.textContent = fmt(y * 12 + mo, 0);
      outs.days.textContent = fmt(totalDays, 0);

      // Next birthday; 29 February birthdays fall on 28 February in other years.
      function bday(year) { return Date.UTC(year, from.m - 1, Math.min(from.d, daysIn(year, from.m))); }
      var next = bday(to.y);
      if (next < utc(to)) next = bday(to.y + 1);
      var until = Math.round((next - utc(to)) / 864e5);
      var weekday = new Date(next).toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
      outs.next.textContent = until === 0 ? "Today" : until + (until === 1 ? " day" : " days");
      hint(note, until === 0 ? "Happy birthday." : "Next birthday is on a " + weekday + ".");
    });
  }
})();
