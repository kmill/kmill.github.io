// rref.js

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

function show_matrix(mat) {
  var $mat = Q.table().addClass("matrix");
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

function row(i) {
  var $span = Q.span("R");
  var $sub = Q.create("sub").appendTo($span);
  $sub.append(''+(i+1));
  return $span;
}

function record_swap(i, j) {
  var $p = Q.p(row(i), " \u2194 ", row(j));
  Q("#output").append($p);
}
function record_scale(i, c) {
  var $p = Q.p("("+c.toString() +")", row(i), " \u2192 ", row(i));
  Q("#output").append($p);
}
function record_replace(i, j, c) {
  var $p = Q.p(row(i), " + (" + c.toString() + ")", row(j), " \u2192 ", row(i));
  Q("#output").append($p);
}

function rref(mat) {
  var rows = mat.length,
      cols = mat[0].length;

  function swap(i, j) {
    // R_i <-> R_j
    record_swap(i, j);
    for (var k = 0; k < cols; k++) {
      var c = mat[i][k];
      mat[i][k] = mat[j][k];
      mat[j][k] = c;
    }
    Q("#output").append(show_matrix(mat));
  }
  function scale(i, c) {
    // c * R_i -> R_i
    record_scale(i, c);
    for (var k = 0; k < cols; k++) {
      mat[i][k] = bignum.prod(mat[i][k], c);
    }
    Q("#output").append(show_matrix(mat));
  }
  function replace(i, j, c) {
    // R_i + c * R_j -> R_i
    record_replace(i, j, c);
    for (var k = 0; k < cols; k++) {
      mat[i][k] = bignum.sum(mat[i][k],
                             bignum.prod(c, mat[j][k]));
    }
    Q("#output").append(show_matrix(mat));
  }
  function is_zero(i) {
    for (var k = 0; k < cols; k++) {
      if (bignum.compare(0, mat[i][k]) !== 0) {
        return false;
      }
    }
    return true;
  }

  var i = 0, j = 0;
  var last_nz = rows-1;
  while (is_zero(last_nz)) {
    last_nz--;
  }
  while (i < rows && j < cols) {
    if (is_zero(i)) {
      if (i >= last_nz) {
        break;
      }
      swap(i, last_nz);
      last_nz--;
    }
    if (bignum.compare(mat[i][j], 0) === 0) {
      for (var k = i + 1; k <= last_nz; k++) {
        if (bignum.compare(mat[k][j], 0) !== 0) {
          swap(i, k);
          break;
        }
      }
    }
    if (bignum.compare(mat[i][j], 0) === 0) {
      j++;
      continue;
    }
    if (bignum.compare(mat[i][j], 1) !== 0) {
      scale(i, bignum.recip(mat[i][j]));
    }
    for (var k = i + 1; k <= last_nz; k++) {
      if (bignum.compare(mat[k][j], 0) !== 0) {
        replace(k, i, bignum.negate(mat[k][j]));
      }
    }
    i++;
    j++;
  }
  for (i = last_nz; i >= 0; i--) {
    for (j = 0; j < cols; j++) {
      if (bignum.compare(mat[i][j], 0) !== 0) {
        // in fact, the entry is 1
        for (var k = i - 1; k >= 0; k--) {
          if (bignum.compare(mat[k][j], 0) !== 0) {
            replace(k, i, bignum.negate(mat[k][j]));
          }
        }
        break;
      }
    }
  }
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
      $output.append(show_matrix(mat));
      rref(mat);
    } catch (x) {
      Q("#error").append(x.toString());
    }
  });
});
