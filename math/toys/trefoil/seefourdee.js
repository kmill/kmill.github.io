// seefourdee.js

Array.prototype.extend = function (lst) {
  for (var i = 0; i < lst.length; i++) {
    this.push(lst[i]);
  }
};

var gl = null;
var shaderProgram = null;

function initWebGL(canvas) {
  gl = null;
  var options = {antialias: true};
  try {
    gl = canvas.getContext("web-gl", options)
      || canvas.getContext("experimental-webgl", options);
  } catch (e) {}

  if (!gl) {
    alert("Unable to initialize WebGL.");
    gl = null;
  }
  return gl;
}

function compileShader(shaderType, shaderSource) {
  /* shaderType is gl.FRAGMENT_SHADER or gl.VERTEX_SHADER.
   * shaderSource is a string */
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error("Could not compile shader: " + gl.getShaderInfoLog(shader));
  }
  return shader;
}

function shaderTypeFromMime(mime) {
  switch (mime) {
  case "x-shader/x-fragment" :
    return gl.FRAGMENT_SHADER;
  case "x-shader/x-vertex" :
    return gl.VERTEX_SHADER;
  default:
    throw new Error("No such shader mime type");
  }
}

function getShaderById(id) {
  /* Finds a shader by looking for a script with a given id */
  var $script = $(document.getElementById(id));
  if ($script.length === 0) {
    throw new Error("No script such tag");
  }
  return compileShader(shaderTypeFromMime($script.attr("type")),
                       $script.text());
}

function initShaders() {
  var fragmentShader = getShaderById("shader-fs");
  var vertexShader = getShaderById("shader-vs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw new Error("Could not initialize shaders");
  }
  
  gl.useProgram(shaderProgram);
  
  shaderProgram.vertexPositionAttribute
    = gl.getAttribLocation(shaderProgram, "a_pos");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  shaderProgram.vertexNormalAttribute
    = gl.getAttribLocation(shaderProgram, "a_norm");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    
  shaderProgram.pMatrixUniform
    = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMatrixUniform
    = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.nMatrixUniform
    = gl.getUniformLocation(shaderProgram, "uNMatrix");
}






var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.copy(copy, mvMatrix);
    mvMatrixStack.push(copy);
}
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw new Error("invalid popMatrix!");
    }
    mvMatrix = mvMatrixStack.pop();
}
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  var nmatrix = mat3.create();
  mat3.fromMat4(nmatrix, mvMatrix);
  mat3.invert(nmatrix, nmatrix);
  mat3.transpose(nmatrix, nmatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nmatrix);
}

var vertbuffer;
var normbuffer;
var idxbuffer;

$(function onload() {
  var canvas = document.getElementById("glcanvas");
  initWebGL(canvas);
  initShaders();

  updateCanvasSize();


  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  mat4.identity(mvMatrix);

  //gl.enable(gl.LINE_SMOOTH);
  
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  //gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.DST_ALPHA);
    
  //gl.hint(gl.LINE_SMOOTH_HINT, gl.DONT_CARE);

  var vertices = [];
  var normals = [];
  var tgals = [];

  function trefoil(t) {
    return [Math.sin(2*Math.PI*t) + 2*Math.sin(2*2*Math.PI*t),
            Math.cos(2*Math.PI*t) - 2*Math.cos(2*2*Math.PI*t),
            -Math.sin(3*2*Math.PI*t),
            //(1 + 1/(1+Math.cos(2*Math.PI*t)))
            //1/(1.01+Math.cos(2*Math.PI*t)),
            1
           ];
  }
  var steps = 400,
      rad = 0.5,
      tsteps = 50;

  function mkvert(pt, norm) {
    var i = vertices.length/3;
    vertices.extend(pt);
    normals.extend(norm);
    return i;
  }

  var path = [];
  for (var i = 0; i < steps; i++) {
    path.push(trefoil(i / steps));
  }

  var v1 = vec3.create(), // path forward
      v2 = vec3.create(), // path backward
      vc = vec3.create(), // normal (cross)
      vd = vec3.create(); // dihedral
  var vcomp = vec3.create();
  var vidxs = [];
  for (var i = 0; i < steps; i++) {
    vec3.sub(v1, path[(i+1)%steps], path[i]);
    vec3.sub(v2, path[(i-1+steps)%steps], path[i]);
    vec3.cross(vc, v1, v2);
    vec3.normalize(vc, vc);
    vec3.add(vd, v1, v2);
    vec3.normalize(vd, vd);

    var tidxs = [];
    for (var j = 0; j < tsteps; j++) {
      var c = Math.cos(2*Math.PI*j/tsteps),
          s = Math.sin(2*Math.PI*j/tsteps);
      vec3.scale(vcomp, vd, c);
      vec3.scaleAndAdd(vcomp, vcomp, vc, s);
      var norm = vec3.clone(vcomp);
      vec3.scaleAndAdd(vcomp, path[i], vcomp, path[i][3]*rad);
      tidxs.push(mkvert(vcomp, norm));
    }
    vidxs.push(tidxs);
  }
  for (var i = 0; i < steps; i++) {
    for (var j = 0; j < tsteps; j++) {
      tgals.extend([
        vidxs[i][j], vidxs[(i+1)%steps][j], vidxs[(i+1)%steps][(j+1)%tsteps],
        vidxs[i][j], vidxs[(i+1)%steps][(j+1)%tsteps], vidxs[i][(j+1)%tsteps]
      ]);
    }
  }
  vertbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  vertbuffer.itemSize = 3;
  vertbuffer.numItems = vertices.length / 3;

  normbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  normbuffer.itemSize = 3;
  normbuffer.numItems = normals.length / 3;

  idxbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxbuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tgals), gl.STATIC_DRAW);
  idxbuffer.itemSize = 3;
  idxbuffer.numItems = tgals.length;

  animationLoop();
});


