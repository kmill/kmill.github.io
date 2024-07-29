"use strict";

function getPixelRatio(context) {
    var backingStore = context.backingStorePixelRatio ||
          context.webkitBackingStorePixelRatio ||
          context.mozBackingStorePixelRatio ||
          context.msBackingStorePixelRatio ||
          context.oBackingStorePixelRatio ||
          context.backingStorePixelRatio || 1;

    return (window.devicePixelRatio || 1) / backingStore;
};

function Pt(x, y) {
  this.x = x;
  this.y = y;
}
Pt.mouse = function (mouseEvent) {
  return new Pt(mouseEvent.offsetX, mouseEvent.offsetY);
};

function Offset(dx, dy) {
  this.dx = dx;
  this.dy = dy;
}

function CanvasEvents(canvas) {
  canvas.addEventListener("mousedown", this.mousedown.bind(this), false);
  canvas.addEventListener("mouseup", this.mouseup.bind(this), false);
  canvas.addEventListener("mousemove", this.mousemove.bind(this), false);
  canvas.addEventListener("mouseleave", this.mouseleave.bind(this), false);

  /*
  canvas.addEventListener("touchstart", this.touchstart.bind(this), false);
  canvas.addEventListener("touchmove", this.touchmove.bind(this), false);
  canvas.addEventListener("touchend", this.touchend.bind(this), false);
   */

  this.pathListeners = [];

  this.point = null;
}
CanvasEvents.extend({
  mousedown : function (e) {
    if (e.button === 0) {
      e.preventDefault();
      this.point = Pt.mouse(e);
      this.notifyListeners("mousedown", this.point);
    }
  },
  mouseup : function (e) {
    if (this.point !== null) {
      e.preventDefault();
      this.point = null;
      this.notifyListeners("mouseup");
    }
  },
  mousemove : function (e) {
    e.preventDefault();
    if (this.point !== null) {
      this.point = Pt.mouse(e);
      this.notifyListeners("mousemove", this.point, true);
    } else {
      this.left = false;
      this.notifyListeners("mousemove", Pt.mouse(e), false);
    }
  },
  mouseleave : function () {
    this.notifyListeners("mouseleave");
  },
  notifyListeners : function (evname) {
    var args = [];
    for (var i = 1; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    for (var i = 0; i < this.pathListeners.length; i++) {
      var listener = this.pathListeners[i];
      if (listener[evname]) {
        listener[evname].apply(listener, args);
      }
    }
  },
  addEventListener : function (listener) {
    this.pathListeners.push(listener);
  }
});

function DraggablePoint(x, y) {
  this._x = x;
  this._y = y;
  this._radius = 9;
  this._selected = false;
  this._fillStyle = "#000";
  this._selectedStrokeStyle = "#fff";
  this._unselectedStrokeStyle = "#000";
  this._clamp = function() {};
  this._moved = function(x, y) {};
  this._enabled = true;
}
DraggablePoint.extend({
  containsPoint : function (pt) {
    if (!this._enabled) {
      return false;
    }
    var dx = this._x - pt.x;
    var dy = this._y - pt.y;
    return dx * dx + dy * dy <= this._radius * this._radius;
  },
  offset : function (pt) {
    return new Offset(pt.x - this._x, pt.y - this._y);
  },
  enable : function () {
    this._enabled = true;
  },
  moveTo : function (pt, offset, tentative) {
    if (pt === null) {
      this._enabled = false;
      return;
    }
    this._enabled = true;
    var newx = pt.x, newy = pt.y;
    if (offset !== void 0) {
      newx -= offset.dx;
      newy -= offset.dy;
    }
    if (!tentative || Math.abs(newx - this._x) > 1e-4 || Math.abs(newy - this._y) > 1e-4) {
      this._x = newx;
      this._y = newy;
      this._clamp();
      this._moved();
    }
  },
  paint : function (ctxt) {
    ctxt.fillStyle = this._fillStyle;
    ctxt.beginPath();
    ctxt.arc(this._x, this._y, this._radius, 0, Math.PI*2, true);
    ctxt.fill();
    if (this._selected) {
      ctxt.lineWidth = 2;
      ctxt.strokeStyle = this._selectedStrokeStyle;
      ctxt.stroke();
    }
  },
  select : function () {
    this._selected = true;
  },
  deselect : function () {
    this._selected = false;
  }
});

function HeatEq(canvas) {
  this.canvas = canvas;
  this.ctxt = this.canvas.getContext("2d");
  var ratio = getPixelRatio(this.ctxt);
  if (ratio !== 1) {
    var width = canvas.width;
    var height = canvas.height;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    this.ctxt.scale(ratio, ratio);
  }
  this.dim = this.canvas.getBoundingClientRect();
  this.cevents = new CanvasEvents(canvas);
  this.cevents.addEventListener(this);

  this._mousept = null;
  this._mouseactive = false;

  this._redraw = null;
  this._repaintLater = false;
  
  this._selected = null;

  var npts = 512;
  this.points = [];
  for (var i = 0; i < npts; i++) {
    this.points.push(0.0);
  }
  this.lastpoints = this.points.slice();
  this.iToPt = function (points, i) {
    return new Pt(i+10, 100-points[i]);
  };
  this.setPt = function (x0, y0, x1, y1) {
    var i0 = Math.floor(x0-10),
        j0 = 100-y0,
        i1 = Math.floor(x1-10),
        j1 = 100-y1;
    done: {
      if (i0 === i1) {
        if (0 <= i0 && i0 < npts)
          this.points[i0] = j0;
        break done;
      }
      if (i0 > i1) {
        var s = i0; i0 = i1; i1 = s;
        s = j0; j0 = j1; j1 = s;
      }
      for (var i = i0; i <= i1; i++) {
        s = (i-i0)/(i1-i0);
        if (0 <= i && i < npts) {
          this.points[i] = j0*(1-s) + j1*s;
        }
      }
    }
    this.points[0] = 0;
    this.points[npts-1] = 0;
  };
}
HeatEq.extend({
  mousedown : function (pt) {
    this.setPt(pt.x, pt.y, pt.x, pt.y);
    this._mousept = pt;
//    this.repaint();
  },
  mouseup : function () {
    this._mousept = null;
  },
  mousemove : function (pt, isdown) {
    if (isdown) {
      if (!this._mousept) {
        this._mousept = pt;
      }
      this.setPt(this._mousept.x, this._mousept.y, pt.x, pt.y);
      this._mousept = pt;
    }
  },
  mouseleave : function () {
    this._mousept = null;
  },
  repaint : function () {
    if (!this._animationFrame) {
      var self = this;
      this._animationFrame = window.requestAnimationFrame(this.paint.bind(this));
    }
  },
  paint : function (t) {
    this._animationFrame = null; this.repaint();
    if (this.go && this.last_t) {
      this.t += Math.min(t - this.last_t, 1/20);
    }
    this.last_t = t;

    var ctxt = this.ctxt;
    
    ctxt.fillStyle = "#fff";
    ctxt.fillRect(0, 0, this.dim.width, this.dim.height);

    if (this._mousept) {
      this.setPt(this._mousept.x, this._mousept.y, this._mousept.x, this._mousept.y);
    }

    var points = this.points.slice();
    var imagcpy = null;
    if (true || this.go) {
      var real = this.points.slice();
      for (var i = 0; i < 512; i++) {
        real.push(-this.points[511-i]);
      }
      var imag = new Array(1024).fill(0.0);
      fft1024.forward(real, imag);

      //window.real = real.slice();
      //window.imag = imag.slice();

      var beta = 500;

      real[0] = 0;
      imag[0] = 0;
      for (var n = 1; n <= 512; n++) {
        var c = Math.exp(-beta * (n*n/512/512) * (1/60));
        real[n] *= c;
        imag[n] *= c;
        real[1024-n] *= c;
        imag[1024-n] *= c;
      }

//      real[1] = imag[1] = 0;
//      real[1023] = imag[1023] = 0;
//      for (var i = 3; i <= 512; i++) {
//        real[i] = imag[i] = 0;
//        real[1024-i] = imag[1024-i] = 0;
//      }
      
      imagcpy = imag.slice();
      window.imag = imagcpy;
      fft1024.inverse(real, imag);
      points = real.slice(0, 512);
      this.points = points;
    }

    if (imagcpy) {
      ctxt.strokeStyle = "#666";
      ctxt.lineWidth = 0.5;
      ctxt.lineJoin = "round";
      ctxt.beginPath();
      for (var n = 1; n < 15; n++) {
        for (var i = 0; i < points.length; i++) {
          var pt = this.iToPt(points, i);
          pt.y = 100+imagcpy[n]/512*Math.sin(Math.PI * i * n / points.length);
          if (i === 0) {
            ctxt.moveTo(pt.x, pt.y);
          } else {
            ctxt.lineTo(pt.x, pt.y);
          }
        }
      }
      ctxt.stroke();
    }

    ctxt.strokeStyle = "#000";
    ctxt.lineWidth = 2.0;
    ctxt.lineJoin = "round";
    ctxt.beginPath();
    for (var i = 0; i < points.length; i++) {
      var pt = this.iToPt(points, i);
      if (i === 0) {
        ctxt.moveTo(pt.x, pt.y);
      } else {
        ctxt.lineTo(pt.x, pt.y);
      }
    }
    ctxt.stroke();

    // for (var j = 0; j < 100; j++) {
    //   if (!this.pointsv) {
    //     this.pointsv = [];
    //     for (var i = 0; i < this.points.length; i++) {
    //       this.pointsv.push(0.0);
    //     }
    //   }
    //   var newpts = this.points.slice();
    //   for (var i = 1; i < this.points.length-1; i++) {
    //     var uxx = (this.points[i+1] - 2*this.points[i] + this.points[i-1]);
    //     this.pointsv[i] += uxx * 0.01;
    //     this.pointsv[i] *= 0.999999;
    //     newpts[i] += this.pointsv[i] * 0.01;
    //   }
    //   this.points = newpts;

    //   this.pointsv[100] += 0.01*((t/1000 * 0.8)%1.0);
    // }
    
  },
  reset : function () {
    this.go = true;
    this.t = 0;
    this.points.fill(0);
    //this.repaint();
  }
});

var fft512 = new FFTNayuki(512);
var fft1024 = new FFTNayuki(1024);

window.addEventListener("load", function () {
  var canvas = document.getElementById("canvas");
  var basisToy = new HeatEq(canvas);
  
  document.getElementById("reset").addEventListener("click", function () {
    basisToy.reset();
  }, false);
  basisToy.repaint();
}, false);
