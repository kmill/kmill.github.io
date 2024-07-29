// grouprel.js

"use strict";

function old_parse_rel(s) {
  var re = /([1a-z])(\^(-?[0-9]+))?/g;
  var m;
  var r = [];
  while ((m = re.exec(s))) {
    if (m[1] !== '1') {
      if (m[2] === void 0) {
        r.push({ v : m[1], e : 1});
      } else if (+m[3] !== 0) {
        r.push({ v : m[1], e : +m[3]});
      }
    }
  }
  return r;
}

function parse_rel(s) {
  var re = /([\)1a-z])(\^(-?[0-9]+))?|(\()/g;
  var m;
  var r = [];
  var rs = [];
  while ((m = re.exec(s))) {
    if (m[4]) {
      rs.push(r);
      r = [];
      continue;
    }
    var exponent = 1;
    if (m[2] !== void 0) {
      exponent = +m[3];
    }
    if (m[1] === ')') {
      r = wpow(r, exponent);
      if (rs.length) {
        r = prod(rs.pop(), r);
      }
    } else if (m[1] !== '1') {
      r.push({ v : m[1], e : exponent });
    }
  }
  while (rs.length) {
    r = prod(rs.pop(), r);
  }
  return r;
}

function parse_rels(sss) {
  var rels = [];
  sss.split(';').forEach(function (s) {
    var ss = s.split('=');
    if (ss.length > 1) {
      var s1 = simp(parse_rel(ss[0]));
      for (var i = 1; i < ss.length; i++) {
        var s2 = simp(parse_rel(ss[i]));
        var eq = prod(s1, inv(s2));
        eq.eq = [s1, s2];
        rels.push(eq);
      }
      return rels;
    } else {
      rels.push(simp(parse_rel(s)));
    }
  });
  return rels;
}

function repr_rel(r) {
  var d = document.createElement("span");
  if (r.length === 0) {
    d.appendChild(document.createTextNode('1'));
  }
  for (var i = 0; i < r.length; i++) {
    var v = document.createElement('span');
    v.className = 'var';
    v.appendChild(document.createTextNode(r[i].v));
    d.appendChild(v);
    if (r[i].e !== 1) {
      var e = document.createElement("sup");
      e.appendChild(document.createTextNode(''+r[i].e));
      d.appendChild(e);
    }
  }
  return d;
}

function inv(r) {
  var rinv = r.map(function (a) { return { v : a.v, e : -a.e }; });
  rinv.reverse();
  return rinv;
}

function prod(w1, w2) {
  var p = w1.slice(0);
  var i = 0;
  while (p.length > 0 && i < w2.length) {
    var last = p[p.length-1];
    if (last.v === w2[i].v) {
      p[p.length-1] = {v : last.v, e : last.e + w2[i].e};
      if (p[p.length-1].e === 0) {
        p.length -= 1;
      }
      i++;
    } else {
      break;
    }
  }
  for (; i < w2.length; i++) {
    p.push(w2[i]);
  }
  return p;
}

function wpow(w, n) {
  var p = [];
  if (n < 0) {
    n = -n;
    w = inv(w);
  }
  for (var i = 0; i < n; i++) {
    p = prod(p, w);
  }
  return p;
}


function simp(r) {
  if (r.length === 0) { return r; }
  var r2 = [r[0]];
  for (var i = 1; i < r.length; i++) {
    r2 = prod(r2, [r[i]]);
  }
  return r2;
}

function unsimp(r) {
  var r2 = [];
  for (var i = 0; i < r.length; i++) {
    var e = Math.abs(r[i].e);
    for (var j = 0; j < e; j++) {
      r2.push({v : r[i].v, e : sign(r[i].e)});
    }
  }
  return r2;
}

var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

function wlen(w) {
  if (has(w, 'wlen')) {
    return w.wlen;
  }
  var len = 0;
  for (var i = 0; i < w.length; i++) {
    len += Math.abs(w[i].e);
  }
  w.wlen = len;
  return len;
}

function moves(rels, hr) {
  var mvs = [];
  var l = wlen(hr.r);
  for (var j = 0; j < rels.length; j++) {
    for (var i = 0; i <= l; i++) {
      mvs.push({hist : {hr : hr, i : i, rel : rels[j]},
                r : iprod(hr.r, i, rels[j])});
    }
  }
  return mvs;
}

