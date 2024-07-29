"use strict";

let params = {
  m: 1.0,
  c: 0.2,
  k: 2.0,
  x: 1.0,
  dx: 0.0
};

var parameter_handlers = {};
function add_parameter_handler(varname, handler) {
  let list = parameter_handlers[varname];
  if (!list) {
    list = parameter_handlers[varname] = [];
  }
  list.push(handler);
  return handler;
}

function set_parameter(varname, value) {
  params[varname] = value;
  (parameter_handlers[varname] || []).forEach(handler => {
    handler(value);
  });
}

function between(x, a, b) {
  return a <= x && x <= b;
}

class Pt {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

function mousePt(mouseEvent) {
  return new Pt(mouseEvent.offsetX, mouseEvent.offsetY);
}

class CanvasEvents {
  constructor(canvas) {
    canvas.addEventListener("mousedown", this.mousedown.bind(this), false);
    canvas.addEventListener("mouseup", this.mouseup.bind(this), false);
    canvas.addEventListener("mousemove", this.mousemove.bind(this), false);
    canvas.addEventListener("mouseleave", this.mouseleave.bind(this), false);

    canvas.addEventListener("touchstart", this.touchstart.bind(this), false);
    canvas.addEventListener("touchmove", this.touchmove.bind(this), false);
    canvas.addEventListener("touchend", this.touchend.bind(this), false);

    this.pathListeners = [];

    this.active = false;
    this.path = [];
  }

  mousedown(e) {
    if (e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      this.active = true;
      this.path = [mousePt(e)];
      this.notifyListeners("beginMousePath", this.path);
    }
  }
  mouseup(e) {
    if (this.active) {
      e.preventDefault();
      e.stopPropagation();
      this.active = false;
      this.notifyListeners("endMousePath", this.path);
    }
  }
  mousemove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.active) {
      var newPt = mousePt(e);
      var lastPt = this.path[this.path.length - 1];
      this.path.push(newPt);
      this.notifyListeners("updateMousePath", this.path);
    } else {
      this.notifyListeners("mouseMove", mousePt(e));
    }
  }
  mouseleave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.active) {
      this.mouseup(e);
    } else {
      this.notifyListeners("mouseLeave");
    }
  }
  fillOffset(e) {
    let rect = e.target.getBoundingClientRect();
    e.offsetX = e.targetTouches[0].pageX - rect.left;
    e.offsetY = e.targetTouches[0].pageY - rect.top;
  }
  touchstart(e) {
    e.preventDefault();
    e.stopPropagation();
    this.active = true;
    this.fillOffset(e);
    this.path = [mousePt(e)];
    this.notifyListeners("beginMousePath", this.path);
  }
  touchend(e) {
    if (this.active) {
      e.preventDefault();
      e.stopPropagation();
      this.active = false;
      this.notifyListeners("endMousePath", this.path);
    }
  }
  touchmove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.active) {
      this.fillOffset(e);
      var newPt = mousePt(e);
      var lastPt = this.path[this.path.length - 1];
      this.path.push(newPt);
      this.notifyListeners("updateMousePath", this.path);
    } else {
      this.fillOffset(e);
      this.notifyListeners("mouseMove", mousePt(e));
    }
  }
  notifyListeners(evname) {
    var args = [];
    for (let i = 1; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    for (let i = 0; i < this.pathListeners.length; i++) {
      var listener = this.pathListeners[i];
      if (listener[evname]) {
        listener[evname].apply(listener, args);
      }
    }
  }
  addEventListener(listener) {
    this.pathListeners.push(listener);
  }
}

