function extend(o, kvs) {
  for (var k in kvs) {
    if (Object.prototype.hasOwnProperty.call(kvs, k)) {
      o[k] = kvs[k];
    }
  }
}
Function.prototype.extend = function (kvs) { extend(this.prototype, kvs); return this; };

Function.prototype.tapply = function (args) {
  return this.apply(this, args);
};
Function.prototype.debounce = function (delay) {
  var f = this;
  var timer = null;
  return function () {
    var args = arguments;
    function docall() {
      timer = null;
      f.apply(this, args);
    }
    if (timer !== null) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(docall, delay);
  };
};

Array.prototype.mapAppend = function (f) {
  var r = [];
  for (var i = 0; i < this.length; i++) {
    var r0 = f(this[i], i);
    for (var j = 0; j < r0.length; j++) {
      r.push(r0[j]);
    }
  }
  return r;
};

Array.prototype.maybePush = function (o) {
  if (this.indexOf(o) === -1) {
    return this.push(o);
  } else {
    return false;
  }
};

function hasOwnProperty(o, p) { return Object.prototype.hasOwnProperty.call(o, p); }

function fromUndef(v, d) {
  return v === void 0 ? d : v;
}

function setDefault(o, k, d) {
  if (!hasOwnProperty(o, k)) {
    return o[k] = d;
  } else {
    return o[k];
  }
}

Map.prototype.setDefault = function (k, d) {
  if (!this.has(k)) {
    this.set(k, d);
    return d;
  } else {
    return this.get(k);
  }
};

function spaces(n) {
  var s = '';
  for (var i = 0; i < n; i++) s += ' ';
  return s;
}

function between(x, a, b) {
  return a <= x && x <= b;
}