var sign;
if (Math.sign) {
  sign = Math.sign;
} else {
  sign = function (x) {
    x = +x; // convert to a number
    if (x === 0 || isNaN(x))
        return x;
    return x > 0 ? 1 : -1;
  };
}

function iprod(w1, i, w2) {
  var clen = 0;
  for (var j = 0; j < w1.length; j++) {
    if (i === clen) {
      return prod(w1.slice(0, j), prod(w2, w1.slice(j)));
    }
    var e = Math.abs(w1[j].e);
    if (i < clen + e) {
      var w1a = w1.slice(0, j);
      w1a.push({v : w1[j].v, e : sign(w1[j].e) * (i - clen)});
      var w1b = w1.slice(j+1);
      w1b.splice(0, 0, {v : w1[j].v, e : sign(w1[j].e) * (e - i + clen)});
      return prod(w1a, prod(w2, w1b));
    }
    clen += e;
  }
  return prod(w1, w2);
}

function MinHeap(cost) {
  this.list = [];
  this.cost = cost || function (x) { return x; };
}
MinHeap.prototype.add = function (w) {
  var i = this.list.length;
  while (i > 0 && this.cost(w) < this.cost(this.list[(i-1)>>1])) {
    this.list[i] = this.list[(i-1)>>1];
    i = (i-1)>>1;
  }
  this.list[i] = w;
  this.length = this.list.length;
  return this;
};
MinHeap.prototype.peek = function () {
  return this.list[0];
};
MinHeap.prototype.pop = function () {
  if (this.list.length === 0) {
    throw new Error("MinHeap empty");
  }
  var r = this.list[0];
  this.list[0] = this.list[this.list.length-1];
  this.list.length--;
  var i = 0;
  while (true) {
    var smallest = i;
    var left = 2*i+1;
    var right = 2*i+2;
    if (left < this.list.length
        && this.cost(this.list[left]) < this.cost(this.list[smallest])) {
      smallest = left;
    }
    if (right < this.list.length
        && this.cost(this.list[right]) < this.cost(this.list[smallest])) {
      smallest = right;
    }
    if (smallest !== i) {
      var a = this.list[smallest];
      this.list[smallest] = this.list[i];
      this.list[i] = a;
      i = smallest;
    } else {
      break;
    }
  }
  this.length = this.list.length;
  return r;
};

function wrepr(w) {
  var pts = new Array(w.length);
  for (var i = 0; i < w.length; i++) {
    var a = w[i];
    pts[i] = '' + a.v + '^' + a.e;
  }
  return pts.join();
}

function weq(w1, w2) {
  if (w1.length !== w2.length) {
    return false;
  }
  for (var i = 0; i < w1.length; i++) {
    var a = w1[i], b = w2[i];
    if (a.v !== b.v || a.e !== b.e) return false;
  }
  return true;
}

function weqid(w) {
  return w.length === 0;
}

function Searcher(rels, target, /*opt*/order) {
  this.rels = rels;
  this.seen = {};
  this.q = new MinHeap(function (hr) { return wlen(hr.r); });
  this.target = target;
  this.findOrder = !!order;
  this.nextPow = prod(target, target);
  this.q.add({hist : null, r : target});
  this.least = {hist : null, r : target};
  this.result = null;
  this.num = 0;
  this.go = true;
}
Searcher.prototype.searchOnce = function () {
  if (this.q.length === 0) {
    throw new Error("Ran out of things to search");
  }
  var hr;
  if (this.findOrder && wlen(this.nextPow) <= wlen(this.q.peek().r)) {
    hr = {hist : null, r : this.nextPow};
    this.nextPow = prod(this.nextPow, this.target);
  } else {
    hr = this.q.pop();
  }
  this.num++;
  if (this.least === null || wlen(hr.r) < wlen(this.least.r)) {
    this.least = hr;
  }
  if (weqid(hr.r)) {
    this.result = hr;
    return false;
  }
  var mvs = moves(this.rels, hr);
  for (var i = 0; i < mvs.length; i++) {
    var wrepr_mv = wrepr(mvs[i].r);
    if (!has(this.seen, wrepr_mv)) {
      this.seen[wrepr_mv] = true;
//      this.num++;
      this.q.add(mvs[i]);
    }
  }
  return true;
};
Searcher.prototype.doSearch = function () {
  while (this.searchOnce()) {
    // keep going
  }
  return this.result;
};
Searcher.prototype.asyncSearch = function (found, stats) {
  stats = stats || function () {};
  var self = this;
  window.setTimeout(function () {
    if (!self.go) return;
    var start = Date.now();
    while (Date.now() - start < 5) {
      for (var i = 0; i < 500; i++) {
        if (!self.searchOnce()) {
          found(self.result, self);
          return;
        }
      }
    }
    stats(self);
    self.asyncSearch(found, stats);
  }, 0);
};
Searcher.prototype.isComplete = function () {
  return this.result !== null;
};