var q1 = quat.create();
var q2 = quat.create();

var pretranslate = [0,0,0,0];
var translate = [0,0,0,2];

function project3d(point) {
    var pt = vec4.clone(point);
    vec4.add(pt, pt, pretranslate);
    quat.multiply(pt, q1, pt);
    quat.multiply(pt, pt, q2);
    vec4.add(pt, pt, translate);
    return pt;
}



var requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;

function animationLoop() {
  requestAnimFrame(function (timestamp) {
    animationLoop();
    animateStep(timestamp);
  });
}

var initTimestamp = null;

var t = 0;
var rescalar = 1.0;
var trans = [0,0,0];

function animateStep(timestamp) {
    if (initTimestamp === null) {
        initTimestamp = timestamp;
    }

    t = timestamp - initTimestamp;
    
    drawFrame();
}

function drawFrame() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
//  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  //gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix, mvMatrix, [0, 0, -7.0]);
  mvPushMatrix();
  //mat4.translate(mvMatrix, mvMatrix, trans);
  mat4.rotateZ(mvMatrix, mvMatrix, t/2000);
  mat4.rotateX(mvMatrix, mvMatrix, t/3141);
  
  //mat4.scale(mvMatrix, mvMatrix, [rescalar, rescalar, rescalar]);
  
  setMatrixUniforms();

  gl.bindBuffer(gl.ARRAY_BUFFER, vertbuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                         vertbuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, normbuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                         normbuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxbuffer);
  gl.drawElements(gl.TRIANGLES, idxbuffer.numItems, gl.UNSIGNED_SHORT, 0);
  //gl.draw(gl.TRIANGLE_STRIP, vertbuffer.numItems, gl.FLOAT, 0);
  
  mvPopMatrix();
}

$(window).on("resize", function () {
    updateCanvasSize();
});



function updateCanvasSize() {
    $("#glcanvas").attr("width", window.innerWidth).attr("height", window.innerHeight);
    gl.viewportWidth = +$("#glcanvas").attr("width");
    gl.viewportHeight = +$("#glcanvas").attr("height");
}


/*

Leap.loop(function(frame) {
    if (old_frame != null) {
        //rescalar = 0.1 * rescalar + 0.9 * Math.pow(frame.scaleFactor(old_frame), 0.2);
    }

    if (frame.hands === undefined ) {
        var handsLength = 0
    } else {
        var handsLength = frame.hands.length;
    }

    for (var handId = 0; handId < handsLength; handId++) {
        var hand = frame.hands[handId];

        var posX = hand.palmPosition[0];
        var posY = hand.palmPosition[1];
        var posZ = hand.palmPosition[2];

        trans = [2*posX/100, 2*posY/100, 2*posZ/100];

        var q = null;
        if (handId == 0) {
            q = q1;
        } else if (handId == 1) {
            q = q2;
        }
        
        if (q !== null) {
            var dist = 0.85 * dists[handId] + 0.15 * vec3.distance(hand.palmPosition, hand.sphereCenter);
            dists[handId] = dist;
            quat.setAxisAngle(q, hand.direction, dist/30);
        }
    }


    old_frame = frame;
});
*/