class SpringSim {
  constructor(canvas, pcanvas) {
    this.canvas = canvas;
    this.ctxt = this.canvas.getContext("2d");
    this.dim = this.canvas.getBoundingClientRect();
    
    this.cevents = new CanvasEvents(canvas);
    this.cevents.addEventListener({
      beginMousePath: path => {
        this.mousept = null;
        if (this.checkInMass(path[0])) {
          this.obj_saved_x = this.obj_x;
          this.obj_vx = 0;
          this.start_mouse = path[0];
          this.curr_mouse = path[0];
        }
      },
      updateMousePath: path => {
        this.curr_mouse = path[path.length - 1];
      },
      endMousePath: path => {
        this.mousept = null;
        this.curr_mouse = null;
        this.start_mouse = null;
      },
      mouseMove: pt => {
        this.mousept = pt;
      },
      mouseLeave: () => {
        this.mousept = null;
      }

    });

    this.pcanvas = pcanvas;
    this.pctxt = this.pcanvas.getContext("2d");
    this.pdim = this.pcanvas.getBoundingClientRect();

    this.pcevents = new CanvasEvents(pcanvas);
    let update_phase = path => {
      let pt = path[path.length-1];
      set_parameter("x", (pt.x - this.pdim.width/2)/100);
      set_parameter("dx", (-pt.y + this.pdim.height/2)/100);
    };
    this.pcevents.addEventListener({
      beginMousePath: path => {
        this.phase_mouse_held = true;
        update_phase(path);
      },
      updateMousePath: path => {
        update_phase(path);
      },
      endMousePath: path => {
        this.phase_mouse_held = false;
        update_phase(path);
      }
    });

    this.last_t = null;

    this.obj_x = 0;
    this.obj_vx = 0;

    this.mousept = null;
    this.checkInMass = function (mousept) { return false; };
    this.obj_saved_x = null;

    this.animate = (timestamp) => {
      this.draw(timestamp);
      this.beginAnimate();
    };
  }