function dom_empty(n) {
  while (n.firstChild) {
    n.removeChild(n.firstChild);
  }
  return n;
}

function get_relations() {
  var lines = document.getElementById("relations").value.split(/\r?\n/);
  var rels = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.length > 0) {
      parse_rels(line).forEach(function (rel) { rels.push(rel); });
    }
  }
  return rels;
}
function print_relations(rels, dest) {
  for (var i = 0; i < rels.length; i++) {
    if (!has(rels[i], 'inverse_of')) {
      var p = document.createElement("div");
      dest.appendChild(p);
      if (rels[i].eq) {
        p.appendChild(repr_rel(rels[i]));
        p.appendChild(document.createTextNode('\u2001('));
        p.appendChild(repr_rel(rels[i].eq[0]));
        var span = document.createElement('span');
        span.className="eq";
        span.appendChild(document.createTextNode('='));
        p.appendChild(span);
        p.appendChild(repr_rel(rels[i].eq[1]));


        p.appendChild(document.createTextNode(')'));
      } else {
        p.appendChild(repr_rel(rels[i]));
      }
    }
  }
}

function showDerivation(hr) {
  var deriv = document.getElementById("derivation");
  dom_empty(deriv);

  function eq() {
    var span = document.createElement('span');
    span.className="eq";
    span.appendChild(document.createTextNode('='));
    deriv.appendChild(span);
  }

  function iprodd(hr) {
    function show_w2() {
      var d = document.createElement('span');
      d.className='rel';
      deriv.appendChild(d);
      if (has(w2, 'inverse_of')) {
        d.appendChild(document.createTextNode('('));
        d.appendChild(repr_rel(w2.inverse_of));
        d.appendChild(document.createTextNode(')'));
        var sup = document.createElement('sup');
        sup.appendChild(document.createTextNode('-1'));
        d.appendChild(sup);
      } else {
        d.appendChild(document.createTextNode('('));
        d.appendChild(repr_rel(w2));
        d.appendChild(document.createTextNode(')'));
      }
    }
    var w1 = hist(hr.hist.hr);
    eq();
    var i = hr.hist.i;
    var w2 = hr.hist.rel;
    var clen = 0;
    for (var j = 0; j < w1.length; j++) {
      if (i === clen) {
        if (j > 0) {
          deriv.appendChild(repr_rel(w1.slice(0, j)));
        }
        show_w2();
        deriv.appendChild(repr_rel(w1.slice(j)));
        return;
      }
      var e = Math.abs(w1[j].e);
      if (i < clen + e) {
        var w1a = w1.slice(0, j);
        w1a.push({v : w1[j].v, e : sign(w1[j].e) * (i - clen)});
        var w1b = w1.slice(j+1);
        w1b.splice(0, 0, {v : w1[j].v, e : sign(w1[j].e) * (e - i + clen)});
        deriv.appendChild(repr_rel(w1a));
        show_w2();
        deriv.appendChild(repr_rel(w1b));
        return;
      }
      clen += e;
    }
    deriv.appendChild(repr_rel(w1));
    show_w2();
    return;
  }

  function diff(hr) {
    var from = unsimp(hr.hist.hr.r);
    var to = unsimp(hr.r);
    var i = 0;
    for (; i < from.length && i < to.length; i++) {
      if (!(from[i].v === to[i].v && from[i].e === to[i].e)) {
        break;
      }
    }
    var j_from = from.length - 1, j_to = to.length - 1;
    for(; j_from > i && j_to >= 0; j_from--, j_to--) {
      if (!(from[j_from].v === to[j_to].v && from[j_from].e === to[j_to].e)) {
        break;
      }
    }
    var from_1 = simp(from.slice(0, i)),
        from_r = simp(from.slice(i, j_from+1)),
        from_2 = simp(from.slice(j_from+1));
    var to_1 = simp(to.slice(0, i)),
        to_r = simp(to.slice(i, j_to+1)),
        to_2 = simp(to.slice(j_to+1));

    var span;
    deriv.appendChild(document.createTextNode("\u2001\u2001("));
    if (from_1.length > 0) {
      deriv.appendChild(repr_rel(from_1));
    }
    span = document.createElement("span");
    span.className = "rel";
    deriv.appendChild(span);
    span.appendChild(document.createTextNode("("));
    span.appendChild(repr_rel(from_r));
    span.appendChild(document.createTextNode(")"));
    if (from_2.length > 0) {
      deriv.appendChild(repr_rel(from_2));
    }
    eq();
    if (to_1.length > 0) {
      deriv.appendChild(repr_rel(to_1));
    }
    span = document.createElement("span");
    span.className = "rel";
    deriv.appendChild(span);
    span.appendChild(document.createTextNode("("));
    span.appendChild(repr_rel(to_r));
    span.appendChild(document.createTextNode(")"));
    if (to_2.length > 0) {
      deriv.appendChild(repr_rel(to_2));
    }
    deriv.appendChild(document.createTextNode(")"));
  }

  var steps = 0;
  
  function hist(hr) {
    if (hr.hist === null) {
      deriv.appendChild(repr_rel(hr.r));
    } else {
      steps++;
      iprodd(hr);
      eq();
      deriv.appendChild(repr_rel(hr.r));
      diff(hr);
      deriv.appendChild(document.createElement('br'));
    }
    return hr.r;
  }
  hist(hr);

  var s = document.createElement('div');
  s.className = "steps";
  s.appendChild(document.createTextNode('(' + steps + ' steps)'));
  deriv.appendChild(s);
}

