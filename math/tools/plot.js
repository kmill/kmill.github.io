// plot.js

"use strict";

var $ = Q;

function im(o, selector) {
  var pre_arguments = [];
  for (var i = 2; i < arguments.length; i++) {
    pre_arguments.push(arguments[i]);
  }
  return function () {
    var method = typeof selector == "function" ? selector : o[selector];
    if (method === void 0) {
      throw new TypeError("Object " + o + " has no method '" + selector + "'");
    } else {
      var args = pre_arguments.slice(0);
      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      return method.apply(o, args);
    }
  };
}
function has(o, key) {
  return Object.prototype.hasOwnProperty.call(o, key);
}
function extend(o, kvs) {
  for (var k in kvs) {
    o[k] = kvs[k];
  }
  return o;
}
Function.prototype.extend = function (kvs) {
  extend(this.prototype, kvs);
  return this;
}

function Func(ev, arity, inv) {
  this.ev = ev;
  this.inv = inv;
  this.arity = arity;
}

var EMath = {
  sec : function (x) { return 1/Math.cos(x); },
  csc : function (x) { return 1/Math.sin(x); },
  cot : function (x) { return 1/Math.tan(x); },
  asec : function (x) { return Math.acos(1/x); },
  acsc : function (x) { return Math.asin(1/x); },
  acot : function (x) { return Math.atan(1/x); }
};

var funcs = [
  ['sinh', new Func('Math.sinh', 1, 'Math.asinh')],
  ['cosh', new Func('Math.cosh', 1, 'Math.acosh')],
  ['tanh', new Func('Math.tanh', 1, 'Math.atanh')],
  ['asinh', new Func('Math.sinh', 1, 'Math.sinh')],
  ['acosh', new Func('Math.cosh', 1, 'Math.cosh')],
  ['atanh', new Func('Math.tanh', 1, 'Math.tanh')],


  ['sin', new Func('Math.sin', 1, 'Math.asin')],
  ['cos', new Func('Math.cos', 1, 'Math.acos')],
  ['tan', new Func('Math.tan', 1, 'Math.atan')],
  ['sec', new Func('EMath.sec', 1, 'EMath.asec')],
  ['csc', new Func('EMath.csc', 1, 'EMath.acsc')],
  ['cot', new Func('EMath.cot', 1, 'EMath.acot')],
  ['asin', new Func('Math.asin', 1, 'Math.sin')],
  ['acos', new Func('Math.acos', 1, 'Math.cos')],
  ['atan2', new Func('Math.atan2', 2)],
  ['atan', new Func('Math.atan', 1, 'Math.tan')],

  ['sqrt', new Func('Math.sqrt', 1)],
  ['ln', new Func('Math.log', 1, 'Math.exp')],
  ['log', new Func('Math.log10', 1)],
  ['abs', new Func('Math.abs', 1)],
  ['ceil', new Func('Math.ceil', 1)],
  ['floor', new Func('Math.floor', 1)],
  ['exp', new Func('Math.exp', 1)],
  ['round', new Func('Math.round', 1)],
  ['sign', new Func('Math.sign', 1)],
  ['trunc', new Func('Math.trunc', 1)],
];

function Tokenizer(s) {
  this.s = s;
  this.i = 0;
}
Tokenizer.extend({
  eof : function () { return this.i >= this.s.length; },
  peek : function (n) {
    if (n === void 0) { n = 1; }
    return this.s.slice(this.i, this.i+n);
  },
  read : function (n) {
    if (n === void 0) { n = 1; }
    var s0 = this.s.slice(this.i, this.i+n);
    this.i += n;
    return s0;
  },
  readIf : function (s0) {
    var t;
    if (s0 instanceof RegExp) {
      t = s0.exec(this.s.slice(this.i));
      if (t && t.index === 0) {
        this.i += t[0].length;
        return t;
      } else {
        return null;
      }
    } else if (this.peek(s0.length) === s0) {
      return this.read(s0.length);
    } else {
      return null;
    }
  },
});