  beginAnimate() {
    window.requestAnimationFrame(this.animate);
  }
  draw(t) {
    if (this.last_t === null) {
      this.last_t = t - 1000/30.0; // probably 30fps.
    }
    var dt = (t - this.last_t) / 1000.0; // in seconds
    this.last_t = t;
    dt = Math.min(dt, 0.1); // don't want dt to be too big

    if (this.start_mouse) {
      set_parameter("x", (this.curr_mouse.x - this.start_mouse.x + this.obj_saved_x)/100);
      set_parameter("dx", ((100*params.x - this.obj_x)/dt)/100);
    } else if (!this.phase_mouse_held && Q("#running-checkbox").prop("checked")) {
      this.update_simulation(dt);
    }

    this.obj_x = params.x*100;
    this.obj_vx = params.dx*100;

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

    ctxt.fillStyle = "#ccc";
    ctxt.beginPath();
    var major_mark = 100;
    for (let i = -2; i <= 2; i++) {
      ctxt.moveTo(zero_x+i*major_mark, zero_y);
      ctxt.lineTo(zero_x-2+i*major_mark, this.dim.height);
      ctxt.lineTo(zero_x+2+i*major_mark, this.dim.height);
      ctxt.lineTo(zero_x+i*major_mark, zero_y);
    }
    ctxt.fill();


    ctxt.strokeStyle = "#333";
    ctxt.lineWidth = 3;
    ctxt.lineJoin = "round";
    ctxt.beginPath();
    ctxt.moveTo(zero_x, zero_y);
    var spring_kinks = 20;
    var spring_radius = 10;
    var spring_kink_delta = (mass_center_x - zero_x) / spring_kinks;
    for (let i = 0; i < spring_kinks; i++) {
      ctxt.lineTo(zero_x + spring_kink_delta * (i + 1/4), zero_y + spring_radius);
      ctxt.lineTo(zero_x + spring_kink_delta * (i + 3/4), zero_y - spring_radius);
      ctxt.lineTo(zero_x + spring_kink_delta * (i + 4/4), zero_y);
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

    //
    // phase diagram
    //
    {
      var pctxt = this.pctxt;
      pctxt.fillStyle = "#ffffff";
      pctxt.fillRect(0, 0, this.pdim.width, this.pdim.height);

      let zerox = this.pdim.width/2-0.5,
          zeroy = this.pdim.height/2-0.5,
          scale = 100;

      let xdivs = Math.floor(this.pdim.width/2/scale),
          ydivs = Math.floor(this.pdim.height/2/scale);

      pctxt.lineWidth = 1;
      pctxt.strokeStyle = "#999";
      pctxt.beginPath();
      for (let i = 1; i <= xdivs; i++) {
        pctxt.moveTo(zerox + scale*i, 0);
        pctxt.lineTo(zerox + scale*i, this.pdim.height);
        pctxt.moveTo(zerox - scale*i, 0);
        pctxt.lineTo(zerox - scale*i, this.pdim.height);
      }
      for (let i = 1; i <= ydivs; i++) {
        pctxt.moveTo(0, zeroy + scale*i);
        pctxt.lineTo(this.pdim.width, zeroy + scale*i);
        pctxt.moveTo(0, zeroy - scale*i);
        pctxt.lineTo(this.pdim.width, zeroy - scale*i);
      }
      pctxt.stroke();

      pctxt.lineWidth = 3;
      pctxt.strokeStyle = "#666";
      pctxt.beginPath();
      pctxt.moveTo(0, zeroy);
      pctxt.lineTo(this.pdim.width, zeroy);
      pctxt.moveTo(zerox, 0);
      pctxt.lineTo(zerox, this.pdim.height);
      pctxt.stroke();

      let subdiv = 5;
      pctxt.strokeStyle = "#339";
      pctxt.lineWidth = 1;
      pctxt.beginPath();
      let vscale = 0.05;
      for (let i = -xdivs*subdiv; i <= xdivs*subdiv; i++) {
        for (let j = -ydivs*subdiv; j <= ydivs*subdiv; j++) {
          let x = i/subdiv, dx = j/subdiv;
          let vx = dx,
              vy = -(params.c*dx + params.k*x)/params.m;
          pctxt.moveTo(zerox + x*scale, zeroy - dx*scale);
          pctxt.lineTo(zerox + (x+vscale*vx)*scale, zeroy - (dx+vscale*vy)*scale);
        }
      }
      pctxt.stroke();
      pctxt.fillStyle = "#339";
      for (let i = -xdivs*subdiv; i <= xdivs*subdiv; i++) {
        for (let j = -ydivs*subdiv; j <= ydivs*subdiv; j++) {
          let x = i/subdiv, dx = j/subdiv;
          let vx = dx,
              vy = -(params.c*dx + params.k*x)/params.m;
          pctxt.beginPath();
          pctxt.arc(zerox + x*scale, zeroy - dx*scale, 1.5, 0, 2*Math.PI, true);
          //pctxt.arc(zerox + (x+vscale*vx)*scale, zeroy - (dx+vscale*vy)*scale, 2, 0, 2*Math.PI, true);
          pctxt.fill();
        }
      }

      pctxt.strokeStyle = "#339";
      pctxt.lineWidth = 2;
      let f = this.make_predictor();
      pctxt.beginPath();
      pctxt.moveTo(zerox + f.x(0)*scale, zeroy - f.dx(0)*scale);
      for (let i = 1; i < 480; i++) {
        let x = f.x(i/15),
            dx = f.dx(i/15);
        pctxt.lineTo(zerox + x*scale, zeroy - dx*scale);
        if (Math.abs(x)*scale < 1 && Math.abs(dx)*scale < 1) {
          break;
        }
      }
      pctxt.stroke();

      pctxt.strokeStyle = "#fff";
      pctxt.lineWidth = 2;
      pctxt.fillStyle = "#333";
      pctxt.beginPath();
      pctxt.arc(zerox + scale*params.x, zeroy - scale*params.dx, 7, 0, Math.PI*2, true);
      pctxt.fill();
      pctxt.stroke();


      pctxt.font = "20px italic sans-serif";
      pctxt.strokeStyle = "#fff";
      pctxt.lineWidth = 3.5;
      pctxt.textAlign = "right";
      pctxt.textBaseline = "bottom";
      pctxt.fillStyle = "#333";
      pctxt.strokeText("x", this.pdim.width - 8, zeroy-1);
      pctxt.fillText("x", this.pdim.width - 8, zeroy-1);
      pctxt.textAlign = "left";
      pctxt.textBaseline = "top";
      pctxt.strokeText("x\u2032", zerox+5, 7);
      pctxt.fillText("x\u2032", zerox+5, 7);

    }

  }
  make_predictor() {
    let x = params.x,
        dx = params.dx;
    let disc = params.c*params.c - 4*params.m*params.k;
    set_parameter("disc", disc);
    if (disc > 0) { // overdamped
      let r1 = (-params.c + Math.sqrt(disc))/(2*params.m),
          r2 = (-params.c - Math.sqrt(disc))/(2*params.m);
      let c1 = (r2*x-dx)/(r2-r1),
          c2 = (-r1*x+dx)/(r2-r1);
      return {
        x: t => c1*Math.exp(r1*t) + c2*Math.exp(r2*t),
        dx: t => c1*r1*Math.exp(r1*t) + c2*r2*Math.exp(r2*t)
      };
    } else if (disc === 0) { // critically damped
      let r = -params.c/(2*params.m);
      let c1 = x,
          c2 = dx - c1*r;
      return {
        x: t => (c1 + c2*t) * Math.exp(r*t),
        dx: t => Math.exp(r*t) * ((c1 + c2*t) * r + c2)
      };
    } else { // underdamped
      let re = -params.c/(2*params.m),
          im = Math.sqrt(-disc)/(2*params.m);
      let c1 = x,
          c2 = (dx - re*x)/im;
      return {
        x: t => Math.exp(re*t) * (c1 * Math.cos(im*t) + c2 * Math.sin(im*t)),
        dx: t => Math.exp(re*t) * ((c1 * re + c2 * im) * Math.cos(im*t) - (c1 * im - c2 * re) * Math.sin(im*t))
      };
    }
  }
  update_simulation(dt) {
    let f = this.make_predictor();

    set_parameter("x", f.x(dt));
    set_parameter("dx", f.dx(dt));
  }
}


function attach_all_data_vars() {
  Q("[data-var]").forEach($el => {
    let varname = $el.attr("data-var");
    let tagname = $el.prop("tagName");
    if (tagname === "INPUT") {
      add_parameter_handler(varname, val => {
        if ($el.value() === "" || isNaN(+$el.value()) || Math.abs(+$el.value() - +val) >= 1e-6) {
          $el.value(val.toFixed(3));
        }
      });
      let event = "change";
      if ($el.attr("type") === "range") {
        event = "input";
      }
      $el.on(event, e => {
        e.stopPropagation();
        e.preventDefault();
        set_parameter(varname, +$el.value());
      });
    } else if (tagname === "SPAN") {
      add_parameter_handler(varname, val => {
        $el.empty();
        $el.append('' + val.toFixed(3));
      });
    }
    console.log([varname, tagname].join(" "));
  });
}

function update_eqn() {
  function v(s) { return Q.create("var", s); }
  function exp(r) {
    if (r === 0) {
      return [];
    } else {
      return [v("e"), Q.create("sup", r.toFixed(3), v("t"))];
    }
  }
  let $eq = Q("#eqn").empty();
  let disc = params.c*params.c - 4*params.m*params.k;
  if (disc > 0) { // overdamped
    let r1 = (-params.c + Math.sqrt(disc))/(2*params.m),
        r2 = (-params.c - Math.sqrt(disc))/(2*params.m);
    $eq.append(v("x"), " = ",
               v("C"), Q.create("sub", 1),
               exp(r1),
               " + ",
               v("C"), Q.create("sub", 2),
               exp(r2)
               );
  } else if (disc === 0) { // critically damped
    let r = -params.c/(2*params.m);
    $eq.append(v("x"), " = ",
               r !== 0 ? "(" : "",
               v("C"), Q.create("sub", 1), " + ", v("C"), Q.create("sub", 2), "t",
               r !== 0 ? ")": "", exp(r));
  } else { // underdamped
    let re = -params.c/(2*params.m),
        im = Math.sqrt(-disc)/(2*params.m);
    $eq.append(v("x"), " = ",
               re !== 0 ? "(" : "",
               v("C"), Q.create("sub", 1), "\u2009", "cos(", im.toFixed(3), v("t"), ")",
               " + ",
               v("C"), Q.create("sub", 2), "\u2009", "sin(", im.toFixed(3), v("t"), ")",
               re !== 0 ? ")": "", exp(re));
  }
}

Q(function () {
  attach_all_data_vars();

  add_parameter_handler("m", update_eqn);
  add_parameter_handler("c", update_eqn);
  add_parameter_handler("k", update_eqn);

  for (let param in params) {
    set_parameter(param, params[param]);
  }

  function add_example(id, ex_params) {
    Q(document.getElementById(id)).on("click", e => {
      e.stopPropagation();
      e.preventDefault();
      for (let k in ex_params) {
        set_parameter(k, ex_params[k]);
      }
    });
  }

  add_example("ex-undamped", {
    x: 2,
    dx: 0,
    m: 1,
    c: 0,
    k: 1
  });
  add_example("ex-partial", {
    x: 2,
    dx: 0,
    m: 1,
    c: 0.2,
    k: 1.5
  });
  add_example("ex-critical", {
    x: 2,
    dx: 0,
    m: 1,
    c: 1,
    k: 0.25
  });
  add_example("ex-overdamped", {
    x: 2,
    dx: 0,
    m: 1,
    c: 3,
    k: 0.2
  });
  add_example("ex-nospring-undamped", {
    x: 2,
    dx: -0.2,
    m: 1,
    c: 0,
    k: 0
  });
  add_example("ex-nospring-damped", {
    x: 2,
    dx: -1,
    m: 1,
    c: 0.25,
    k: 0
  });

  var sim1 = new SpringSim(document.getElementById("cart-canvas"), document.getElementById("phase-canvas"));
  sim1.beginAnimate();
});
