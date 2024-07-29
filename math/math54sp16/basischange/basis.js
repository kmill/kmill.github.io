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
    if (!tentative || Math.abs(newx - this._x) > 1e-2 || Math.abs(newy - this._y) > 1e-2) {
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
  this._draggable = draggable;
  if (!draggable) {
    this._dpoint._radius = 2;
  }
  this._dpoint._clamp = function () {
    this._x = Math.max(space.x, Math.min(space.x+space.width, this._x));
    this._y = Math.max(space.y, Math.min(space.y+space.width, this._y));
  };
  this._dpoint._moved = function () {
    space.update(true);
  };
  this._x = x;
  this._y = y;
  this._strokeStyle = color;
}
Vector.extend({
  addDraggables : function (list) {
    if (this._draggable) {
      list.push(this._dpoint);
    }
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

function Basis(space, options) {
  this.gridColor = options.gridColor || "#aaa";
  this.v1 = new Vector(space, space.x+space.width/2, space.y+space.height/2,
                       options.v1.dx, options.v1.dy, options.v1.color, options.draggable);
  this.v2 = new Vector(space, space.x+space.width/2, space.y+space.height/2,
                       options.v2.dx, options.v2.dy, options.v2.color, options.draggable);
}
Basis.extend({
  addDraggables : function (list) {
    this.v1.addDraggables(list);
    this.v2.addDraggables(list);
  },
  paint : function (ctxt) {
    this.v1.paint(ctxt);
    this.v2.paint(ctxt);
  },
  computeCoordinate : function (px, py) {
    var x1 = this.v1.dx(),
        y1 = this.v1.dy(),
        x2 = this.v2.dx(),
        y2 = this.v2.dy();
    var det = x1 * y2 - y1 * x2;
    if (Math.abs(det) > 1e-2) {
      var x = (px * y2 - py * x2) / det,
          y = (-px * y1 +py * x1) / det;
      return new Pt(x, y);
    } else {
      return null;
    }
  },
  fromCoordinate : function (x, y) {
    return new Offset(x * this.v1.dx() + y*this.v2.dx(),
                      x * this.v1.dy() + y*this.v2.dy());
  }
});

function VectorSpace(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.bases = [];
  this.pt = new DraggablePoint(x+width/2, y+width/2);

  this.preimageOf = [];

  var space = this;
  this.pt._clamp = function () {
    this._x = Math.max(space.x, Math.min(space.x+space.width, this._x));
    this._y = Math.max(space.y, Math.min(space.y+space.width, this._y));
  };
  this.pt._moved = function () {
    space.update(true);
  };

  this.coordinateListeners = [];
}
VectorSpace.extend({
  addBasis : function (options) {
    var basis = new Basis(this, options);
    this.bases.push(basis);
    return basis;
  },
  addDraggables : function (list) {
    this.bases.forEach(function (basis) { basis.addDraggables(list); });
    list.push(this.pt);
  },
  reset : function () {
    this.bases[0].v1.set(50, 0);
    this.bases[0].v2.set(0, -50);
    this.setPoint(this.bases[0], 0, 0);
  },
  update : function (first) {
    // if (first) {
    //   VectorSpace.depth = 0;
    // }
    // VectorSpace.depth++;
    // if (VectorSpace.depth > 10) {
    //   this.pt.moveTo(new Pt(0, 0));
    //   return;
    // }
    var enable = true;
    for (var i = 0; i < this.coordinateListeners.length; i++) {
      var listener = this.coordinateListeners[i];
      var px = this.pt._x - (this.x + this.width/2),
          py = this.pt._y - (this.y + this.height/2);
      if (isNaN(px) || isNaN(py))
        return;
      var coord = listener.basis.computeCoordinate(px, py);
      if (enable && coord !== null) {
        listener.coordinate(coord.x, coord.y);
      } else {
        enable = false;
        listener.coordinate(null, null);
      }
    }
    if (enable) {
      this.pt.enable();
    } else {
      this.pt.moveTo(null);
    }
  },
  setPoint : function (basis, x, y) {
    if (x === null) {
      this.pt.moveTo(null);
      return;
    }
    var offset = basis.fromCoordinate(x, y);
    this.pt.moveTo(new Pt(this.x + this.width/2 + offset.dx,
                          this.y + this.height/2 + offset.dy),
                   void 0,
                   true);
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

    for (var i = 0; i < this.preimageOf.length; i++) {
      var pio = this.preimageOf[i];
      var p1 = pio.computeCoordinate(-3 * 50, -3 * 50),
          p2 = pio.computeCoordinate(3 * 50, -3 * 50),
          p3 = pio.computeCoordinate(3 * 50, 3 * 50),
          p4 = pio.computeCoordinate(-3 * 50, 3 * 50);
      if (!(p1 === null || p2 === null || p3 === null || p4 === null)) {
        ctxt.lineWidth = 1;
        ctxt.strokeStyle = "#6eb5e1";
        ctxt.beginPath();
        ctxt.moveTo(this.x + this.width / 2 + 50*p1.x, this.y + this.height/2 - 50*p1.y);
        ctxt.lineTo(this.x + this.width / 2 + 50*p2.x, this.y + this.height/2 - 50*p2.y);
        ctxt.lineTo(this.x + this.width / 2 + 50*p3.x, this.y + this.height/2 - 50*p3.y);
        ctxt.lineTo(this.x + this.width / 2 + 50*p4.x, this.y + this.height/2 - 50*p4.y);
        ctxt.lineTo(this.x + this.width / 2 + 50*p1.x, this.y + this.height/2 - 50*p1.y);
        
        ctxt.stroke();
      }
    }


    for (var basisnum = 0; basisnum < this.bases.length; basisnum++) {
      ctxt.beginPath();
      var basis = this.bases[basisnum];
      ctxt.strokeStyle = basis.gridColor;
      var cx = this.x + this.width/2;
      var cy = this.y + this.height/2;
      var num = 3;
      for (var i = -num; i <= num; i++) {
        ctxt.moveTo(cx - num*basis.v1.dx() + i*basis.v2.dx(), cy - num*basis.v1.dy() + i*basis.v2.dy());
        ctxt.lineTo(cx + num*basis.v1.dx() + i*basis.v2.dx(), cy + num*basis.v1.dy() + i*basis.v2.dy());
        ctxt.moveTo(cx + i*basis.v1.dx() - num*basis.v2.dx(), cy + i*basis.v1.dy() - num*basis.v2.dy());
        ctxt.lineTo(cx + i*basis.v1.dx() + num*basis.v2.dx(), cy + i*basis.v1.dy() + num*basis.v2.dy());
      }
      ctxt.stroke();
    }
    

    ctxt.restore();

    this.bases.forEach(function (basis) { basis.paint(ctxt); });

    this.pt.paint(ctxt);
  }
});

function BasisMatrix(basis, x, y, options) {
  this.basis = basis;
  this.x = x;
  this.y = y;
  this.xdim = 110;
  this.ydim = 80;
  this.options = options || {};
};
BasisMatrix.extend({
  addDraggables : function () {},
  paint : function (ctxt) {
    /*ctxt.fillStyle = "#eee";
     ctxt.fillRect(this.x, this.y, this.xdim, this.ydim);*/

    ctxt.save();
    ctxt.translate(this.x, this.y);

    ctxt.strokeStyle = "#000";
    ctxt.lineWidth = 3;
    ctxt.beginPath();
    ctxt.moveTo(6 + 10, 6);
    ctxt.lineTo(6, 6);
    ctxt.lineTo(6, this.ydim - 6);
    ctxt.lineTo(6 + 10, this.ydim - 6);
    ctxt.moveTo(this.xdim - 6 - 10, 6);
    ctxt.lineTo(this.xdim - 6, 6);
    ctxt.lineTo(this.xdim - 6, this.ydim - 6);
    ctxt.lineTo(this.xdim - 6 - 10, this.ydim - 6);

    var entries = [[this.basis.v1._strokeStyle, this.basis.v1.dx()/50, -this.basis.v1.dy()/50],
                   [this.basis.v2._strokeStyle, this.basis.v2.dx()/50, -this.basis.v2.dy()/50]];
    ctxt.font = "18px serif";
    for (var j = 0; j < 2; j++) {
      ctxt.fillStyle = entries[j][0];
      for (var i = 0; i < 2; i++) {
        ctxt.fillText(entries[j][i+1].toFixed(2),
                      6 + 10 + j * 46,
                      6 + 25 + i * 18*1.5);
      }
    }

    // arrow
    if (this.options.direction === "down") {
      ctxt.rotate(2*Math.PI/4);
    } else {
      ctxt.translate(0, this.ydim);
    }
    ctxt.moveTo(0, 20);
    ctxt.lineTo(this.xdim, 20);
    ctxt.moveTo(this.xdim-20, 10);
    ctxt.lineTo(this.xdim+1, 20);
    ctxt.lineTo(this.xdim-20, 30);
    ctxt.stroke();


/*    var det = entries[0][1] * entries[1][2] - entries[0][2] * entries[1][1];
    if (Math.abs(det) > 1e-4) {
      ctxt.fillStyle = "#000";
    } else {
      ctxt.fillStyle = "#b00";
    }
    ctxt.fillText("(det = " + det.toFixed(2) + ")", this.x+10, this.ydim+80);
 */

    ctxt.restore();
  }
});

function BasisToy(canvas) {
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

  var vsc1 = new VectorSpace(10,10,300,300);
  var vsc2 = new VectorSpace(10,440,300,300);
  var vsb = new VectorSpace(440,230,300,300);

  var vsc1_basis = vsc1.addBasis({
    v1: {dx:50, dy:0, color:"#0b0"},
    v2: {dx:0, dy:-50, color:"#b00"},
    gridColor: "#caa",
    draggable: false
  });
  var basis_change = vsc2.addBasis({
    v1: {dx:50, dy:0, color:"#0b0"},
    v2: {dx:0, dy:-50, color:"#b00"},
    gridColor: "#caa",
    draggable: false
  });
  var vsc2_basis = vsc2.addBasis({
    v1: {dx:50, dy:0, color:"#33b"},
    v2: {dx:0, dy:-50, color:"#aa0"},
    gridColor: "#aac",
    draggable: false
  });
  var vsb_basis1 = vsb.addBasis({
    v1: {dx:50, dy:0, color:"#0b0"},
    v2: {dx:0, dy:-50, color:"#b00"},
    gridColor: "#caa",
    draggable: true
  });
  var vsb_basis2 = vsb.addBasis({
    v1: {dx:25, dy:-25, color:"#33b"},
    v2: {dx:-25, dy:-25, color:"#aa0"},
    gridColor: "#aac",
    draggable: true
  });
  
//  this.vs2 = vs2;
  vsc1.preimageOf.push(vsb_basis1);
  vsc2.preimageOf.push(vsb_basis2);
  vsc1.preimageOf.push(basis_change);

  vsc1.coordinateListeners.push({
    basis: vsc1_basis,
    coordinate: function (x, y) {
      vsb.setPoint(vsb_basis1, x, y);
    }
  });
  vsc2.coordinateListeners.push({
    basis: vsc2_basis,
    coordinate: function (x, y) {
      vsb.setPoint(vsb_basis2, x, y);
    }
  });
  vsb.coordinateListeners.push({
    basis: vsb_basis1,
    coordinate: function (x, y) {
      vsc1.setPoint(vsc1_basis, x, y);
    }
  });
  vsb.coordinateListeners.push({
    basis: vsb_basis2,
    coordinate: function (x, y) {
      vsc2.setPoint(vsc2_basis, x, y);
    }
  });

  this.recomputeBasisChange = function () {
    var v1 = vsb_basis1.v1, v2 = vsb_basis1.v2;
    var v1_c = vsb_basis2.computeCoordinate(v1.dx(), v1.dy());
    var v2_c = vsb_basis2.computeCoordinate(v2.dx(), v2.dy());
    if (v1_c == null || v2_c == null) {
    } else {
      var w1 = vsc2_basis.fromCoordinate(v1_c.x, v1_c.y);
      var w2 = vsc2_basis.fromCoordinate(v2_c.x, v2_c.y);
      basis_change.v1.set(w1.dx, w1.dy);
      basis_change.v2.set(w2.dx, w2.dy);
    }
  };
  
  this.objects = [vsc1, vsc2, vsb,
                  new BasisMatrix(vsb_basis1, 320, 200),
                  new BasisMatrix(vsb_basis2, 320, 400),
                  new BasisMatrix(basis_change, 110, 320, {direction:"down"}),];
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
  animate : function (timestamp) {
    this.draw(timestamp);
    this.beginAnimate();
  },
  paint : function (ctxt) {

    this.recomputeBasisChange();
    
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
  var basisToy = new BasisToy(canvas);
  document.getElementById("reset").style.display = "none";
  document.getElementById("reset").addEventListener("click", function () {
    basisToy.reset();
  }, false);
  basisToy.repaint();
}, false);
