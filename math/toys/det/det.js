// det.js

"use strict";

function tokenize(text) {
  var i = 0;
  var tokens = [];
  while (i < text.length) {
    var c = text.charCodeAt(i);
    if (c <= 32) {
      i++;
    } else if (text[i] === '{') {
      i++;
      tokens.push('{');
    } else if (text[i] === '}') {
      i++;
      tokens.push('}');
    } else if (text[i] === ',') {
      i++;
      tokens.push(',');
    } else if (48 <= c && c <= 57 || c == 43 || c == 45) {
      var s = text[i++];
      while (i < text.length) {
        c = text.charCodeAt(i);
        if (47 <= c && c <= 57) {
          s += text[i++];
        } else {
          break;
        }
      }
      tokens.push(bignum.Q.fromString(s));
    } else {
      throw new Error("Unexpected character " + text[i]);
    }
  }
  return tokens;
}

function parse(text) {
  var toks = tokenize(text);
  var i = 0;
  function parse_matrix() {
    if (toks[i] === '{') {
      i++;
      var rows = [];
      if (toks[i] !== '}') {
        rows.push(parse_row());
      }
      while (toks[i] === ',') {
        i++;
        rows.push(parse_row());
      }
      if (toks[i] != '}') {
        throw new Error("Expecting '}' for end of matrix.");
      }
      i++;
      return rows;
    } else {
      throw new Error("Expecting '{' for start of matrix.");
    }
  }
  function parse_row() {
    if (toks[i] !== '{') {
      throw new Error("Expecting '{' for start of row");
    }
    i++;
    var row = [];
    if (toks[i] instanceof bignum.Q) {
      row.push(toks[i]);
      i++;
    } else {
      throw new Error("Expecting number");
    }
    while (toks[i] === ',') {
      i++;
      if (toks[i] instanceof bignum.Q) {
        row.push(toks[i]);
        i++;
      } else {
        throw new Error("Expecting number");
      }
    }
    if (toks[i] !== '}') {
      throw new Error("Expecting '}' or ','");
    }
    i++;
    return row;
  }
  return parse_matrix();
}

function show_matrix(mat, det) {
  var $mat = Q.table().addClass(det ? "det" : "matrix");
  for (var i = 0; i < mat.length; i++) {
    var row = mat[i];
    var $row = Q.tr().appendTo($mat);
    for (var j = 0; j < row.length; j++) {
      var $cell = Q.td().appendTo($row);
      $cell.append(row[j].toString());
    }
  }
  return $mat;
}

function minor(mat, i, j) {
  // drop row i, column j
  var rows = [];
  for (var a = 0; a < mat.length; a++) {
    if (a === i) continue;
    var row = [];
    rows.push(row);
    for (var b = 0; b < mat.length; b++) {
      if (b === j) continue;
      row.push(mat[a][b]);
    }
  }
  return rows;
}

function Subproblem(mat) {
  this.mat = mat;
}
Subproblem.prototype.elt = function () {
  return show_matrix(this.mat, true);
};
Subproblem.prototype.expand = function (d) {
  if (d[0] === 'row') {
    var subps = [];
    var i = d[1];
    for (var j = 0; j < this.mat.length; j++) {
      var c = this.mat[i][j];
      if ((i + j) % 2 === 1) {
        c = bignum.negate(c);
      }
      subps.push([c, new Subproblem(minor(this.mat, i, j))]);
    }
    return new Expansion(bignum.Q.fromNum(0), subps);
  } else {
    var subps = [];
    var j = d[1];
    for (var i = 0; i < this.mat.length; i++) {
      var c = this.mat[i][j];
      if ((i + j) % 2 === 1) {
        c = bignum.negate(c);
      }
      subps.push([c, new Subproblem(minor(this.mat, i, j))]);
    }
    return new Expansion(bignum.Q.fromNum(0), subps);
  }
};
Subproblem.prototype.simplify = function () {
  if (this.mat.length === 1) {
    return new Expansion(this.mat[0][0], []);
  } else {
    return this;
  }
};
Subproblem.prototype.expansions = function () {
  var exps = [];
  for (var i = 0; i < this.mat.length; i++) {
    exps.push(["row", i]);
  }
  for (var j = 0; j < this.mat.length; j++) {
    exps.push(["col", j]);
  }
  return exps;
};