window.addEventListener("load", function (e) {

  document.getElementById("compute").addEventListener("click", function (e) {
    e.preventDefault();

    document.getElementById("stop").disabled=false;

    dom_empty(document.getElementById("derivation"));

    var rels = get_relations();

    if (document.getElementById('addInverses').checked) {
      rels = rels.concat(rels.map(function (rel) {
        var rinv = inv(rel);
        rinv.inverse_of = rel;
        return rinv;
      }));
    }

    document.getElementById("desc").style.display = "block";
    var dest = document.getElementById("printedRelations");
    dom_empty(dest);
    print_relations(rels, dest);

//    print_relations([prod(rels[0], rels[2])], dest);

    var identity = parse_rels(document.getElementById("identity").value)[0];
    dest = document.getElementById('printedDest');
    dom_empty(dest);
    print_relations([identity], dest);

    var findOrder = document.getElementById('findOrder').checked;

    var searcher = new Searcher(rels, identity, findOrder);

    if (window.searcher) { window.searcher.go = false; }

    window.searcher = searcher;

    searcher.asyncSearch(function (hr, searcher) {
      showDerivation(hr);

      var stats = document.getElementById("stats");
      dom_empty(stats);
      stats.appendChild(document.createTextNode("(Tested " + searcher.num + " words. Found identity.)"));
      window.searcher = null;
      document.getElementById("stop").disabled=true;
    }, function (searcher) {
      if (searcher.least !== null) {
        showDerivation(searcher.least);
      }
      var stats = document.getElementById("stats");
      dom_empty(stats);
      stats.appendChild(document.createTextNode("(Tested " + searcher.num + " words, " + searcher.q.length + " in queue. Searching.)"));
    });
  });

  document.getElementById("stop").addEventListener("click", function (e) {
    e.preventDefault();
    if (window.searcher) { window.searcher.go = false; }
    window.searcher = null;
    document.getElementById("stop").disabled=true;
  });

});
