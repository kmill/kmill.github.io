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

function Vector(space, x, y, dx, dy, color, draggable) {
  this._dpoint = new DraggablePoint(x+dx, y+dy);
  if (!draggable) {
    this._dpoint._radius = 2;
  }
  this._dpoint._clamp = function () {
    this._x = Math.max(space.x, Math.min(space.x+space.width, this._x));
    this._y = Math.max(space.y, Math.min(space.y+space.width, this._y));
  };
  this._x = x;
  this._y = y;
  this._strokeStyle = color;
}
Vector.extend({
  addDraggables : function (list) {
    list.push(this._dpoint);
  },
  paint : function (ctxt) {
    ctxt.lineWidth = 5;
    ctxt.strokeStyle = this._strokeStyle;
    ctxt.beginPath();
    ctxt.moveTo(this._x, this._y);
    ctxt.lineTo(this._dpoint._x, this._dpoint._y);
    ctxt.stroke();
    this._dpoint._fillStyle = this._strokeStyle;
    this._dpoint.paint(ctxt);
  },
  dx : function () {
    return this._dpoint._x - this._x;
  },
  dy : function () {
    return this._dpoint._y - this._y;
  },
  set : function (dx, dy) {
    this._dpoint.moveTo(new Pt(this._x + dx, this._y + dy));
  }
});

function VectorSpace(x, y, width, height, draggable, image) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this._draggable = draggable;
  this.v1 = new Vector(this, x+width/2, y+height/2, 50, 0, "#0b0", draggable);
  this.v2 = new Vector(this, x+width/2, y+height/2, 0, -50, "#b00", draggable);
  this.image = image;

  this.preimageOf = null;
}
VectorSpace.extend({
  addDraggables : function (list) {
    if (this._draggable) {
      this.v1.addDraggables(list);
      this.v2.addDraggables(list);
    }
  },
  reset : function () {
    this.v1.set(50, 0);
    this.v2.set(0, -50);
  },
  computeCoordinate : function (px, py) {
    var x1 = this.v1.dx(),
        y1 = this.v1.dy(),
        x2 = this.v2.dx(),
        y2 = this.v2.dy();
    var det = x1 * y2 - y1 * x2;
    if (Math.abs(det) > 1e-3) {
      var x = (px * y2 - py * x2) / det,
          y = (-px * y1 +py * x1) / det;
      return new Pt(x, y);
    } else {
      return null;
    }
  },
  paint : function (ctxt) {
    ctxt.lineWidth = 1;
    ctxt.strokeStyle = "#aaa";
    ctxt.fillStyle = "#87cefa";
    ctxt.fillRect(this.x, this.y, this.width, this.height);
    ctxt.strokeRect(this.x, this.y, this.width, this.height);

    ctxt.save();
    ctxt.beginPath();
    ctxt.rect(this.x, this.y, this.width, this.height);
    ctxt.clip();

    ctxt.save();
    var scale = 50.0;
    var imagecx = this.image.width/2,
        imagecy = this.image.height/2;
    var imagedim = Math.min(this.image.width, this.image.height);
    ctxt.transform(this.v1.dx()/scale, this.v1.dy()/scale,
                   -this.v2.dx()/scale, -this.v2.dy()/scale,
                   this.x + this.width/2, this.y + this.height/2);
    ctxt.drawImage(this.image,
                   imagecx-imagedim/2, imagecy-imagedim/2, imagedim, imagedim,
                   -this.width/2, -this.height/2, this.width, this.height);
    ctxt.restore();

    var cx = this.x + this.width/2;
    var cy = this.y + this.height/2;
    var num = 3;

    var V = this.preimageOf || this;
    var entries = [[V.v1.dx()/50, V.v2.dx()/50],
                   [-V.v1.dy()/50, -V.v2.dy()/50]];
    var det = entries[0][0] * entries[1][1] - entries[0][1] * entries[1][0];
    var tr = entries[0][0] + entries[1][1];
    var disc = tr*tr - 4*det;
    if (disc >= 0) {
      var l1 = (tr + Math.sqrt(disc)) / 2,
          l2 = (tr - Math.sqrt(disc)) / 2;
      var a1 = nul([[entries[0][0] - l1, entries[0][1]],
                    [entries[1][0], entries[1][1] - l1]], 0),
          a2 = nul([[entries[0][0] - l2, entries[0][1]],
                    [entries[1][0], entries[1][1] - l2]], 1);
      if (this.preimageOf === null) {
        a1[0] *= l1;
        a1[1] *= l1;
        a2[0] *= l2;
        a2[1] *= l2;
      }
//      console.log(l1, l2);
//      console.log(a1, a2);
      ctxt.lineWidth = 1;
      ctxt.strokeStyle = "#6eb5e1";
      ctxt.beginPath();
      for (var i = -num; i <= num; i++) {
        ctxt.moveTo(cx - 50*num*a1[0] + 50*i*a2[0], cy + 50*num*a1[1] - 50*i*a2[1]);
        ctxt.lineTo(cx + 50*num*a1[0] + 50*i*a2[0], cy - 50*num*a1[1] - 50*i*a2[1]);
        ctxt.moveTo(cx + 50*i*a1[0] - 50*num*a2[0], cy - 50*i*a1[1] + 50*num*a2[1]);
        ctxt.lineTo(cx + 50*i*a1[0] + 50*num*a2[0], cy - 50*i*a1[1] - 50*num*a2[1]);
      }
      ctxt.stroke();
    }

    /*
    ctxt.strokeStyle = "#999";
    ctxt.beginPath();
    for (var i = -num; i <= num; i++) {
      ctxt.moveTo(cx - num*this.v1.dx() + i*this.v2.dx(), cy - num*this.v1.dy() + i*this.v2.dy());
      ctxt.lineTo(cx + num*this.v1.dx() + i*this.v2.dx(), cy + num*this.v1.dy() + i*this.v2.dy());
      ctxt.moveTo(cx + i*this.v1.dx() - num*this.v2.dx(), cy + i*this.v1.dy() - num*this.v2.dy());
      ctxt.lineTo(cx + i*this.v1.dx() + num*this.v2.dx(), cy + i*this.v1.dy() + num*this.v2.dy());
    }
    
     ctxt.stroke();*/
    
    ctxt.restore();
    
    this.v1.paint(ctxt);
    this.v2.paint(ctxt);
  }
});