var optable = {
  '=' : [10, 'left'],
  '+' : [6, 'left'],
  '-' : [6, 'left'],
  '*' : [5, 'left'],
  '*juxt' : [4.9, 'right'],
  '/' : [5, 'left'],
  '%' : [5, 'left'],
  '^' : [3, 'right'],
  '(' : [100, 'none'],
  '~' : [4, 'none']
};
function canop(s) {
  if (s === '**') return '^';
  else return s;
}

function parse(tok) {

  var num = /[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/;
  var ops = /\+|-|\*\*|\*|\/|\^|%|=/;
  var variable = /[a-zA-Z]/;
  var constants = /e|pi/;

  var stack = [];
  var opstack = [];

  function spop() {
    if (stack.length > 0) {
      return stack.pop();
    } else {
      throw new Error("Parse error");
    }
  }

  function doop(o) {
    if (o === '*juxt') o = '*';
    var b = spop();
    if (o === '~') {
      if (typeof b === "number") {
        stack.push(-b);
      } else {
        stack.push([o, b]);
      }
    } else {
      var a = spop();
      stack.push([o, a, b]);
    }
  }

  function op(o) {
    if (optable[o][1] === 'left') {
      while (opstack.length > 0
             && optable[o][0]  >= optable[opstack[opstack.length-1]][0]) {
        doop(opstack.pop());
      }
    } else if (optable[o][1] === 'right') {
      while (opstack.length > 0
             && optable[o][0]  > optable[opstack[opstack.length-1]][0]) {
        doop(opstack.pop());
      }
    } else {
      throw new Error ('No associativity for ' + o);
    }
    opstack.push(o);
    findUnary = true;
  }

  var didTok = false;
  var findUnary = true;
  function spush(t) {
    if (didTok) {
      op('*juxt');
    }
    stack.push(t);
    didTok = true;
    findUnary = false;
  }

  var r;
  parseloop:
  while (!tok.eof()) {
//    console.log(stack.map(sexp).join(' ') + ' ||| ' + opstack.map(sexp).join(' ') + " ||| " + didTok + " ||| " + tok.peek());

    if (tok.readIf(';')) {
      break;
    }

    for (var i = 0; i < funcs.length; i++) {
      if (tok.readIf(funcs[i][0])) {
        spush(funcs[i][0]);
        continue parseloop;
      }
    }

    if ((r = tok.readIf(num))) {
      spush(+r[0]);
    } else if (tok.readIf('(')) {
      if (didTok) {
        op('*juxt');
      }
      opstack.push('(');
      didTok = false;
      findUnary = true;
    } else if ((r = tok.readIf(ops))) {
      r = canop(r[0]);
      if (findUnary && r === '-') {
        opstack.push('~');
      } else {
        op(r);
      }
      didTok = false;
      findUnary = true;
    } else if ((r = tok.readIf(constants))) {
      spush(r[0]);
    } else if ((r = tok.readIf(variable))) {
      spush(r[0]);
    } else if (tok.readIf(',')) {
      while (opstack.length > 0 && opstack[opstack.length-1] !== '(') {
        doop(opstack.pop());
      }
      if (opstack[opstack.length-1] !== '(' || stack.length === 0) {
        throw new Error("Misplaced argument separator");
      }
      var a = spop();
      var args = stack[stack.length-1];
      if (stack.length === 0 || !(args instanceof Array) || args[0] !== 'args') {
        args = ['args', a];
        args.argp = true;
        stack.push(args);
      } else {
        args.push(a);
      }
      didTok = false;
      findUnary = true;
    } else if (tok.readIf(')')) {
      while (opstack.length > 0 && opstack[opstack.length-1] !== '(') {
        doop(opstack.pop());
      }
      if (opstack.pop() !== '(') {
        throw new Error("Mismatched parentheses");
      }
      var args = stack[stack.length-2];
      if (stack.length > 1 && args instanceof Array && args[0] === 'args') {
        args.push(spop());
      }
      didTok = true;
      findUnary = false;
    } else {
      tok.read(1);
    }
  }
  while (opstack.length > 0) {
    var op = opstack.pop();
    if (op === '(') {
      throw new Error("Mismatched parentheses");
    }
    doop(op);
  }
  if (stack.length !== 1) {
    throw new Error("Parse error");
  }
  return stack[0];
}

function parseAll(tok) {
  var exps = []
  while (!tok.eof()) {
    exps.push(parse(tok));
  }
  return exps;
}

function sexp(e) {
  if (e instanceof Array) {
    return '(' + e.map(sexp).join(' ') + ')';
  } else {
    return ''+e;
  }
}

function expType(exp) {
  if (exp instanceof Array) {
    return exp[0];
  } else if (typeof exp === "string") {
    return "variable";
  } else {
    return null;
  }
}

function funcallLike(exp) {
  return expType(exp) === "*" && expType(exp[1]) === "variable";
}
function funcallArgs(exp) {
  if (expType(exp[2]) === "args") {
    var args = exp[2].slice(1);
    args.forEach(function (a) {
      if (expType(a) !== "variable") {
        throw new Error("Improper argument list");
      }
    });
    return args;
  } else if (expType(exp[2]) === "variable") {
    return [exp[2]];
  } else {
    throw new Error("Improper argument list");
  }
}

function compile(exps) {
  var types = {'x' : "variable"};
  var unbound = {};
  var functions = {};
  funcs.forEach(function (func) {
    types[func[0]] = "function";
  });
  // find definitions
  exps.forEach(function (exp) {
    if (expType(exp) === '=') {
      if (expType(exp[1]) === "variable") {
        types[exp[1]] = "variable";
      } else if (funcallLike(exp[1])) {
        types[exp[1][1]] = "function";
      } else {
        console.error(exp[1]);
        throw new Error("Unsupported definition");
      }
    } else {
      // plain expression
    }
  });
  // compile definitions
  var compiled = exps.map(function (exp) {
    if (expType(exp) === '=') {
      if (expType(exp[1]) === "variable") {
        return {
          type : "variable",
          name : exp[1],
          expression : new Function(['vars'],
                                    "return " + compe(exp[2], types) + ";")
        };
      } else if (funcallLike(exp[1])) {
        var types2 = Object.create(types);
        var arglist = funcallArgs(exp[1]);
        arglist.forEach(function (a) { types2[a] = "variable"; });
        var comped = compe(exp[2], types2);
        functions[exp[1][1]] = new Function(['vars'].concat(arglist),
                                            'vars = Object.create(vars);'
                                            +arglist.map(function (v) {
                                              return 'vars.'+v+'='+v+';';
                                            }).join('')
                                            +"return " + comped + ";");
        return {
          type : "function",
          name : exp[1][1],
          fun : functions[exp[1][1]]
        };
      } else {
        throw new Error("Unsupported function");
      }
    } else {
      return {
        type : "scalar",
        expression : new Function(['vars'],
                                  "return " + compe(exp, types) + ";")
      };
    }
  });
  function compe(exp, types) {
    if (typeof exp === "number") {
      return ''+exp;
    } else if (expType(exp) === "variable") {
      if (exp === "pi") {
        return "Math.PI";
      } else if (exp === "e") {
        return "Math.E";
      } else {
        if (!types[exp]) {
          unbound[exp] = true;
        }
        return 'vars.'+exp;
      }
    } else if (expType(exp) === '*'
               && expType(exp[1]) === "variable"
               && types[exp[1]] === "function") {
      var f = 'vars.'+exp[1]+'(vars,';
      for (var i = 0; i < funcs.length; i++) {
        if (funcs[i][0] === exp[1]) {
          f = funcs[i][1].ev+'(';
          break;
        }
      }
      var args;
      if (expType(exp[2]) === "args") {
        args = exp[2].slice(1);
      } else {
        args = [exp[2]];
      }
      var comps = args.map(function (e) { return compe(e, types); });
      return f + comps.join(',') + ")";
    } else if (expType(exp) === '*'
               && expType(exp[1]) === "^"
               && expType(exp[1][1]) === "variable"
               && types[exp[1][1]] === "function") {
      if (exp[1][2] === -1) {
        var f;
        for (var i = 0; i < funcs.length; i++) {
          if (funcs[i][0] === exp[1][1] && funcs[i][1].inv) {
            f = funcs[i][1].inv;
            break;
          }
        }
        if (f === void 0) {
          throw new Error("No inverse for " + exp[1][1]);
        }
        var args;
        if (expType(exp[2]) === "args") {
          args = exp[2].slice(1);
        } else {
          args = [exp[2]];
        }
        var comps = args.map(function (e) { return compe(e, types); });
        return f+"(" + comps.join(',') + ")";
      } else {
        return compe(["^", ['*', exp[1][1], exp[2]], exp[1][2]], types);
      }
    } else if (expType(exp) === "*") {
      return '(' + compe(exp[1], types) + '*' + compe(exp[2], types) + ')';
    } else if (expType(exp) === "/") {
      return '(' + compe(exp[1], types) + '/' + compe(exp[2], types) + ')';
    } else if (expType(exp) === "+") {
      return '(' + compe(exp[1], types) + '+' + compe(exp[2], types) + ')';
    } else if (expType(exp) === "-") {
      return '(' + compe(exp[1], types) + '-' + compe(exp[2], types) + ')';
    } else if (expType(exp) === "%") {
      return '(' + compe(exp[1], types) + '%' + compe(exp[2], types) + ')';
    } else if (expType(exp) === "^") {
      return 'Math.pow(' + compe(exp[1], types) + ',' + compe(exp[2], types) + ')';
    } else if (expType(exp) === "~") {
      return '(-' + compe(exp[1], types) + ')';
    } else {
      console.error(sexp(exp));
      throw new Error("Unknown expression type");
    }
  }
  console.log(types);
  return compiled;
}

function pparse(s) {
  var tok = new Tokenizer(s);
  var exps = parseAll(tok);
  console.log(sexp(exps));
  return compile(exps);
//  return sexp(e);
}

function getPixelRatio(context) {
  var backingStore = context.backingStorePixelRatio ||
        context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1;
  
  return (window.devicePixelRatio || 1) / backingStore;
}

function Plot($dest) {
  this.makeCanvas();
  this.$container = $dest;
  this.$canvas.appendTo(this.$container);
  this._minX = -10;
  this._rangeX = 20;
  this._minY = -10;
  this._rangeY = 20;
  this._delta = {dx : 0, dy : 0};

  this._functions = [];

  this.resize();
}
Plot.prototype.resize = function () {
  var width = this.$container.prop('offsetWidth');
  var height = this.$container.prop('offsetHeight');
  this.setDim(width, height);
  this.redraw();
};
Plot.prototype.setDim = function (width, height) {
  var ratio = getPixelRatio(this.ctxt);
  this.ratio = ratio;
  this.width = width;
  this.height = height;
  this.$canvas.prop('width', ratio * width).prop('height', ratio * height);
  this.$canvas.width = ratio * width;
  this.$canvas.height = ratio * height;
  this.$backingCanvas.prop('width', ratio * width).prop('height', ratio * height);
  this.$canvas.css('width', width+'px').css('height', height+'px');
  this.$backingCanvas.css('width', width+'px').css('height', height+'px');
  this.ctxt.setTransform(ratio, 0, 0, ratio, 0, 0);
};
Plot.prototype.square = function () {
  var newRangeX = this.width / this.height * this._rangeY;
  this._minX = this._minX + this._rangeX/2 - newRangeX/2;
  this._rangeX = newRangeX;
};
Plot.prototype.copy = function () {
  this.realCtxt.fillStyle = "#fff";
  this.realCtxt.fillRect(0, 0, this.$canvas.width, this.$canvas.height);
  this.realCtxt.drawImage(this.$backingCanvas[0], this._delta.dx*this.ratio, this._delta.dy*this.ratio);
};
Plot.prototype.redraw = function () {
  this._minX -= this._delta.dx/this.width*this._rangeX;
  this._minY += this._delta.dy/this.height*this._rangeY;
//  console.log(this._minX, this._minY);
  this._delta = {dx : 0, dy : 0};
  this.clear();
  for (var i = 0; i < this._functions.length; i++) {
    this.plot(this._functions[i]);
  }
  this.copy();
};
Plot.prototype.makeCanvas = function () {
  this.$canvas = $.create("canvas");
  this.$backingCanvas = $.create("canvas");
  this.realCtxt = this.$canvas[0].getContext('2d');
  this.ctxt = this.$backingCanvas[0].getContext('2d');
  this.setDim(800, 600);

  this.ctxt.lineCap = this.ctxt.lineJoin = "round";

  this.$canvas.on("mousedown", im(this, 'mousedown'));
  this.$canvas.on("mousewheel DOMMouseScroll", im(this, 'mousewheel'));
};
Plot.prototype.clear = function () {
  this.ctxt.fillStyle = "#fff";
  this.ctxt.fillRect(0, 0, this.width, this.height);
  this.axes();
};
Plot.prototype.setFunctions = function (fns) {
  this._functions = fns;
  this.redraw();
  return this;
};
Plot.prototype.plot = function (f, color) {

  var pathProgress = false;
  this.ctxt.lineWidth = 1.5;
  this.ctxt.strokeStyle = color || f.color || "#000";
  this.ctxt.beginPath();
  var lastx = this.i2x(-1);
  var lasty = f(lastx);

  function makePath(f, startx, endx, stepx, steps, stepy) {
    var paths = [];
    var path = [];

    function step(startx, endx, stepx, steps, fstartx, fendx, i) {
      if (i === 0) {
        if (!isNaN(fendx)) {
          path.push([endx, fendx]);
        }
        return;
      } else {
        for (var j = 0; j < steps; j++) {
          var x = startx + stepx * j;
          var y = f(x);
          if (isNaN(y)) {
            if (!isNaN(fstartx)) {
              step(x-stepx, x, stepx/2, 3, fstartx, y, i-1);
            }
            if (path.length > 0) {
              paths.push(path);
              path = [];
            }
          } else if (isNaN(fstartx)) {
            step(x-stepx, x, stepx/2, 3, fstartx, y, i-1);
            path.push([x,y]);
          } else if (path.length > 0) {
            if (Math.abs(fstartx-y) > stepy) {
              step(x-stepx, x, stepx/2, 3, fstartx, y, i-1);
              while (path.length > 0 && path[path.length-1][0] === x) {
                path.pop();
              }
              if (path.length > 0) {
                var lastpt = path[path.length-1];
                if (Math.abs(lastpt[1]-y) > stepy) {
                  paths.push(path);
                  path = [];
                }
              }
              path.push([x,y]);
            } else {
              path.push([x,y]);
            }
          } else {
            path.push([x,y]);
          }
          fstartx = y;
        }
      }
    }

    var fstartx = f(startx);
    if (!isNaN(fstartx)) path.push([startx, fstartx]);
    step(startx, endx, stepx, steps, f(startx), f(endx), 8);

    if (path.length > 0) {
      paths.push(path);
    }

    return paths;
  }

  var self = this;

  var paths = makePath(f,
                       this._minX, this._minX+this._rangeX,
                       this._rangeX/this.width,
                       this.width+1,
                       5/this.height * this._rangeY);

  for (var i = 0; i < paths.length; i++) {
    for (var j = 0; j < paths[i].length; j++) {
      var pi = this.x2i(paths[i][j][0]);
      var pj = this.y2j(paths[i][j][1]);
      
      if (pj > this.height * 2) {
        pj = this.height * 2;
      }
      if (pj < -2 * this.height) {
        pj = -2 * this.height;
      }

      if (j === 0) {
        this.ctxt.moveTo(pi, pj);
        if (paths.length === 1) {
          this.ctxt.lineTo(pi, pj+0.5);
        }
      } else {
        this.ctxt.lineTo(pi, pj);
      }
    }
  }
  //console.log(paths);
  this.ctxt.stroke();
};
Plot.prototype.x2i = function (x) {
  return (x - this._minX) / this._rangeX * this.width;
};
Plot.prototype.y2j = function (y) {
  return this.height - (y - this._minY) / this._rangeY * this.height;
};
Plot.prototype.i2x = function (i) {
  return this._minX + i/this.width * this._rangeX;
};
Plot.prototype.j2y = function (j) {
  return this._minY + (this.height - j)/this.height * this._rangeY;
};
Plot.prototype.axes = function () {
  this.ctxt.lineWidth = 0.5;

  var xpp = Math.round(Math.log(120 * this._rangeX / this.width)/Math.log(10));
  var xp = Math.pow(10, xpp);
  var xpw = xp * this.width / this._rangeX;
  var subdiv = 1;
  var minwidth = 8;
  if (xpw / 10 >= minwidth) {
    subdiv = 10;
  } else if (xpw / 5 >= minwidth) {
    subdiv = 5;
  } else if (xpw / 2 >= minwidth) {
    subdiv = 2;
  } else {
    subdiv = 1;
  }

  var startx = Math.floor(this._minX / xp) * xp;
  var starty = Math.floor(this._minY / xp) * xp;

  this.ctxt.strokeStyle = "#ddd";
  this.ctxt.beginPath();
  for (var x = startx; x <= this._minX + this._rangeX; x += xp/subdiv) {
    this.ctxt.moveTo(this.x2i(x), this.y2j(this._minY)-1);
    this.ctxt.lineTo(this.x2i(x), this.y2j(this._minY+this._rangeX)+1);
  }
  for (var y = starty; y <= this._minY + this._rangeY; y += xp/subdiv) {
    this.ctxt.moveTo(this.x2i(this._minX)-1, this.y2j(y));
    this.ctxt.lineTo(this.x2i(this._minX+this._rangeX)+1, this.y2j(y));
  }
  this.ctxt.stroke();
  
  this.ctxt.strokeStyle = "#bbb";
  this.ctxt.beginPath();

  for (var x = startx; x <= this._minX + this._rangeX; x += xp) {
    this.ctxt.moveTo(this.x2i(x), this.y2j(this._minY)-1);
    this.ctxt.lineTo(this.x2i(x), this.y2j(this._minY+this._rangeX)+1);
  }
  for (var y = starty; y <= this._minY + this._rangeY; y += xp) {
    this.ctxt.moveTo(this.x2i(this._minX)-1, this.y2j(y));
    this.ctxt.lineTo(this.x2i(this._minX+this._rangeX)+1, this.y2j(y));
  }
  this.ctxt.stroke();

  this.ctxt.lineWidth = 1.5;
  this.ctxt.strokeStyle = "#666";

  this.ctxt.beginPath();

  this.ctxt.moveTo(this.x2i(this._minX)-1, this.y2j(0));
  this.ctxt.lineTo(this.x2i(this._minX+this._rangeX)+1, this.y2j(0));

  this.ctxt.moveTo(this.x2i(0), this.y2j(this._minY)-1);
  this.ctxt.lineTo(this.x2i(0), this.y2j(this._minY+this._rangeX)+1);

  this.ctxt.stroke();

  this.ctxt.fillStyle = "#aaa";
  this.ctxt.font = "10px sans-serif";
  this.ctxt.textAlign = "left";
  this.ctxt.textBaseline = "top";
  var j;
  if (this.y2j(0) < 0) {
    j = 2;
  } else if (this.y2j(0) > this.height - 14) {
    j = this.height - 2;
    this.ctxt.textBaseline = "bottom";
  } else {
    j = this.y2j(0)+1;
  }
  for (var x = startx; x <= this._minX + this._rangeX; x += xp) {
    if (Math.abs(x) > xp/2) {
      this.ctxt.fillText(''+x.toFixed(Math.max(0, -xpp)), this.x2i(x)+2, j);
    }
  }
  this.ctxt.textAlign = "right";
  this.ctxt.textBaseline = "bottom";
  var i
  if (this.x2i(0) < 0) {
    i = 2;
    this.ctxt.textAlign = "left";
  } else if (this.x2i(0) > this.width) {
    i = this.width - 2;
  } else {
    i = this.x2i(0)-2;
  }
  for (var y = starty; y <= this._minY + this._rangeY; y += xp) {
    if (Math.abs(y) > xp/2) {
      this.ctxt.fillText(''+y.toFixed(Math.max(0, -xpp)), i, this.y2j(y));
    }
  }
};
Plot.prototype.mousedown = function (e) {
  if (e.which === 1 || e.which === 2) {
    this._mouseStart = {x : e.clientX, y : e.clientY};
    if (this._mouseMove) {
      this.$canvas.off('mousemove', this._mouseMove);
      $(window).off('mouseup', this._mouseUp);
    }
    this._mouseMove = im(this, 'mousemove');
    this._mouseUp = im(this, 'mouseup');
    this.$canvas.on('mousemove', this._mouseMove);
    $(window).on('mouseup', this._mouseUp);
  }
};
Plot.prototype.mousemove = function (e) {
  this._delta = {dx : e.clientX - this._mouseStart.x,
                 dy : e.clientY - this._mouseStart.y};
  this.copy();
};
Plot.prototype.mouseup = function (e) {
  this.$canvas.off('mousemove', this._mouseMove);
  $(window).off('mouseup', this._mouseUp);
  this._mouseMove = this._mouseUp = null;
  this.redraw();
};
Plot.prototype.mousewheel = function (e) {
  var deltaY = 0;
  if ( 'detail'      in e ) { deltaY = e.detail * -20;      }
  if ( 'wheelDelta'  in e ) { deltaY = e.wheelDelta;       }
  if ( 'wheelDeltaY' in e ) { deltaY = e.wheelDeltaY;      }
  if ( 'deltaY' in e ) {  deltaY = e.deltaY * -1; }

  // There are three delta modes:
  //   * deltaMode 0 is by pixels, nothing to do
  //   * deltaMode 1 is by lines
  //   * deltaMode 2 is by pages
  if (e.deltaMode === 1) {
    deltaY *= 12;
  } else if (e.deltaMode === 1) {
    deltaY *= 120;
  }

  var zoomFactor = Math.pow(1.2, deltaY/100);

  var rect = this.$canvas[0].getBoundingClientRect();
  var cx = this.i2x(e.clientX-rect.left),
      cy = this.j2y(e.clientY-rect.top);
  var dx = cx - this._minX,
      dy = cy - this._minY;
  this._rangeX /= zoomFactor;
  this._rangeY /= zoomFactor;
  this._minX = cx - dx/zoomFactor;
  this._minY = cy - dy/zoomFactor;
  this.redraw();
};

$(function () {
  var plot = new Plot($('#graphArea'));

  $(window).on("resize", function () {
    plot.resize();
    plot.square();
  });
  plot.square();

  var colors = ["#006", "#060", "#600",
                "#505", "#088"];

  function fromInput(value) {
    var fns = [];
    var compiled = pparse(value);

    var vars = {};

    compiled.forEach(function (c, i) {
      console.log(c);
      if (c.type === "scalar" || c.type === "variable") {
        var vars2 = Object.create(vars);
        var fn = function (x) { vars.x = x; return c.expression(vars); };
        fn.color = colors[i % colors.length];
        fns.push(fn);
      } else if (c.type === "function") {
        vars[c.name] = c.fun;
        console.log(''+c.fun);
      }
    });
/*    
    value.split(';').forEach(function (f, i) {
      if (f) {
        var fn = new Function(['x'], "with (Math) { return "+f+"}");
        fn.color = colors[i % colors.length];
        fns.push(fn);
      }
    });*/
    plot.setFunctions(fns);
  }

  $('#eqs').on("change", function (e) {
    fromInput(this.value);
  });

  fromInput($('#eqs').value());

});
