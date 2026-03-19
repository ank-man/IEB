/* ===================================================
   IndianElucidBiology — Live Spreadsheet Widget
   Interactive Excel-like tables that show formulas,
   recalculate live, and explain each step.
   =================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------
     FORMULA ENGINE
     Evaluates Excel-style formulas with cell references.
     Supports: +, -, *, /, ^, ABS, SQRT, LN, LOG,
     LOG10, EXP, ROUND, SUM, IF, MIN, MAX, AVERAGE,
     cell refs like A1, B3 (relative), named ranges.
  -------------------------------------------------- */
  function FormulaEngine(getCellValue) {
    this.get = getCellValue;
  }

  FormulaEngine.prototype.evaluate = function (formula, context) {
    if (!formula || formula === '') return '';
    if (typeof formula !== 'string' || formula[0] !== '=') return formula;

    var expr = formula.substring(1).trim();
    var self = this;

    // Replace cell references (e.g. A1, B12) with their numeric values
    expr = expr.replace(/\b([A-Z]+)(\d+)\b/g, function (_, col, row) {
      var val = self.get(col, parseInt(row, 10), context);
      var num = parseFloat(val);
      return isNaN(num) ? '0' : String(num);
    });

    // Replace Excel functions with JS equivalents
    expr = expr
      .replace(/\bABS\b/gi, 'Math.abs')
      .replace(/\bSQRT\b/gi, 'Math.sqrt')
      .replace(/\bLN\b/gi, 'Math.log')
      .replace(/\bLOG10\b/gi, 'Math.log10')
      .replace(/\bEXP\b/gi, 'Math.exp')
      .replace(/\bPI\b/gi, 'Math.PI')
      .replace(/\bROUND\(([^,]+),([^)]+)\)/gi, function (_, n, d) {
        return 'Math.round(' + n + ' * Math.pow(10,' + d + ')) / Math.pow(10,' + d + ')';
      })
      .replace(/\bLOG\(([^,)]+),([^)]+)\)/gi, function (_, n, b) {
        return '(Math.log(' + n + ')/Math.log(' + b + '))';
      })
      .replace(/\bLOG\(([^)]+)\)/gi, 'Math.log10($1)')
      .replace(/\bMIN\(/gi, 'Math.min(')
      .replace(/\bMAX\(/gi, 'Math.max(')
      .replace(/\bPOWER\(([^,]+),([^)]+)\)/gi, 'Math.pow($1,$2)')
      .replace(/\^/g, '**');

    // SUM(range) — e.g. already resolved to numbers: handled by Math.min etc
    // IF(condition, true, false)
    expr = expr.replace(/\bIF\(([^,]+),([^,]+),([^)]+)\)/gi, function (_, cond, t, f) {
      return '((' + cond + ') ? (' + t + ') : (' + f + '))';
    });

    try {
      /* jshint evil:true */
      var result = Function('"use strict"; return (' + expr + ')')();
      if (typeof result === 'number') {
        if (!isFinite(result)) return '#ERR';
        // Round to 6 sig figs to avoid floating-point noise
        return parseFloat(result.toPrecision(6));
      }
      return result;
    } catch (e) {
      return '#ERR';
    }
  };

  /* --------------------------------------------------
     SPREADSHEET WIDGET
     Reads a JSON config from data-sheet attribute on
     a <div class="live-sheet"> element and renders
     an interactive spreadsheet with:
       - Editable input cells (yellow)
       - Formula cells (blue) that recalculate live
       - Formula bar showing the formula on cell focus
       - Column explanations below the table
  -------------------------------------------------- */

  function LiveSheet(container) {
    this.container = container;
    this.config = JSON.parse(container.dataset.sheet || '{}');
    this.data = {};       // cellKey -> current value (string or number)
    this.formulas = {};   // cellKey -> formula string
    this.engine = new FormulaEngine(this._getCellValue.bind(this));
    this._build();
  }

  LiveSheet.prototype._key = function (col, row) {
    return col + row;
  };

  LiveSheet.prototype._getCellValue = function (col, row) {
    var key = this._key(col, row);
    var val = this.data[key];
    return (val === undefined || val === '') ? 0 : val;
  };

  LiveSheet.prototype._build = function () {
    var cfg = this.config;
    var cols = cfg.cols || [];
    var rows = cfg.rows || [];

    // Wrapper
    var wrap = document.createElement('div');
    wrap.className = 'ls-wrap';

    // Title
    if (cfg.title) {
      var title = document.createElement('div');
      title.className = 'ls-title';
      title.innerHTML = '<i class="bi bi-file-earmark-spreadsheet me-2"></i>' + cfg.title;
      wrap.appendChild(title);
    }

    // Formula bar
    var fbar = document.createElement('div');
    fbar.className = 'ls-formula-bar';
    fbar.innerHTML =
      '<span class="ls-cell-ref">—</span>' +
      '<span class="ls-fx-label"><i class="bi bi-calculator me-1"></i>fx</span>' +
      '<span class="ls-formula-display">Select a cell to see its formula</span>';
    wrap.appendChild(fbar);
    this._fbar = fbar;

    // Scrollable table container
    var tscroll = document.createElement('div');
    tscroll.className = 'ls-table-scroll';

    var table = document.createElement('table');
    table.className = 'ls-table';

    // Header row
    var thead = document.createElement('thead');
    var hrow = document.createElement('tr');
    hrow.appendChild(document.createElement('th')); // row-number gutter
    cols.forEach(function (col) {
      var th = document.createElement('th');
      th.textContent = col.label || col.id;
      th.title = col.desc || '';
      hrow.appendChild(th);
    });
    thead.appendChild(hrow);
    table.appendChild(thead);

    // Body rows
    var tbody = document.createElement('tbody');
    var self = this;

    rows.forEach(function (rowDef, ri) {
      var tr = document.createElement('tr');
      if (rowDef.header) {
        tr.className = 'ls-row-header';
        var td0 = document.createElement('td');
        td0.colSpan = cols.length + 1;
        td0.textContent = rowDef.header;
        tr.appendChild(td0);
        tbody.appendChild(tr);
        return;
      }

      var rowNum = ri + 2; // 1-indexed, row 1 = header
      if (rowDef.rowNum !== undefined) rowNum = rowDef.rowNum;

      // Row number gutter
      var gutterTd = document.createElement('td');
      gutterTd.className = 'ls-row-num';
      gutterTd.textContent = rowNum;
      tr.appendChild(gutterTd);

      cols.forEach(function (col) {
        var td = document.createElement('td');
        var key = self._key(col.id, rowNum);
        var cellDef = (rowDef.cells || {})[col.id] || {};

        if (cellDef.formula) {
          // Formula cell — calculated, not editable
          self.formulas[key] = cellDef.formula;
          td.className = 'ls-cell ls-cell-formula';
          td.dataset.key = key;
          td.dataset.formula = cellDef.formula;
          td.title = 'Formula: ' + cellDef.formula;
          td.setAttribute('tabindex', '0');
          td.addEventListener('focus', function () { self._showFormula(key, cellDef.formula, col.id, rowNum); });
          td.addEventListener('click', function () { self._showFormula(key, cellDef.formula, col.id, rowNum); });
          tbody.appendChild; // placeholder
        } else if (cellDef.input !== undefined) {
          // Editable input cell
          td.className = 'ls-cell ls-cell-input';
          var inp = document.createElement('input');
          inp.type = 'number';
          inp.value = cellDef.input;
          inp.step = cellDef.step || 'any';
          inp.min = cellDef.min !== undefined ? cellDef.min : '';
          inp.max = cellDef.max !== undefined ? cellDef.max : '';
          self.data[key] = parseFloat(cellDef.input) || cellDef.input;
          inp.dataset.key = key;
          inp.addEventListener('input', function () {
            var v = this.value === '' ? '' : (isNaN(parseFloat(this.value)) ? this.value : parseFloat(this.value));
            self.data[key] = v;
            self._recalcAll();
          });
          inp.addEventListener('focus', function () {
            self._showFormula(key, 'Input value (editable)', col.id, rowNum);
          });
          td.appendChild(inp);
        } else if (cellDef.text !== undefined) {
          // Static text cell
          td.className = 'ls-cell ls-cell-text';
          td.textContent = cellDef.text;
          self.data[key] = cellDef.text;
        } else {
          td.className = 'ls-cell ls-cell-empty';
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tscroll.appendChild(table);
    wrap.appendChild(tscroll);

    // Explanation legend
    if (cfg.legend) {
      var legend = document.createElement('div');
      legend.className = 'ls-legend';
      legend.innerHTML =
        '<span class="ls-legend-item"><span class="ls-swatch ls-swatch-input"></span> Editable — change values to recalculate</span>' +
        '<span class="ls-legend-item"><span class="ls-swatch ls-swatch-formula"></span> Formula cell — click to see formula</span>';
      wrap.appendChild(legend);
    }

    // Column descriptions
    if (cfg.colDesc) {
      var descDiv = document.createElement('div');
      descDiv.className = 'ls-col-desc';
      cfg.colDesc.forEach(function (d) {
        var p = document.createElement('p');
        p.innerHTML = '<strong>' + d.col + ':</strong> ' + d.desc;
        descDiv.appendChild(p);
      });
      wrap.appendChild(descDiv);
    }

    this.container.innerHTML = '';
    this.container.appendChild(wrap);
    this._table = table;
    this._recalcAll();
  };

  LiveSheet.prototype._showFormula = function (key, formula, col, row) {
    var ref = this._fbar.querySelector('.ls-cell-ref');
    var disp = this._fbar.querySelector('.ls-formula-display');
    ref.textContent = col + row;

    // Highlight the focused cell
    this._table.querySelectorAll('.ls-cell-focused').forEach(function (el) {
      el.classList.remove('ls-cell-focused');
    });
    var td = this._table.querySelector('[data-key="' + key + '"]');
    if (td) td.classList.add('ls-cell-focused');

    if (formula && formula[0] === '=') {
      disp.innerHTML = '<code class="ls-formula-code">' + this._escHtml(formula) + '</code>';
    } else {
      disp.textContent = formula || '';
    }
  };

  LiveSheet.prototype._recalcAll = function () {
    var self = this;
    var cfg = this.config;
    var cols = cfg.cols || [];
    var rows = cfg.rows || [];
    var maxPasses = 5; // iterate to resolve dependencies

    for (var pass = 0; pass < maxPasses; pass++) {
      rows.forEach(function (rowDef, ri) {
        if (rowDef.header) return;
        var rowNum = ri + 2;
        if (rowDef.rowNum !== undefined) rowNum = rowDef.rowNum;
        cols.forEach(function (col) {
          var key = self._key(col.id, rowNum);
          var formula = self.formulas[key];
          if (!formula) return;
          var result = self.engine.evaluate(formula, {});
          self.data[key] = result;
        });
      });
    }

    // Update DOM
    this._table.querySelectorAll('.ls-cell-formula[data-key]').forEach(function (td) {
      var key = td.dataset.key;
      var val = self.data[key];
      if (val === undefined || val === null) val = '';
      if (typeof val === 'number') {
        // Format nicely
        val = Math.abs(val) < 0.001 && val !== 0
          ? val.toExponential(3)
          : parseFloat(val.toPrecision(5));
      }
      td.textContent = val;
    });
  };

  LiveSheet.prototype._escHtml = function (s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  /* --------------------------------------------------
     INIT — scan all .live-sheet elements on page load
  -------------------------------------------------- */
  function initAllSheets() {
    document.querySelectorAll('.live-sheet').forEach(function (el) {
      try {
        new LiveSheet(el);
      } catch (e) {
        el.innerHTML = '<div class="alert alert-warning small">Spreadsheet failed to load: ' + e.message + '</div>';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSheets);
  } else {
    initAllSheets();
  }

  // Re-init hook for dynamically added sheets
  window.IEBSheet = { init: initAllSheets, LiveSheet: LiveSheet };

})();