function BasisMatrix(space, x, y) {
  this.space = space;
  this.x = x;
  this.y = y;
  this.xdim = 110;
  this.ydim = 80;
};
BasisMatrix.extend({
  addDraggables : function () {},
  paint : function (ctxt) {
    /*ctxt.fillStyle = "#eee";
     ctxt.fillRect(this.x, this.y, this.xdim, this.ydim);*/

    ctxt.strokeStyle = "#000";
    ctxt.lineWidth = 3;
    ctxt.beginPath();
    ctxt.moveTo(this.x + 6 + 10, this.y + 6);
    ctxt.lineTo(this.x + 6, this.y + 6);
    ctxt.lineTo(this.x + 6, this.y+this.ydim - 6);
    ctxt.lineTo(this.x + 6 + 10, this.y+this.ydim - 6);
    ctxt.moveTo(this.x + this.xdim - 6 - 10, this.y + 6);
    ctxt.lineTo(this.x + this.xdim - 6, this.y + 6);
    ctxt.lineTo(this.x + this.xdim - 6, this.y+this.ydim - 6);
    ctxt.lineTo(this.x + this.xdim - 6 - 10, this.y+this.ydim - 6);
    // arrow
    ctxt.moveTo(this.x, this.y+this.ydim+20);
    ctxt.lineTo(this.x+this.xdim, this.y+this.ydim+20);
    ctxt.moveTo(this.x+this.xdim-20, this.y+this.ydim+10);
    ctxt.lineTo(this.x+this.xdim+1, this.y+this.ydim+20);
    ctxt.lineTo(this.x+this.xdim-20, this.y+this.ydim+30);
    ctxt.stroke();

    var entries = [[this.space.v1._strokeStyle, this.space.v1.dx()/50, -this.space.v1.dy()/50],
                   [this.space.v2._strokeStyle, this.space.v2.dx()/50, -this.space.v2.dy()/50]];
    ctxt.font = "18px serif";
    for (var j = 0; j < 2; j++) {
      ctxt.fillStyle = entries[j][0];
      for (var i = 0; i < 2; i++) {
        ctxt.fillText(entries[j][i+1].toFixed(2),
                      this.x + 6 + 10 + j * 46,
                      this.y + 6 + 25 + i * 18*1.5);
      }
    }

    var det = entries[0][1] * entries[1][2] - entries[0][2] * entries[1][1];
    if (Math.abs(det) > 1e-4) {
      ctxt.fillStyle = "#000";
    } else {
      ctxt.fillStyle = "#b00";
    }
    ctxt.fillText("(det = " + det.toFixed(2) + ")", this.x+10, this.y+this.ydim+80);

    ctxt.fillStyle = "#000";
    ctxt.fillText("eigenvalues:", this.x+4, this.y + this.ydim + 102);
    var tr = entries[0][1] + entries[1][2];
    var disc = tr*tr - 4*det;
    if (disc >= 0) {
      var l1 = (tr + Math.sqrt(disc)) / 2,
          l2 = (tr - Math.sqrt(disc)) / 2;
      ctxt.fillText(l1.toFixed(2), this.x + 10, this.y + this.ydim + 119);
      ctxt.fillText(l2.toFixed(2), this.x + 10, this.y + this.ydim + 134);
    } else {
      ctxt.fillStyle = "#b00";
      ctxt.fillText("complex", this.x + 4, this.y + this.ydim + 119);
    }
  }
});

