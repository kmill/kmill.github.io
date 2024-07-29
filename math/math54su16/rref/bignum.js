// bignum.js
// Algorithms for dealing with large naturals and integers, rationals, and (computable) reals.

// MIT License
//
// Copyright (c) 2016 Kyle Miller
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var bignum = (function () {
"use strict";

/********* Generic functions ***********/

function num(o) {
  /* Returns a Z, Q, or R. Takes a number, string, natural, Z, Q, or R. */
  if (typeof o === "number") {
    if (~~o === o) {
      return Z.fromNum(o);
    } else {
      return Q.fromNum(o);
    }
  } else if (typeof o === "string") {
    var si = o.indexOf("/");
    if (si === -1) {
      return Z.fromString(o);
    } else {
      return Q.fromString(o);
    }
  } else if (o instanceof N) {
    return new Z(1, o);
  } else if (o instanceof Z || o instanceof Q || o instanceof R) {
    return o;
  } else {
    return Z.create(o);
  }
}

function sum(a, b) {
  a = num(a); b = num(b);
  if (a instanceof Z) {
    if (b instanceof Z) {
      return Z.sum(a, b);
    } else if (b instanceof Q) {
      return Q.sum(Q.create(a), b);
    } else if (b instanceof R) {
      return R.sum(R.create(a), b);
    }
  } else if (a instanceof Q) {
    if (b instanceof Z) {
      return Q.sum(a, Q.create(b));
    } else if (b instanceof Q) {
      return Q.sum(a, b);
    } else if (b instanceof R) {
      return R.sum(R.create(a), b);
    }
  } else if (a instanceof R) {
    if (b instanceof Z || b instanceof Q) {
      return R.sum(a, R.create(b));
    } else if (b instanceof R) {
      return R.sum(a, b);
    }
  }
  throw new Error("Value error in sum");
}
function diff(a, b) {
  a = num(a); b = num(b);
  if (a instanceof Z) {
    if (b instanceof Z) {
      return Z.diff(a, b);
    } else if (b instanceof Q) {
      return Q.diff(Q.create(a), b);
    } else if (b instanceof R) {
      return R.diff(R.create(a), b);
    }
  } else if (a instanceof Q) {
    if (b instanceof Z) {
      return Q.diff(a, Q.create(b));
    } else if (b instanceof Q) {
      return Q.diff(a, b);
    } else if (b instanceof R) {
      return R.diff(R.create(a), b);
    }
  } else if (a instanceof R) {
    if (b instanceof Z || b instanceof Q) {
      return R.diff(a, R.create(b));
    } else if (b instanceof R) {
      return R.diff(a, b);
    }
  }
  throw new Error("Value error in diff");
}
function negate(a) {
  a = num(a);
  if (a instanceof Z) {
    return Z.negate(a);
  } else if (a instanceof Q) {
    return Q.negate(a);
  } else if (a instanceof R) {
    return R.negate(a);
  }
  throw new Error("Value error in negate");
}
function abs(a) {
  a = num(a);
  if (a instanceof Z) {
    return Z.abs(a);
  } else if (a instanceof Q) {
    return Q.abs(a);
  } else if (a instanceof R) {
    return R.abs(a);
  }
  throw new Error("Value error in abs");
}
function prod(a, b) {
  a = num(a); b = num(b);
  if (a instanceof Z) {
    if (b instanceof Z) {
      return Z.prod(a, b);
    } else if (b instanceof Q) {
      return Q.prod(Q.create(a), b);
    } else if (b instanceof R) {
      return R.prod(R.create(a), b);
    }
  } else if (a instanceof Q) {
    if (b instanceof Z) {
      return Q.prod(a, Q.create(b));
    } else if (b instanceof Q) {
      return Q.prod(a, b);
    } else if (b instanceof R) {
      return R.prod(R.create(a), b);
    }
  } else if (a instanceof R) {
    if (b instanceof Z || b instanceof Q) {
      return R.prod(a, R.create(b));
    } else if (b instanceof R) {
      return R.prod(a, b);
    }
  }
  throw new Error("Value error in prod");
}
function divMod(a, b) {
  a = num(a); b = num(b);
  if (a instanceof Z) {
    if (b instanceof Z) {
      return Z.divMod(a, b);
    }
  }
  throw new Error("Value error in divMod");
}
function quot(a, b) {
  a = num(a); b = num(b);
  if (a instanceof Z) {
    if (b instanceof Z) {
      return Q.quot(Q.create(a), Q.create(b));
    } else if (b instanceof Q) {
      return Q.quot(Q.create(a), b);
    } else if (b instanceof R) {
      return R.quot(R.create(a), b);
    }
  } else if (a instanceof Q) {
    if (b instanceof Z) {
      return Q.quot(a, Q.create(b));
    } else if (b instanceof Q) {
      return Q.quot(a, b);
    } else if (b instanceof R) {
      return R.quot(R.create(a), b);
    }
  } else if (a instanceof R) {
    if (b instanceof Z || b instanceof Q) {
      return R.quot(R.create(a), b);
    } else if (b instanceof R) {
      return R.quot(a, b);
    }
  }
  throw new Error("Value error in div");
}
function recip(a) {
  a = num(a);
  if (a instanceof Z) {
    return Q.recip(Q.create(a));
  } else if (a instanceof Q) {
    return Q.recip(a);
  } else if (a instanceof R) {
    return R.recip(a);
  }
  throw new Error("Value error in recip");
}
function gcd(a, b) {
  a = num(a); b = num(b);
  if (a instanceof Z) {
    if (b instanceof Z) {
      return Z.gcd(a, b);
    }
  }
  throw new Error("Value error in prod");
}
function ipow(a, n) {
  a = num(a);
  if (a instanceof Z) {
    if (n < 0) {
      return Q.ipow(Q.create(a), n);
    } else {
      return Z.ipow(a, n);
    }
  } else if (a instanceof Q) {
    return Q.ipow(a, n);
  }
  throw new Error("Value error in ipow");
}
function factorial(a) {
  a = num(a);
  if (a instanceof Z) {
    return Z.factorial(a);
  }
  throw new Error("Value error in factorial");
}

function compare(a, b) {
  a = num(a); b = num(b);
  if (a instanceof Z) {
    if (b instanceof Z) {
      return Z.compare(a, b);
    } else if (b instanceof Q) {
      return Q.compare(Q.create(a), b);
    }
  } else if (a instanceof Q) {
    if (b instanceof Z) {
      return Q.compare(a, Q.create(b));
    } else if (b instanceof Q) {
      return Q.compare(a, b);
    }
  }
  console.log(a, b);
  throw new Error("Value error in compare");
}


/********* Numbers *********************/

// Modifiable number buffers.  These store numbers in base 2^16 as
// Uint16Arrays.  The least-significant digit is in the zeroth entry.
var Nbuf = {
  DIGS : "0123456789abcdefghijklmnopqrstuvwxyz",
  fromString : function (s, base) {
    /* Reads a string in a particular base, returning a number buffer
       representing the number.  Defaults to base 10.*/
    if (base === void 0) base = 10;
    var digs = [];
    for (var i = 0; i < s.length; i++) {
      var r = Nbuf.DIGS.indexOf(s[i]);
      if (r === -1) throw new Error("Bad numeric string");
      if (r >= base) throw new Error("Character not in base");
      for (var j = 0; j < digs.length; j++) {
        var v = digs[j] * base + r;
        digs[j] = v & 0xFFFF;
        r = v >>> 16;
      }
      if (r > 0) {
        digs[j] = r;
      }
    }
    return new Uint16Array(digs);
  },
  fromNum : function (n) {
    /* Returns a number buffer representing the given 32-bit unsigned
       integer. */
    var digs = [];
    while (n > 0) {
      digs.push(n & 0xFFFF);
      n = n >>> 16;
    }
    return new Uint16Array(digs);
  },
  create : function (len) {
    /* Returns a new number buffer of a given size, initialized to zero. */
    return new Uint16Array(len);
  },
  toString : function (n, base) {
    /* Returns a string representation of the number, in the given
       base. Defaults to base 10.*/
    if (base === void 0) base = 10;
    var tdigs = [];
    var ndigs = new Uint16Array(n);
    var lnz = ndigs.length - 1; // last non-zero
    while (lnz >= 0) {
      var r = 0;
      for (; lnz >= 0 && ndigs[lnz] === 0; lnz--) {}
      for (var i = lnz; i >= 0; i--) {
        r = ndigs[i] + (r << 16);
        ndigs[i] = 0|(r / base);
        r = r % base;
      }
      tdigs.push(Nbuf.DIGS[r % base]);
    }
    tdigs.pop();
    if (tdigs.length === 0) { tdigs.push('0'); }
    tdigs.reverse(); // tdigs.push("L");
    return tdigs.join('');
  },
  add : function (dest, n, i, len, dlen) {
    /* Computes dest[i:dlen] += n[0:len].  Returns carry. */
    var c = 0;
    for (var j = 0; j < len && i < dlen; j++, i++) {
      c += dest[i] + n[j];
      dest[i] = c & 0xFFFF;
      c = c >>> 16;
    }
    for (; i < dlen && c != 0; i++) {
      c += dest[i];
      dest[i] = c & 0xFFFF;
      c = c >>> 16;
    }
    return c;
  },
  sub : function (dest, n, i, len) {
    /* Computes dest[i:] -= n[0:len]. Returns borrow. */
    var c = 1;
    for (var j = 0; j < len && i < dest.length; j++, i++) {
      c += dest[i] + 0xFFFF - n[j];
      dest[i] = c & 0xFFFF;
      c = c >>> 16;
    }
    for (; c != 1 && i < dest.length; i++) {
      c += dest[i] + 0xFFFF;
      dest[i] = c & 0xFFFF;
      c = c >>> 16;
    }
    return c-1;
  },
  copy : function (dest, n, i, len) {
    /* dest[i:i+len] <- n[0:len] */
    for (var j = 0; j < len; j++, i++) {
      dest[i] = n[j];
    }
  },
  smallprod : function (dest, n, m, i, len) {
    /* dest[i:i+len] += n[0:len] * m, where m is a small multiplier (< 65536).
     Returns carry. */
    var c = 0;
    for (var j = 0; j < len && i < dest.length; j++, i++) {
      var p = dest[i] + n[j] * m + c;
      dest[i] = p & 0xFFFF;
      c = p >>> 16;
    }
    for (; i < dest.length; i++) {
      c += dest[i];
      dest[i] = c & 0xFFFF;
      c = c >>> 16;
    }
    return c;
  },
  smallprodsub : function (dest, n, m, i, len, dlen) {
    /* dest[i:dlen] -= n[0:len] * m, where m is a small multiplier (< 65536).
     Returns borrow. */
    var c = 0;
    for (var j = 0; j < len && i < dlen; j++, i++) {
      var p = n[j] * m;
      var low = p & 0xFFFF, high = p >>> 16;
      var d = dest[i] - low - c;
      dest[i] = d;
      c = high - (d >> 16);
    }
    for (; c != 0 && i < dlen; i++) {
      var d = dest[i] - c;
      dest[i] = d;
      c = -(d >> 16);
    }
    return c;
  },
  smalldiv : function (dest, n, d, len) {
    /* dest[0:len] = n[0:len] / d, where d is some small divisor (< 65536).
     Returns remainder. */
    var r = 0;
    for (var i = len - 1; i >= 0; i--) {
      r = n[i] + ((r << 16) >>> 0);
      dest[i] = 0|(r / d);
      r = r % d;
    }
    return r;
  }
};

function N(digs) {
  /* Creates a natural number.  The argument is a number buffer (a
   Uint16Array, specified in Nbuf). */
  this.digs = digs;
  // Cull leading zeros:
  var len = digs.length;
  while (digs[len-1] === 0) { len--; }
  this.len = len;
}
N.create = function (o) {
  if (typeof o === "string") {
    return N.fromString(o);
  } else if (typeof o === "number") {
    return N.fromNum(o);
  } else if (o instanceof N) {
    return o;
  } else if (o instanceof Uint16Array) {
    return new N(o);
  } else if (o instanceof Array) {
    return new N(new Uint16Array(o));
  } else {
    throw new Error("Value error");
  }
};
N.fromString = function (s, base) {
  return new N(Nbuf.fromString(s, base));
};
N.fromNum = function (i) {
  if (i === (0|i) && i < N.SMALL.length) {
    return N.SMALL[i];
  }
  return new N(Nbuf.fromNum(i));
};
N.SMALL = [];
for (var i = 0; i < 255; i++) {
  N.SMALL[i] = new N(Nbuf.fromNum(i));
}
N.prototype.toString = function (base) {
  return Nbuf.toString(this.digs, base);
};
N.prototype.inspect = function () {
  return "N.create(\"" + Nbuf.toString(this.digs) + "\")";
};
N.prototype.isZero = function () {
  return this.len === 0;
};
N.prototype.isSmall = function () {
  return this.len <= 1;
};
N.prototype.eqSmallNum = function (n) {
  return this.isSmall() && this.digs[0] === n;
};
N.sum = function (n1, n2) {
  var digs = Nbuf.create(Math.max(n1.len, n2.len) + 1);
  Nbuf.copy(digs, n1.digs, 0, n1.len);
  Nbuf.add(digs, n2.digs, 0, n2.len, digs.length);
  return new N(digs);
};
N.diff = function (n1, n2) {
  /* Requires that n2 be no larger than n1, otherwise the difference is undefined. */
  var digs = Nbuf.create(n1.len);
  Nbuf.copy(digs, n1.digs, 0, n1.len);
  var borrow = Nbuf.sub(digs, n2.digs, 0, n2.len);
  if (borrow !== 0) throw new Error("Assertion failed: n1 < n2");
  return new N(digs);
};
N.compare = function (n1, n2) {
  function defaultCompare(a, b) {
    return (a > b) - (a < b);
  }

  if (n1.len < n2.len) {
    return -1;
  } else if (n1.len > n2.len) {
    return 1;
  } else {
    for (var i = n1.len-1; i >= 0; i--) {
      if (n1.digs[i] != n2.digs[i]) {
        return defaultCompare(n1.digs[i], n2.digs[i]);
      }
    }
    return 0;
  }
};
N.smalldiv = function (n, d) {
  /* private. Returns the quotient and remainder (div and mod) of n by a small
  number d (< 65536) */
  var digs = Nbuf.create(n.len);
  var r = Nbuf.smalldiv(digs, n.digs, d, n.len);
  return { div : new N(digs), mod : N.create(r) };
};
N.smallprod = function (n, m) {
  /* private. Returns the product of n by a small number m (< 65536) */
  var digs = Nbuf.create(n.len + 1);
  Nbuf.smallprod(digs, n.digs, m, 0, n.len);
  return new N(digs);
};
N.prod = function (n1, n2) {
  /* Computes n1 * n2.  This can stand to have a better algorithm for
   large inputs. */
  if (n2.isSmall()) return N.smallprod(n1, n2.digs[0]);
  if (n1.isSmall()) return N.smallprod(n2, n1.digs[0]);
  var digs = Nbuf.create(n1.len + n2.len);
  for (var i = 0; i < n2.len; i++) {
    Nbuf.smallprod(digs, n1.digs, n2.digs[i], i, n1.len);
  }
  return new N(digs);
};
N.ipow = function (n, e) {
  /* Computes n^e, where e is a Javascript integer. */
  e = 0|e;
  var r = N.SMALL[1];
  while (e) {
    if (e&1) {
      r = N.prod(r, n);
    }
    n = N.prod(n, n);
    e = e >>> 1;
  }
  return r;
};
N.bigdiv = function (n1, n2) {
  /* private. Computes n1 / n2, returning the quotient and remainder (as div
   and mod). */
  
  // Following Knuth Algorithm D from 4.3.1 of Volume 2.
  var n = n2.len;
  var m = n1.len - n;
  
  var q = new Uint16Array(m + 1);
  
  // D1 Normalization
  function nlz(x) {
    x = 0|x;
    if (x === 0) return 16;
    var n = 0;
    if (x <= 0x00FF) { n = n + 8; x = x << 8; }
    if (x <= 0x0FFF) { n = n + 4; x = x << 4; }
    if (x <= 0x3FFF) { n = n + 2; x = x << 2; }
    if (x <= 0x7FFF) { n = n + 1; x = x << 1; }
    return n;
  }
  var d = 1 << nlz(n2.digs[n - 1]);
  var u, v;
  u = new Uint16Array(m + n + 1);
  if (d != 1) {
    Nbuf.smallprod(u, n1.digs, d, 0, n + m);
    v = new Uint16Array(n);
    Nbuf.smallprod(v, n2.digs, d, 0, n);
  } else {
    Nbuf.copy(u, n1.digs, 0, n + m);
    v = n2.digs;
  }
  
  //console.log("u", u);
  //console.log("v", v);
  
  // D2 Initialize j
  for (var j = m; j >= 0; j--) {
    // D3 Calculate qhat
    var top = ((u[j+n]<<16)>>>0) + u[j+n-1],
        bot = v[n-1];
    var qhat = 0|(top/bot),
        rhat = 0|(top%bot);
    while (true) {
      if (qhat === 0x10000 || qhat * v[n-2] > (((rhat << 16)>>>0) + u[j+n-2])) {
        qhat--;
        rhat += v[n-1];
        if (rhat < 0x10000) continue;
      }
      break;
    }
    // D4 Multiply and subtract
    var c = Nbuf.smallprodsub(u, v, qhat, j, n, j+n+1);
    
    //console.log("d4", j, qhat, c, u);
    
    // D5 Test remainder
    q[j] = qhat;
    
    if (c > 0) {
      // D6 Add back (low probability)
      q[j] -= 1;
      Nbuf.add(u, v, j, n, n+j+1);
    }
    if (u[n+j] != 0) {
      throw new Error("Expecting to have cleared out digit");
    }
    
    // D7 Loop on j
  }
  
  // D8 Unnormalize
  var rem = new Uint16Array(n);
  if (d != 1) {
    Nbuf.smalldiv(rem, u, d, n);
  } else {
    Nbuf.copy(rem, u, 0, n);
  }
  return { div : new N(q), mod : new N(rem) };
};
N.divMod = function (n1, n2) {
  /* Computes n1 / n2, returning the quotient and remainder. */
  if (n2.isZero()) throw new Error("Division by zero");
  var c = N.compare(n1, n2);
  if (c < 0) {
    return { div : N.SMALL[0], mod : n1 };
  } else if (c === 0) {
    return { div : N.SMALL[1], mod : N.SMALL[0] };
  } else /* (c > 0) */ {
    if (n2.isSmall()) return N.smalldiv(n1, n2.digs[0]);
    else return N.bigdiv(n1, n2);
  }
};
N.gcd = function (n1, n2) {
  var tn;
  if (N.compare(n1, n2) < 0) {
    tn = n1;
    n1 = n2;
    n2 = tn;
  }
  while (!n2.isZero()) {
    tn = n2;
    n2 = N.divMod(n1, n2).mod;
    n1 = tn;
  }
  return n1;
};
N.factorial = function (n) {
  n = N.create(n);
  var p = N.SMALL[1];
  while (!n.isZero()) {
    p = N.prod(p, n);
    n = N.diff(n, N.SMALL[1]);
  }
  return p;
};
N.choose = function (n, r) {
  n = N.create(n);
  r = N.create(r);
  var d = N.divMod(N.factorial(n),
                   N.prod(N.factorial(r), N.factorial(N.diff(n, r))));
  if (!d.mod.isZero()) throw new Error("Assertion failed: mod != 0");
  return d.div;
};

function Z(sign, n) {
  /* Creates an integer.  sign is either 1 or -1, and n is an N. */
  this.sign = n.isZero() ? 1 : sign;
  this.n = n;
}
Z.fromString = function (s) {
  var sign = 1;
  if (s[0] === '+') {
    s = s.slice(1);
  } else if (s[0] === '-') {
    s = s.slice(1);
    sign = -1;
  }
  return new Z(sign, N.fromString(s));
};
Z.fromNum = function (n) {
  return new Z(n >= 0 ? 1 : -1, N.fromNum(Math.abs(n)));
};
Z.create = function (o) {
    if (typeof o === "string") {
    return Z.fromString(o);
  } else if (typeof o === "number") {
    return Z.fromNum(o);
  } else if (o instanceof N) {
    return new Z(1, o);
  } else if (o instanceof Z) {
    return o;
  } else {
    throw new Error("Value error");
  }
};
Z.prototype.toString = function (base) {
  if (this.sign > 0) {
    return this.n.toString(base);
  } else {
    return '-' + this.n.toString(base);
  }
};
Z.prototype.toPrecision = function (digs) {
  if (digs === void 0) digs = 16;
  var s = this.n.toString();
  var exp = s.length - 1;
  s = s.slice(0, digs);
  return (this.sign > 0 ? "" : "-") + s[0] + "." + s.slice(1) + (exp > 0 ? "e+" + exp : "");
};
Z.prototype.inspect = function () {
  return "Z.create(\"" + this.toString() + "\")";
};
Z.prototype.isZero = function () {
  return this.n.isZero();
};
Z.prototype.eqSmallNum = function (n) {
  if (n >= 0) {
    return this.sign > 0 && this.n.eqSmallNum(n);
  } else {
    return this.sign < 0 && this.n.eqSmallNum(-n);
  }
};
Z.compare = function (z1, z2) {
  if (z1.sign < z2.sign) {
    return -1;
  } else if (z1.sign > z2.sign) {
    return 1;
  } else {
    return z1.sign * N.compare(z1.n, z2.n);
  }
};
Z.sum = function (z1, z2) {
  z1 = Z.create(z1); z2 = Z.create(z2);
  if (z1.sign === z2.sign) {
    return new Z(z1.sign, N.sum(z1.n, z2.n));
  } else {
    var c = N.compare(z1.n, z2.n);
    if (c > 0) {
      return new Z(z1.sign, N.diff(z1.n, z2.n));
    } else if (c < 0) {
      return new Z(z2.sign, N.diff(z2.n, z1.n));
    } else {
      return new Z(1, N.SMALL[0]);
    }
  }
};
Z.diff = function (z1, z2) {
  z1 = Z.create(z1); z2 = Z.create(z2);
  if (z1.sign !== z2.sign) {
    return new Z(z1.sign, N.sum(z1.n, z2.n));
  } else {
    var c = N.compare(z1.n, z2.n);
    if (c > 0) {
      return new Z(z1.sign, N.diff(z1.n, z2.n));
    } else if (c < 0) {
      return new Z(-z1.sign, N.diff(z2.n, z1.n));
    } else {
      return new Z(1, N.SMALL[0]);
    }
  }
};
Z.prod = function (z1, z2) {
  z1 = Z.create(z1); z2 = Z.create(z2);
  return new Z(z1.sign * z2.sign, N.prod(z1.n, z2.n));
};
Z.divMod = function (z1, z2) {
  /* Returns z1 div z2 and z1 mod z2, where z1 div z2 is rounding
   z1/z2 toward negative infinity, and these together satisfy
   (z1 div z2)*z2 + (z1 mod z2) = z1 */
  z1 = Z.create(z1); z2 = Z.create(z2);
  var d = N.divMod(z1.n, z2.n);
  if (z1.sign === z2.sign) {
    return {div : new Z(1, d.div),
            mod : new Z(z2.sign, d.mod)};
  } else if (d.mod.isZero()) {
    return {div : new Z(-1, d.div),
            mod : new Z(z2.sign, N.SMALL[0])};
  } else {
    return {div : new Z(-1, N.sum(d.div, N.SMALL[1])),
            mod : new Z(z2.sign, N.diff(z2.n, d.mod))};
  }
};
Z.ipow = function (z, n) {
  /* Computes z^n, where n is a Javascript integer. */
  return new Z(n % 2 === 0 ? 1 : z.sign,
               N.ipow(z.n, n));
};
Z.gcd = function (a, b) {
  return new Z(1, N.gcd(a.n, b.n));
};
Z.factorial = function (z) {
  if (z.sign < 0) {
    return Z.create(1);
  } else {
    return new Z(1, N.factorial(z.n));
  }
};
Z.negate = function (z) {
  return new Z(-z.sign, z.n);
};
Z.abs = function (z) {
  return new Z(1, z.n);
};

// A rational number is a numerator and denominator, both integers.
function Q(num, den) {
  if (den.sign < 0) {
    this.num = Z.negate(num);
    this.den = Z.negate(den);
  } else {
    this.num = num;
    this.den = den;
  }
}
Q.reduced = function (num, den) {
  var g = gcd(num, den);
  num = divMod(num, g).div;
  den = divMod(den, g).div;
  return new Q(num, den);
};
Q.fromString = function (s) {
  var p = s.split("/");
  if (p.length === 1) {
    return new Q(Z.fromString(p[0]), Z.fromNum(1));
  } else if (p.length === 2) {
    return Q.reduced(Z.fromString(p[0]), Z.fromString(p[1]));
  } else {
    throw new Error("Too many slashes");
  }
};
Q.fromNum = function (n) {
  /* Creates a rational from a Javascript number.  If the number is
   fractional, we use a Farey sequence to find the best rational which
   would round to the number as a double. */
  if (~~n === n) {
    return new Q(Z.fromNum(n), Z.fromNum(1));
  }
  var sign = n > 0 ? 1 : -1;
  n = Math.abs(n);
  var float = new Float64Array(1),
      bytes = new Uint8Array(float.buffer);
  float[0] = n;
  var exponent = ((bytes[7] & 0x7f) << 4 | bytes[6] >> 4) - 0x3ff;
  bytes[7] = 0x3f;
  bytes[6] |= 0xf0;
  var mantissa = float[0];
  //return [sign, exponent, mantissa];
  
  function farey(x, N) {
    // 1 < x < 2
    var a = 1, b = 1, c = 2, d = 1;
    while (b <= N && d <= N) {
      var mediant = (a+c)/(b+d);
      if (x === mediant) {
        if (b+d <= N) {
          return [a+c, b+d];
        } else if (d > b) {
          return [c, d];
        } else {
          return [a, b];
        }
      } else if (x > mediant) {
        var a1 = a+c, b1 = b+d;
        a = a1; b = b1;
      } else {
        var c1 = a+c, d1 = b+d;
        c = c1; d = d1;
      }
    }
    if (b > N) {
      return [c,d];
    } else {
      return [a,b];
    }
  }
  var ab;
  if (mantissa === 1) {
    ab = [1,1];
  } else {
    ab = farey(mantissa, 9007199254740992); // Math.pow(2, 53)
  }
  return prod(ipow(2, exponent),
              new Q(new Z(sign, N.create(ab[0])),
                    Z.create(ab[1])));
};
Q.create = function (o) {
  if (typeof o === "string") {
    return Q.fromString(o);
  } else if (typeof o === "number") {
    return Q.fromNum(o);
  } else if (o instanceof N) {
    return new Q(Z.create(o), Z.create(1));
  } else if (o instanceof Z) {
    return new Q(o, Z.create(1));
  } else if (o instanceof Q) {
    return o;
  } else {
    throw new Error("Value error");
  }
};
Q.prototype.toString = function (base) {
  if (this.den.eqSmallNum(1)) {
    return this.num.toString(base);
  } else {
    return this.num.toString(base) + "/" + this.den.toString(base);
  }
};
Q.prototype.toPrecision = function (digs) {
  if (digs === void 0) digs = 16;
  var q = this;
  var sign = q.num.sign;
  var ss = sign > 0 ? "" : "-";
  if (sign < 0) { q = new Q(Z.negate(q.num), q.den); }
  var ifr = Q.ifrac(q);
  q = ifr.fpart;
  var exp, s;
  if (ifr.ipart.isZero()) {
    var r = Q.recip(q);
    var ristr = Q.ifrac(r).ipart.toString();
    exp = -ristr.length;
    q = prod(q, ipow(10, ristr.length));
    ifr = Q.ifrac(q);
    s = ifr.ipart.toString();
    q = ifr.fpart;
  } else {
    var istr = ifr.ipart.toString();
    exp = istr.length - 1;
    s = istr.slice(0, digs);
  }
  while (s.length < digs) {
    ifr = Q.ifrac(prod(10, q));
    q = ifr.fpart;
    s += ifr.ipart.toString();
  }
  return ss + s[0] + "." + s.slice(1) + (exp > 0 ? "e+" + exp : exp < 0 ? "e" + exp : "");
};
Q.prototype.toFixed = function (digs) {
  if (digs === void 0) digs = 15;
  var q = this;
  var sign = q.num.sign;
  var ss = sign > 0 ? "" : "-";
  if (sign < 0) { q = new Q(Z.negate(q.num), q.den); }
  var ifr = Q.ifrac(q);
  var s = ifr.ipart.toString();
  var sf = "";
  q = ifr.fpart;
  while (sf.length < digs) {
    ifr = Q.ifrac(prod(10, q));
    q = ifr.fpart;
    sf += ifr.ipart.toString();
  }
  return ss + s + "." + sf;
};
Q.prototype.inspect = function () {
  return "Q.create(\"" + this.toString() + "\")";
};
Q.prototype.isZero = function () {
  return this.num.isZero();
};
Q.sum = function (a, b) {
  var num = Z.sum(Z.prod(a.num, b.den), Z.prod(b.num, a.den));
  var den = Z.prod(a.den, b.den);
  return Q.reduced(num, den);
};
Q.diff = function (a, b) {
  var num = Z.diff(Z.prod(a.num, b.den), Z.prod(b.num, a.den));
  var den = Z.prod(a.den, b.den);
  return Q.reduced(num, den);
};
Q.prod = function (a, b) {
  return Q.reduced(Z.prod(a.num, b.num), Z.prod(a.den, b.den));
};
Q.quot = function (a, b) {
  return Q.reduced(Z.prod(a.num, b.den), Z.prod(a.den, b.num));
};
Q.recip = function (a) {
  return new Q(a.den, a.num);
};
Q.ipow = function (a, n) {
  /* a^n, with n a Javascript integer */
  if (n < 0) {
    return new Q(Z.ipow(a.den, -n), Z.ipow(a.num, -n));
  } else {
    return new Q(Z.ipow(a.num, n), Z.ipow(a.den, n));
  }
};
Q.compare = function (a, b) {
  return Z.compare(prod(a.num, b.den), prod(b.num, a.den));
};
Q.min = function (a, b) {
  if (Q.compare(a, b) <= 0) {
    return a;
  } else {
    return b;
  }
};
Q.max = function (a, b) {
  if (Q.compare(a, b) >= 0) {
    return b;
  } else {
    return a;
  }
};
Q.ifrac = function (a) {
  /* Gets the integer part and the fractional part */
  var dm = divMod(a.num, a.den);
  return {ipart : dm.div,
          fpart : new Q(dm.mod, a.den)};
};
Q.cfrac = function (a) {
  /* Gets a continued fraction representation */
  var cfrac = [];
  while (!a.isZero()) {
    var ifr = Q.ifrac(a);
    //console.log(ifr);
    cfrac.push(ifr.ipart);
    if (ifr.fpart.isZero())
      break;
    a = Q.recip(ifr.fpart);
  }
  return cfrac;
};
Q.fromCfrac = function (cfrac) {
  if (cfrac.length === 0) {
    return Q.create(0);
  }
  var a = Q.create(cfrac[cfrac.length - 1]);
  for (var i = cfrac.length - 2; i >= 0; i--) {
    a = Q.recip(a);
    a = sum(cfrac[i], a);
  }
  return a;
};
Q.choose = function (a, b) {
  /* a is rational, b is an integer */
  b = Z.create(b);
  if (b.sign < 0) {
    throw new Error("choose needs b to be positive");
  }
  var q = Q.create(1);
  while (!b.isZero()) {
    q = prod(quot(a, b), q);
    a = diff(a, 1);
    b = diff(b, 1);
  }
  return q;
};
Q.negate = function (a) {
  return new Q(Z.negate(a.num), a.den);
};
Q.abs = function (a) {
  return new Q(Z.abs(a.num), a.den);
};

// A real number is a machine which takes a bound r and produces
// a rational number q_r such that for any bound s>r, then
// |q_r - q_s| < r  (this is equivalent to a Cauchy sequence)
function R(mach) {
  this.mach = mach;
  this.r = null;
  this.memo = null;
}
R.prototype.ev = function (r) {
  if (this.r === null || compare(r, this.r) < 0) {
    this.memo = this.mach(r);
    this.r = r;
  }
  return this.memo;
};

R.create = function (o) {
  if (o instanceof R) {
    return o;
  } else {
    return R.fromRat(Q.create(o));
  }
};

R.fromRat = function (q) {
  q = Q.create(q);
  return new R(function (r) {
    return q;
  });
};

R.prototype.toString = function () {
  return this.toFixed(16);
};
R.prototype.toFixed = function (digs) {
  if (digs === void 0) digs = 16;
  var r = ipow(10, -digs-1);
  var q = this.mach(r);
  return q.toFixed(digs);
};

R.sum = function (a, b) {
  return new R(function (r) {
    var r2 = quot(r, 2);
    return sum(a.ev(r2), b.ev(r2));
  });
};
R.diff = function (a, b) {
  return new R(function (r) {
    var r2 = quot(r, 2);
    return diff(a.ev(r2), b.ev(r2));
  });
};
R.negate = function (a) {
  return new R(function (r) {
    return negate(a.ev(r));
  });
};
R.upper = function (a) {
  /* Gets an upper bound for |a| */
  return new R(function (r) {
    return sum(abs(a.ev(r)), r);
  });
};
R.lower = function (a) {
  /* Gets a lower bound for |a| which is >0 */
  return new R(function (r) {
    while (true) {
      var aev = abs(a.ev(r));
      var b = diff(aev, r);
      if (compare(b, 0) > 0) {
        return b;
      }
      r = R.min(quot(r, 2), quot(aev, 2));
    }
  });
};
R.bound = function (a) {
  /* Gets a pair of numbers (b, r) such that 0 < b-r < |a| < b+r */
  return new R(function (r) {
    while (true) {
      var aev = abs(a.ev(r));
      if (compare(diff(aev, r), 0) > 0) {
        return [aev, r];
      }
      r = R.min(quot(r, 2), quot(aev, 2));
    }
  });
};
R.min = function (a, b) {
  return new R(function (r) {
    var aev = a.ev(r);
    var bev = b.ev(r);
    if (compare(aev, bev) <= 0) {
      return aev;
    } else {
      return bev;
    }
  });
};
R.max = function (a, b) {
  return new R(function (r) {
    var aev = a.ev(r);
    var bev = b.ev(r);
    if (compare(aev, bev) >= 0) {
      return aev;
    } else {
      return bev;
    }
  });
};
R.abs = function (a) {
  return new R(function (r) {
    return abs(a.ev(r));
  });
};
R.prod = function (a, b) {
  var aupper = R.upper(a),
      bupper = R.upper(b);
  return new R(function (r) {
    var r2 = quot(r, 2);
    var X = aupper.ev(r2),
        Y = bupper.ev(r2);
    var rx = quot(r2, Y),
        ry = quot(r2, X);
    return prod(a.ev(rx), b.ev(ry));
  });
};
R.quot = function (a, b) {
  var aupper = R.upper(a),
      bupper = R.upper(b),
      blower = R.lower(b);
  return new R(function (r) {
    var r2 = quot(r, 2);
    var X = aupper.ev(r2),
        Y = bupper.ev(r2),
        Yl = blower.ev(r2);
    var r2y2 = prod(r2, prod(Yl, Yl));
    var rx = quot(r2y2, Y),
        ry = quot(r2y2, X);
    return quot(a.ev(rx), b.ev(ry));
  });
};
R.recip = function (a) {
  var alower = R.lower(a);
  return new R(function (r) {
    var r2 = quot(r, 2);
    var Xl = alower.ev(r2);
    var rx = prod(r2, prod(Xl, Xl));
    return quot(1, a.ev(rx));
  });
};
R.exp = function (a) {
  // computes e^a
  
};



return {
  Nbuf : Nbuf,
  N : N,
  Z : Z,
  Q : Q,
  R : R,

  num : num,
  sum : sum,
  diff : diff,
  negate : negate,
  abs : abs,
  prod : prod,
  divMod : divMod,
  quot : quot,
  recip : recip,
  gcd : gcd,
  ipow : ipow,
  factorial : factorial,
  compare : compare
};
})();