function Expansion(c, subps) {
  // c is bignum.Q
  // subps is array of [bignum.Q, Expansion or Subproblem]
  this.c = c;
  this.subps = subps;
}
Expansion.prototype.expansions = function () {
  var exps = [];
  for (var i = 0; i < this.subps.length; i++) {
    this.subps[i][1].expansions().forEach(function (exp) {
      exps.push([i, exp]);
    });
  }
  return exps;
};
Expansion.prototype.elt = function () {
  var $line = Q.span();
  var didplus = false;
  function plus(s) {
    if (didplus) {
      $line.append(" "+s+" ");
    } else if (s === '-') {
      $line.append('-');
    }
    didplus = true;
  }
  function show_subp(s) {
    if (s instanceof Subproblem) {
      $line.append(s.elt());
    } else if (s instanceof Expansion) {
      $line.append("(");
      $line.append(s.elt());
      $line.append(")");
    } else throw new Error();
  }
  if (bignum.compare(this.c, 0) > 0 || this.subps.length === 0) {
    plus('+');
    $line.append(this.c.toString());
  } else if (bignum.compare(this.c, 0) < 0) {
    plus('-');
    $line.append(bignum.negate(this.c).toString());
  }
  for (var i = 0; i < this.subps.length; i++) {
    var subp = this.subps[i];
    if (bignum.compare(subp[0], 1) === 0) {
      plus('+');
      show_subp(subp[1]);
    } else if (bignum.compare(subp[0], -1) === 0) {
      plus('-');
      show_subp(subp[1]);
    } else if (bignum.compare(subp[0], 0) > 0) {
      plus('+');
      $line.append(subp[0].toString());
      show_subp(subp[1]);
    } else {
      plus('-');
      $line.append(bignum.negate(subp[0]).toString());
      show_subp(subp[1]);
    }
  }
  return $line;
};
Expansion.prototype.expand = function (d) {
  var newps = [];
  for (var i = 0; i < this.subps.length; i++) {
    var p = this.subps[i];
    if (i === d[0]) {
      newps.push([p[0], p[1].expand(d[1])]);
    } else {
      newps.push(p);
    }
  }
  return new Expansion(this.c, newps);
};
Expansion.prototype.simplify = function () {
  var c = this.c;
  var changed = false;
  var newps = [];
  for (var i = 0; i < this.subps.length; i++) {
    var np = this.subps[i][1].simplify();
    if (np !== this.subps[i][1]) {
      changed = true;
    }
    if (np instanceof Subproblem) {
      if (bignum.compare(this.subps[i][0], 0) === 0) {
        changed = true;
      } else {
        newps.push([this.subps[i][0], np]);
      }
    } else {
      changed = true;
      c = bignum.sum(c,
                     bignum.prod(this.subps[i][0],
                                 np.c));
      for (var j = 0; j < np.subps.length; j++) {
        var coeff = bignum.prod(this.subps[i][0], np.subps[j][0]);
        if (bignum.compare(coeff, 0) === 0) {
          changed = true;
        } else {
          newps.push([coeff,
                      np.subps[j][1]]);
        }
      }
    }
  }
  if (changed) {
    return new Expansion(c, newps);
  } else {
    return this;
  }
};
Expansion.prototype.describe = function (exp) {
  return this.subps[exp[0]][1].describe(exp[1]) + " of matrix " + (1+exp[0]);
};
Subproblem.prototype.describe = function (exp) {
  return exp[0] + " " + (1+exp[1]);
};

function run_det($output, sp) {
  do {
    $output.append(Q.div("= ", sp.elt()));
    var oldsp = sp;
    sp = sp.simplify();
  } while (sp !== oldsp);
  var exps = sp.expansions();
  var $actions = Q.div().addClass("actions").appendTo($output);
  exps.forEach(function (exp) {
    var $button = Q.create("input").prop("type", "button");
    $button.prop("value", sp.describe(exp));
    $actions.append($button);
    $button.on("click", function () {
      $actions.empty().append(sp.describe(exp));
      run_det($output, sp.expand(exp));
    });
  });
}

Q(function () {
  Q("#compute").on("click", function () {
    Q("#error").empty();
    Q("#output").empty();
    var text = Q("#matrix").value();
    try {
      var mat = parse(text);
      if (mat.length === 0) {
        throw new Error("Expecting at least one row");
      }
      for (var i = 1; i < mat.length; i++) {
        if (mat[0].length !== mat[i].length) {
          throw new Error("Rows are different lengths");
        }
      }
      var $output = Q("#output").empty();
      $output.append(Q.div(show_matrix(mat, true)));
      if (mat[0].length !== mat.length) {
        throw new Error("Matrix must be square");
      }
      run_det($output, new Subproblem(mat));
    } catch (x) {
      Q("#error").append(x.toString());
      throw x;
    }
  });
});