function zero(x) {
  return Math.abs(x) < 1e-5;
}
function nul(A, i) {
//  console.log(i);
//  console.log(A[0], A[1]);
  var row = A[0];
  if (zero(row[0]) && zero(row[1])) {
    row = A[1];
  }
  if (zero(row[0]) && zero(row[1])) {
    if (i === 0) {
      return [1,0];
    } else {
      return [0,1];
    }
  }
  var len = Math.sqrt(row[0]*row[0] + row[1]*row[1]);
  return [row[1]/len, -row[0]/len];
}

function BasisToy(canvas, image) {
  this.canvas = canvas;
  this.ctxt = this.canvas.getContext("2d");
  var ratio = getPixelRatio(this.ctxt);
  if (ratio !== 1) {
    var width = canvas.width;
    var height = canvas.height;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = width * 2;
    canvas.height = height * 2;
    this.ctxt.scale(2,2);
  }
  this.dim = this.canvas.getBoundingClientRect();
  this.cevents = new CanvasEvents(canvas);
  this.cevents.addEventListener(this);

  this._mousept = null;
  this._mouseactive = false;

  this._redraw = null;
  this._repaintLater = false;
  
  this._selected = null;

  var vs1 = new VectorSpace(10,10,300,300, false, image);
  var vs2 = new VectorSpace(440,10,300,300, true, image);
  this.vs2 = vs2;
  vs1.preimageOf = vs2;

  this.objects = [vs1, vs2, new BasisMatrix(vs2, 320, 60)];
  this.draggables = [];

  for (var i = 0; i < this.objects.length; i++) {
    this.objects[i].addDraggables(this.draggables);
  }
}
BasisToy.extend({
  mousedown : function (pt) {
    this._mousept = pt;
    this._mouseactive = true;

    this.updateSelection();

    if (this._selected !== null) {
      this._offset = this._selected.offset(this._mousept);
    }
    
    this.repaint();
  },
  mouseup : function () {
    this._mouseactive = false;
    this._offset = null;
    this.repaint();
  },
  mousemove : function (pt, isdown) {
    this._mousept = pt;
    this._mouseactive = isdown;
    if (isdown) {
      if (this._selected !== null) {
        this._selected.moveTo(this._mousept, this._offset);
      }
    } else {
      this.updateSelection();
    }
    this.repaint();
  },
  mouseleave : function () {
    this._mousept = null;
    this._mouseactive = false;
    this.updateSelection();
    this.repaint();
  },
  updateSelection : function () {
    this._selected = null;
    for (var i = 0; i < this.draggables.length; i++) {
      this.draggables[i].deselect();
      if (this._mousept !== null && this.draggables[i].containsPoint(this._mousept)) {
        this._selected = this.draggables[i];
      }
    }
    if (this._selected !== null) {
      this._selected.select();
    }
  },
  repaint : function () {
    if (this._redraw === null) {
      var self = this;
      this._redraw = window.setTimeout(function () {
        if (self._repaintLater)
          self.paint(self.ctxt);
        self._redraw = null;
        self._repaintLater = false;
      }, 0);
      self.paint(this.ctxt);
    } else {
      this._repaintLater = true;
    }
  },
  paint : function (ctxt) {
    ctxt.fillStyle = "#fff";
    ctxt.fillRect(0, 0, this.dim.width, this.dim.height);

    for (var i = 0; i < this.objects.length; i++) {
      this.objects[i].paint(ctxt);
    }
  },
  reset : function () {
    this.vs2.reset();
    this.repaint();
  }
});

window.addEventListener("load", function () {
  var canvas = document.getElementById("canvas");
  var basisToy = new BasisToy(canvas, document.getElementById("image"));
  
  document.getElementById("reset").addEventListener("click", function () {
    basisToy.reset();
  }, false);
  basisToy.repaint();
}, false);
