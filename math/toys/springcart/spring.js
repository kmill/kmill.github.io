"use strict";

function Pt(x, y) {
  this.x = x;
  this.y = y;
}
function mousePt(mouseEvent) {
  return new Pt(mouseEvent.offsetX, mouseEvent.offsetY);
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

  this.active = false;
  this.path = [];
}
CanvasEvents.extend({
  mousedown : function (e) {
    if (e.button === 0) {
      e.preventDefault();
      this.active = true;
      this.path = [mousePt(e)];
      this.notifyListeners("beginMousePath", this.path);
    }
  },
  mouseup : function (e) {
    if (this.active) {
      e.preventDefault();
      this.active = false;
      this.notifyListeners("endMousePath", this.path);
    }
  },
  mousemove : function (e) {
    e.preventDefault();
    if (this.active) {
      var newPt = mousePt(e);
      var lastPt = this.path[this.path.length - 1];
      this.path.push(newPt);
      this.notifyListeners("updateMousePath", this.path);
    } else {
      this.notifyListeners("mouseMove", mousePt(e));
    }
  },
  mouseleave : function () {
    this.notifyListeners("mouseLeave");
  },
  touchstart : function (e) {
    e.preventDefault();
    this.active = true;
    this.path = [mousePt(e.targetTouches[0])];
    this.notifyListeners("beginMousePath", this.path);
  },
  touchend : function (e) {
    if (this.active) {
      e.preventDefault();
      this.active = false;
      this.notifyListeners("endMousePath", this.path);
    }
  },
  touchmove : function (e) {
    if (this.active) {
      e.preventDefault();
      var newPt = mousePt(e.targetTouches[0]);
      var lastPt = this.path[this.path.length - 1];
      this.path.push(newPt);
      this.notifyListeners("updateMousePath", this.path);
    } else {
      this.notifyListeners("mouseMove", mousePt(e.targetTouches[0]));
    }
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

function SpringSim(canvas) {
  this.canvas = canvas;
  this.ctxt = this.canvas.getContext("2d");
  this.dim = this.canvas.getBoundingClientRect();
  this.cevents = new CanvasEvents(canvas);
  this.cevents.addEventListener(this);

  this.last_t = null;

  this.obj_x = 0;
  this.obj_vx = 0;
  this.obj_mass = 0.5;
  this.spring_beginning_x = this.spring_x = -200;
  this.spring_rest_length = 200;
  this.spring_constant = 4;
  this.friction = 7;

  this.spring_drive_freq = 0.5;
  this.spring_drive_ampl = 20;
  this.spring_drive_angle = 0;

  this.spring_drive_freq = Math.sqrt(this.spring_constant / this.obj_mass) / (2 * Math.PI);

  this.mousept = null;
  this.checkInMass = function (mousept) { return false; };
  this.checkInDrive = function (mousept) { return false; };
  this.mouseDriveAngle = function (mousept) { return 0; };
  this.obj_saved_x = null;
  this.drive_saved_ang = null;
}
SpringSim.extend({
  beginMousePath : function (path) {
    this.mousept = null;
    if (this.checkInMass(path[0])) {
      this.obj_saved_x = this.obj_x;
      this.obj_vx = 0;
      this.start_mouse = path[0];
      this.curr_mouse = path[0];
    } else if (this.checkInDrive(path[0])) {
      this.drive_saved_ang = this.spring_drive_angle;
      this.spring_drive_freq = 0;
      this.start_drive_mouse = path[0];
      this.curr_mouse = path[0];
    }
  },
  updateMousePath : function (path) {
    this.curr_mouse = path[path.length - 1];
  },
  endMousePath : function (path) {
    this.mousept = null;
    this.curr_mouse = null;
    this.start_mouse = null;
    this.start_drive_mouse = null;
  },
  mouseMove : function (pt) {
    this.mousept = pt;
  },
  mouseLeave : function () {
    this.mousept = null;
  },
  beginAnimate : function () {
    var self = this;
    window.requestAnimationFrame(function (timestamp) {
      self.animate(timestamp);
    });
  },
  animate : function (timestamp) {
    this.draw(timestamp);
    this.beginAnimate();
  },
  draw : function (t) {
    if (this.last_t === null) {
      this.last_t = t - 1000/30.0; // probably 30fps.
    }
    var dt = (t - this.last_t) / 1000.0; // in seconds
    this.last_t = t;
    dt = Math.min(dt, 0.1); // don't want dt to be too big

    var substeps = 4;
    for (var i = 0; i < substeps; i++) {
      this.update_simulation(dt/substeps, i === substeps - 1, dt);
    }

    var ctxt = this.ctxt;
    ctxt.fillStyle = "#87cefa";
    ctxt.fillRect(0, 0, this.dim.width, this.dim.height);
    ctxt.fillStyle = "#59a139";
    ctxt.fillRect(0, this.dim.height / 2, this.dim.width, this.dim.height / 2 + 1);

    var zero_x = this.dim.width / 2;
    var zero_y = this.dim.height / 2;
    var mass_center_x = this.obj_x + zero_x;
    var mass_center_y = zero_y;

    var wheel_x = zero_x + this.spring_beginning_x;
    var wheel_y = zero_y;
    var dwheel_radius = 1.2 * this.spring_drive_ampl;
    this.checkInDrive = function (mousept) {
      var dx = mousept.x - wheel_x;
      var dy = mousept.y - wheel_y;
      return dx * dx + dy * dy <= dwheel_radius * dwheel_radius;
    };
    this.mouseDriveAngle = function (mousept) {
      var dx = mousept.x - wheel_x;
      var dy = mousept.y - wheel_y;
      return Math.atan2(dy, dx);
    };

    ctxt.fillStyle = "#ccc";
    ctxt.beginPath();
    var major_mark = 150;
    for (var i = -1; i <= 1; i++) {
      ctxt.moveTo(zero_x+i*major_mark, zero_y);
      ctxt.lineTo(zero_x-2+i*major_mark, this.dim.height);
      ctxt.lineTo(zero_x+2+i*major_mark, this.dim.height);
      ctxt.lineTo(zero_x+i*major_mark, zero_y);
    }
    ctxt.fill();

    ctxt.fillStyle = "#ccc";
    ctxt.lineWidth = 2;
    ctxt.beginPath();
    ctxt.arc(wheel_x, wheel_y, dwheel_radius, 0, Math.PI * 2, true);
    ctxt.fill();
    if (this.start_drive_mouse || (this.mousept && this.checkInDrive(this.mousept))) {
      ctxt.strokeStyle = "#fff";
      ctxt.stroke();
    }
    ctxt.strokeStyle = "#333";
    var drive_x = this.spring_drive_ampl * Math.sin(this.spring_drive_angle);
    var drive_y = -this.spring_drive_ampl * Math.cos(this.spring_drive_angle);
    ctxt.lineWidth = 2;
    ctxt.beginPath();
    ctxt.moveTo(wheel_x + drive_x-2, wheel_y + dwheel_radius);
    ctxt.lineTo(wheel_x + drive_x-2, wheel_y - dwheel_radius);
    ctxt.moveTo(wheel_x + drive_x+2, wheel_y + dwheel_radius);
    ctxt.lineTo(wheel_x + drive_x+2, wheel_y - dwheel_radius);
    ctxt.stroke();
    ctxt.beginPath();
    ctxt.arc(wheel_x + drive_x, wheel_y + drive_y, 3, 0, Math.PI * 2, true);
    ctxt.fill();

    ctxt.strokeStyle = "#333";
    ctxt.lineWidth = 3;
    ctxt.lineJoin = "round";
    ctxt.beginPath();
    ctxt.moveTo(zero_x + this.spring_x, zero_y);
    var spring_kinks = 20;
    var spring_radius = 10;
    var spring_kink_delta = (mass_center_x - (zero_x + this.spring_x)) / spring_kinks;
    for (var i = 0; i < spring_kinks; i++) {
      ctxt.lineTo(zero_x + this.spring_x + spring_kink_delta * (i + 1/4), zero_y + spring_radius);
      ctxt.lineTo(zero_x + this.spring_x + spring_kink_delta * (i + 3/4), zero_y - spring_radius);
      ctxt.lineTo(zero_x + this.spring_x + spring_kink_delta * (i + 4/4), zero_y);
    }
    ctxt.stroke();

    this.checkInMass = function (mousept) {
      return (between(mousept.x, mass_center_x-30, mass_center_x+30)
              && between(mousept.y, mass_center_y-30, mass_center_y+30));
    };

    // mass body
    ctxt.fillStyle = "rgba(128,128,128,0.9)";
    ctxt.lineJoin = "miter";
    ctxt.fillRect(mass_center_x-30,mass_center_y-30,60,40);
    ctxt.strokeStyle = "#555";
    ctxt.lineWidth = 2;
    ctxt.beginPath();
    if (this.start_mouse || (this.mousept !== null && this.checkInMass(this.mousept))) {
      ctxt.strokeStyle = "#ccc";
    }
    ctxt.rect(mass_center_x-30,mass_center_y-30,60,40);
    ctxt.stroke();

    // wheels
    var wheel_radius = 8;
    var wheel_spin = this.obj_x / wheel_radius; // radians
    ctxt.fillStyle = "#666";
    ctxt.lineWidth = 1;
    ctxt.strokeStyle = "#555";
    ctxt.beginPath();
    ctxt.arc(mass_center_x+15,mass_center_y+20,wheel_radius,0,Math.PI*2,true);
    ctxt.fill();
    ctxt.stroke();
    ctxt.beginPath();
    ctxt.arc(mass_center_x-15,mass_center_y+20,wheel_radius,0,Math.PI*2,true);
    ctxt.fill();
    ctxt.stroke();
    var wheel_dx = Math.cos(wheel_spin);
    var wheel_dy = Math.sin(wheel_spin);
    ctxt.beginPath();
    ctxt.moveTo(mass_center_x+15 - wheel_dx*wheel_radius,mass_center_y+20 - wheel_dy*wheel_radius);
    ctxt.lineTo(mass_center_x+15 + wheel_dx*wheel_radius,mass_center_y+20 + wheel_dy*wheel_radius);
    ctxt.moveTo(mass_center_x-15 - wheel_dx*wheel_radius,mass_center_y+20 - wheel_dy*wheel_radius);
    ctxt.lineTo(mass_center_x-15 + wheel_dx*wheel_radius,mass_center_y+20 + wheel_dy*wheel_radius);
    ctxt.moveTo(mass_center_x+15 - wheel_dy*wheel_radius,mass_center_y+20 + wheel_dx*wheel_radius);
    ctxt.lineTo(mass_center_x+15 + wheel_dy*wheel_radius,mass_center_y+20 - wheel_dx*wheel_radius);
    ctxt.moveTo(mass_center_x-15 - wheel_dy*wheel_radius,mass_center_y+20 + wheel_dx*wheel_radius);
    ctxt.lineTo(mass_center_x-15 + wheel_dy*wheel_radius,mass_center_y+20 - wheel_dx*wheel_radius);
    ctxt.stroke();
  },
  update_simulation : function (dt, mouse_step, real_dt) {
    // we have friction in our model because Euler's method causes
    // overshoot.  The system gains energy!

    var last_x = this.obj_x;

    if (this.start_drive_mouse) {
      var ang1 = this.mouseDriveAngle(this.start_drive_mouse);
      var ang2 = this.mouseDriveAngle(this.curr_mouse);
      var last_drive_angle = this.spring_drive_angle;
      if (mouse_step) {
        this.spring_drive_angle = this.drive_saved_ang + ang2 - ang1;
      }
      this.spring_drive_freq = (this.spring_drive_angle - last_drive_angle) / (2 * Math.PI * real_dt);
    } else {
      this.spring_drive_angle += 2 * Math.PI * this.spring_drive_freq * dt;
    }
    this.spring_x = this.spring_beginning_x + this.spring_drive_ampl * Math.sin(this.spring_drive_angle);
    
    // Fspring = k(rest_pos - x)
    var force = this.spring_constant * (this.spring_x + this.spring_rest_length - this.obj_x);
    // Ffriction = - friction * mass * (+1 if velocity positive, -1 if negative, 0 if 0)
    force -= this.friction * this.obj_mass * Math.sign(this.obj_vx);
    // F = ma
    var obj_ax = force / this.obj_mass;
    // Euler's method step
    this.obj_x += dt * this.obj_vx;
    this.obj_vx += dt * obj_ax;

    // to keep from having weird non-spring-like behavior, we will keep the cart on the right side
    if (this.obj_x < this.spring_x) {
      var drive_velocity = this.spring_drive_ampl * Math.cos(this.spring_drive_angle);
      this.obj_vx = -0.8 * (this.obj_vx - drive_velocity) + drive_velocity; // in spring ref frame
      this.obj_x = 2 * this.spring_x - this.obj_x; // reflect over spring position
    }

    if (this.start_mouse) {
      if (mouse_step) {
        this.obj_x = this.curr_mouse.x - this.start_mouse.x + this.obj_saved_x;
      }
      this.obj_vx = (this.obj_x-last_x)/real_dt;
    }
  }
});

window.addEventListener("load", function () {
  var sim1 = new SpringSim(document.getElementById("canvas"));
  sim1.beginAnimate();
}, false);
