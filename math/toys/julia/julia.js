// julia.js

var requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;

var gl = null;
var shaderProgram = null;

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
}

function getShader(id) {
    var shaderScript = $(document.getElementById(id));
    var str = shaderScript.text();
    var type = shaderScript.attr("type");

    var shader = null;
    if (type === "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (type === "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        throw new Error("No such type");
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }

    return shader;
}

$(function onload() {
    var canvas = document.getElementById("glcanvas");
    gl = initWebGL(canvas);
    initShaders();

    updateCanvasSize();


    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    mat4.identity(mvMatrix);

    //gl.enable(gl.LINE_SMOOTH);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    //gl.hint(gl.LINE_SMOOTH_HINT, gl.DONT_CARE);

//    setMatrixUniforms();

    animationLoop();
});

function initShaders() {
    var fragmentShader = getShader("shader-fs");
    var vertexShader = getShader("shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw new Error("Could not initialize shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    
    shaderProgram.wWidth = gl.getUniformLocation(shaderProgram, "wWidth");
    shaderProgram.wHeight = gl.getUniformLocation(shaderProgram, "wHeight");
    shaderProgram.uTime = gl.getUniformLocation(shaderProgram, "uTime");
    shaderProgram.uSeed = gl.getUniformLocation(shaderProgram, "uSeed");
    shaderProgram.uIter = gl.getUniformLocation(shaderProgram, "uIter");
    shaderProgram.uMode = gl.getUniformLocation(shaderProgram, "uMode");
    shaderProgram.uScale = gl.getUniformLocation(shaderProgram, "uScale");
    shaderProgram.uMandelRel = gl.getUniformLocation(shaderProgram, "uMandelRel");
    shaderProgram.uRelScale = gl.getUniformLocation(shaderProgram, "uRelScale");
    shaderProgram.uPoint = gl.getUniformLocation(shaderProgram, "uPoint");
    shaderProgram.uRendMode = gl.getUniformLocation(shaderProgram, "uRendMode");
}

var buffer;

function initBuffers() {
    var strip = new Float32Array([
        -1, -1, 0, 1,
        1, -1, 0, 1,
        -1, 1, 0, 1,
        1, 1, 0, 1
    ]);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, strip, gl.STATIC_DRAW);
    buffer.itemSize = 4;
    buffer.numItems = strip.length / 4;
}
function drawBuffers() {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, buffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffer.numItems);
}


function animationLoop() {
    requestAnimFrame(function (timestamp) {
        animationLoop();
        animateStep(timestamp);
    });
}

var initTimestamp = null;
var lastTimestamp = null;

var t = 0;

var okCycles = 0;

var maxIters = 120;

function animateStep(timestamp) {
    if (initTimestamp === null) {
        initTimestamp = timestamp;
    }

    t = timestamp - initTimestamp;
    if (lastTimestamp !== null) {
        if (relativeTo === null && timestamp - lastTimestamp > 1.0001 * 1000/30) {
            numIters -= 1;
            okCycles = 0;
        } else if (relativeTo === null) {
            okCycles += 1;
        }
        if (okCycles > 20) {
            numIters++;
        }
    }
    if (numIters > maxIters) {
        numIters = maxIters;
    } else if (numIters < 0) {
        numIters = 0;
    }

    if (!pause && animIndex === null && goodJulias === null) {
        var mouseX2 = mouseX;
        var mouseY2 = mouseY;

        if (relativeTo !== null) {
            var del = Math.pow(2, -relativeToZoom/200);
            var dx = (mouseX - relativeTo[0]) * del;
            var dy = (mouseY - relativeTo[1]) * del;
            mouseX2 = relativeTo[0] + dx;
            mouseY2 = relativeTo[1] + dy;
        }

        nextRe = scale * mouseX2;
        nextIm = scale * mouseY2;

        var alpha = 0.90;
        seedRe = alpha * seedRe + (1-alpha) * nextRe;
        seedIm = alpha * seedIm + (1-alpha) * nextIm;
    }

    if (!pause && animIndex !== null && goodJulias === null) {
        var i = Math.floor(animIndex % path.length);
        var start = path[i];
        var end = path[(i + 1) % path.length];
        var alpha = animIndex % 1;
        alpha = alpha;
        seedRe = (1-alpha) * start[0] + alpha*end[0];
        seedIm = (1-alpha) * start[1] + alpha*end[1];
        var dist = vec2.distance(start, end);
        animIndex += 0.002/dist;// * (1-dotp);
    }

    if (goodJulias !== null) {
        if (currGood === null) {
            currGood = goodJulias[Math.floor(Math.random() * goodJulias.length)];
        }
        if (goodAlpha >= 1.0) {
            goodAlpha = 0;
            lastGood = currGood;
            currGood = nextGood;
            nextGood = null;

            if (genDir === null) {
                genDir = vec2.clone(currGood);
                vec2.subtract(genDir, genDir, lastGood);
                vec2.normalize(genDir, genDir);
            } else {
                var v1 = vec2.clone(currGood);
                vec2.subtract(v1, v1, lastGood);
                vec2.normalize(v1, v1);
                vec2.scale(genDir, genDir, beta);
                vec2.scale(v1, v1, 1-beta);
                vec2.add(genDir, genDir, v1);
                vec2.normalize(genDir, genDir);
            }
        }
        if (genDir === null) {
            genDir = [Math.random()-0.5, Math.random()-0.5]; // eh, not really uniform. oh well.
            vec2.normalize(genDir, genDir);
        }
        if (nextGood === null) {
            selectNextGood();
            console.log("selected " + nextGood + " with gendir=" + genDir);
        }
        var start = currGood;
        var end = nextGood;
        var alpha = goodAlpha;
        var dist = vec2.distance(start, end);
        var clamped_dist = dist > 1 ? 1 : dist;
        function smooth_alpha(alpha) { return (1-Math.cos(Math.PI*alpha))/2; }
        function quick_alpha(alpha) { return alpha; }
        alpha = clamped_dist * smooth_alpha(alpha) + (1-clamped_dist) * quick_alpha(alpha);
        seedRe = (1-alpha) * start[0] + alpha*end[0];
        seedIm = (1-alpha) * start[1] + alpha*end[1];

        goodAlpha += animSpeed/Math.pow(dist, animGamma);
    }
    
    drawFrame();
    lastTimestamp = timestamp;
}

var wantChoices = 20;
var beta = 0.80;
var gamma = 0.2;
var distWeight = 0.3;
var genDir = null;
var badnessWeight = 1;

var animGamma = 0.5;
var animSpeed = 0.001

var lastGood = null;
var currGood = null;
var nextGood = null;
var goodAlpha = 0;

function selectAllGoodWithin(h) {
    return _.filter(goodJulias, function (point) {
        var dist = vec2.distance(point, currGood);
        return point !== currGood && dist <= h;
    });
}

var selectedBefore = {};

function selectNextGood() {
    var maxDistance = 3.0;
    var minMaxDistance = 0.0;
    var poss = selectAllGoodWithin(maxDistance);
    if (poss.length > wantChoices) {
        while (poss.length != wantChoices && maxDistance - minMaxDistance > 0.00000001) {
            poss = selectAllGoodWithin((maxDistance + minMaxDistance) / 2);
            if (poss.length < wantChoices) {
                minMaxDistance = (maxDistance + minMaxDistance)/2;
            } else if (poss.length > wantChoices) {
                maxDistance = (maxDistance + minMaxDistance)/2;
            }
        }
    }
    console.log(poss.length);
    if (poss.length === 0) {
        nextGood = goodJulias[Math.floor(Math.random() * goodJulias.length)];
    } else {
        if (lastGood !== null) {
            poss = _.sortBy(poss, function (point) {
                //var v1 = vec2.clone(currGood);
                //vec2.subtract(v1, v1, lastGood);
                //vec2.normalize(v1, v1);
                var v1 = genDir;
                var v2 = vec2.clone(point);
                vec2.subtract(v2, v2, currGood);
                vec2.normalize(v2, v2);
                var dotp = vec2.dot(v1, v2);
                var badness = _.has(selectedBefore, point) ? selectedBefore[point] : 0;
                return dotp + distWeight * vec2.distance(point, currGood) - badness*badnessWeight;
            });
        }
        nextGood = poss[Math.floor(Math.pow(Math.random(), gamma) * poss.length)];
    }

    if (!_.has(selectedBefore, nextGood)) {
        selectedBefore[nextGood] = 1;
    } else {
        selectedBefore[nextGood]++;
        console.log(".");
    }
}

var numIters = 50;

var scale = 1.15;

function drawFrame() {
    initBuffers();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.identity(pMatrix);
    //mat4.scale(pMatrix, pMatrix, [0.5, 0.5, 0.5]);
    mat4.identity(mvMatrix);

    setMatrixUniforms();

    gl.uniform1f(shaderProgram.uTime, t);
    gl.uniform2f(shaderProgram.uSeed, seedRe, seedIm);
    gl.uniform1i(shaderProgram.uIter, numIters);
    gl.uniform1i(shaderProgram.uMode, mode);
    gl.uniform1f(shaderProgram.uScale, scale);
    gl.uniform1i(shaderProgram.uPoint, showPoint ? 1 : 0);
    gl.uniform1i(shaderProgram.uRendMode, rendMode);

    if (relativeTo === null) {
        gl.uniform2f(shaderProgram.uMandelRel, 0, 0);
    } else {
        gl.uniform2f(shaderProgram.uMandelRel, scale * relativeTo[0], scale * relativeTo[1]);
    }
    gl.uniform1f(shaderProgram.uRelScale, Math.pow(2, -relativeToZoom/200));

    drawBuffers();
}

$(window).on("resize", function () {
    updateCanvasSize();
});

var seedRe = 0;
var seedIm = 0;

var mouseX = 0;
var mouseY = 0;

$(window).on("mousemove", function (e) {
    mouseX = (2*e.pageX - window.innerWidth) / window.innerHeight;
    mouseY = (window.innerHeight - 2 * e.pageY) / window.innerHeight;
});

var path = [];
var animIndex = null;

$(function () { $("#glcanvas").on("contextmenu", function (e) { e.preventDefault(); return false; }); });

$(window).on("mousedown", function (e) {
    e.preventDefault();
    if (e.which === 1) {
        if (!pause && spaceDown && !shiftDown && animIndex === null) {
            var point = [seedRe, seedIm];
            path.push(point);
        } else if (shiftDown && animIndex === null) {
          return false;
            var url = "http://julia.kylem.net/save?re=" + seedRe + "&im=" + seedIm;
            $("body").append($("<script type=\"text/javascript\">").attr("src", url));
        } else {
            animIndex = null;
        }
    } else if (e.which === 3 && path.length > 0) {
        if (animIndex === null) {
            animIndex = 0;
        } else {
            animIndex = null;
        }
    } else if (e.which === 2) {
        tryReadGoodJulias();
    }
    return false;
});

var shiftDown = false;
var spaceDown = false;

var mode = 0;

var relativeTo = null;
var relativeToZoom = 0;

var showPoint = false;

var rendMode = 0;

$(window).on("keydown", function (e) {
    shiftDown = e.shiftKey;

    if (shiftDown && e.keyCode == 65) { // shift-A
        tryReadGoodJulias();
    } else if (e.keyCode == 27) { // escape
        currGood = nextGood = null;
        goodJulias = null;
    } else if (e.keyCode == 13) { // enter
        mode += 1;
        mode %= 3;
    } else if (e.keyCode == 32) { // space
        spaceDown = true;
    } else if (e.keyCode == 48) { // 0
        rendMode += 1;
        rendMode %= 2;
    }

    if (spaceDown && relativeTo === null) {
        relativeTo = [mouseX, mouseY];
        relativeToZoom = 0;
    }
});
$(window).on("keyup", function (e) {
    shiftDown = e.shiftKey;

    if (e.keyCode == 32) { // space
        spaceDown = false;
        relativeTo = null;
        relativeToZoom = 0;
    }
});

$(window).on("keypress", function (e) {
    console.log(e.charCode);
    if (e.charCode === 112) { // p
        showPoint = !showPoint;
    } else if (e.charCode === 49) { // 1
        mode = 0;
    } else if (e.charCode === 50) { // 2
        mode = 1;
    } else if (e.charCode === 51) { // 3
        mode = 2;
    } else if (e.charCode === 115) { // s
        var re = seedRe, im = seedIm;
        setFragment([re*re - im*im + re, 2*re*im + im]);
    } else if (e.charCode === 118) { // v
        var re = 1 + 4*seedRe, im = 4*seedIm;
        var arg = Math.atan2(im, re);
        var mag = Math.sqrt(re*re + im*im);
        re = Math.sqrt(mag) * Math.cos(arg/2);
        im = Math.sqrt(mag) * Math.sin(arg/2);
        setFragment([(-1 + re)/2, im/2]);
    } else if (e.charCode === 119) { // w
        var re = 1 + 4*seedRe, im = 4*seedIm;
        var arg = Math.atan2(im, re);
        var mag = Math.sqrt(re*re + im*im);
        re = Math.sqrt(mag) * Math.cos(arg/2);
        im = Math.sqrt(mag) * Math.sin(arg/2);
        setFragment([(-1 - re)/2, -im/2]);
    }
});

$(window).on("mousewheel", function (e) {
    e.preventDefault();
    var delta = e.originalEvent.wheelDelta || -e.originalEvent.detail;
    relativeToZoom += delta;
    if (!spaceDown || relativeToZoom < 0) relativeToZoom = 0;
    return false;
});

function savedPoint() {
    console.log("saved");
}

var goodJulias = null;

function readGoodJulias(points) {
    if (currGood !== null) {
        currGood = nextGood = null;
    } else {
        currGood = [seedRe, seedIm];
    }
    goodAlpha = 0;
    var found = {};
    goodJulias = [];
    _.each(points, function (point) {
        if (!_.has(found, ''+point)) {
            goodJulias.push(point);
            found[point] = true;
            if (Math.abs(point[1]) > 0.001) {
                goodJulias.push([point[0], -point[1]]);
                found[[point[0], -point[1]]] = true;
            }
        }
    });
}

function tryReadGoodJulias() {
  window.setTimeout(function () {
    readGoodJulias(goodjulias_txt);
  }, 0);
  return;
    var url = "http://julia.kylem.net/good?wrap=true";
    $("body").append($("<script type=\"text/javascript\">").attr("src", url));
}

var pause = false;

function setFragment(point) {
    $(window.location).attr('hash', point[0] + ',' + point[1]);
}
function clearFragment() {
    $(window.location).attr('hash', '');
}

$(window).on("hashchange", handleHashChange);

function handleHashChange() {
    pause = true;
    var parts = $(window.location).attr('hash').slice(1).split(",");
    if (parts.length >= 2) {
        seedRe = +parts[0];
        seedIm = +parts[1];
        pause = true;
    } else {
        pause = false;
    }
}

$(handleHashChange);

$(window).on("dblclick", function (e) {
    if (e.which === 1) {
        if (!pause) {
            setFragment([seedRe, seedIm]);
        } else {
            clearFragment();
            //pause = false;
        }
    }
});

function initWebGL(canvas) {
    var gl = null;
//    var options = {antialias: true};
    var options = {};
    try {
        gl = canvas.getContext("web-gl", options) || canvas.getContext("experimental-webgl", options);
    }
    catch (e) {}
    
    if (!gl) {
        alert("Unable to initialize WebGL.");
        throw new Exception("Unable to initialize WebGL.");
    }
    return gl;
}


function updateCanvasSize() {
    $("#glcanvas").attr("width", window.innerWidth).attr("height", window.innerHeight);
    gl.viewportWidth = +$("#glcanvas").attr("width");
    gl.viewportHeight = +$("#glcanvas").attr("height");

    gl.uniform1f(shaderProgram.wWidth, gl.viewportWidth);
    gl.uniform1f(shaderProgram.wHeight, gl.viewportHeight);
}


const goodjulias_txt = [[-0.743869209568, -0.216588342313], [-0.760218074815, 0.0970350397752], [-0.733580464305, 0.206430964181], [-0.662121094602, 0.460926484296], [-0.55548930392, 0.555393989212], [-0.535492263555, 0.63476612572], [-0.721385222052, 0.355806812066], [-0.745904578383, 0.295156938732], [-0.796985238695, 0.169811068629], [-0.758169892708, 0.0727762802604], [-1.14645776568, 0.278983790057], [-0.772504197374, 0.129370190376], [-0.760760665242, 0.144931901213], [-0.743843895338, 0.173850339549], [-0.731642974243, 0.193920884902], [-0.731591187547, 0.25468075104], [-0.711374743431, 0.286666460225], [-0.682939091323, 0.331142043333], [-0.680517711172, 0.319407429792], [-0.641690425781, 0.388093064685], [-0.631466778859, 0.436618388941], [-0.590599636199, 0.485176831173], [-0.547734456854, 0.541549780006], [-0.506772561418, 0.610404990375], [-0.466707781008, 0.660165888879], [-0.390372114586, 0.663082807471], [-0.343324248868, 0.643687307337], [-0.31063812571, 0.651024596746], [-0.271565803847, 0.654678190245], [-0.200272857542, 0.654986152256], [-0.731607636861, -0.28301886791], [-0.707084468668, 0.266846359009], [-1.18937329699, -0.234503178187], [-1.26498637332, -0.0606474847882], [-1.21389645831, 0.266846359978], [0.11035420112, 0.642851452171], [0.0487977474167, 0.680303097538], [0.196067223279, 0.578180631315], [0.33514986376, 0.578166805129], [0.39230306472, 0.509385545945], [0.404575331789, 0.355785196452], [0.433242506741, 0.222371967796], [0.433650051667, 0.11360350596], [0.363759530433, -0.0768197943078], [0.353542205874, -0.00405647438477], [0.339237064962, -0.0363885976925], [0.341285187569, -0.0444833636601], [0.390325438849, -0.0917249578177], [-1.26122850098, 0.0727420301634], [-0.779853643016, 0.17496404721], [-0.336946362109, 0.690043517925], [-0.125252084124, 0.701816807423], [-0.113592290119, -0.902348070274], [-0.922312182521, -0.005913456418], [-0.383183569788, 0.603538661457], [0.263799686325, -0.619272472963], [0.371629628637, -0.591743119273], [-0.946852658032, 0.00568834627314], [-0.733125018261, 0.0703422051863], [-0.774375278669, 0.119764481976], [0.243751795061, 0.522830206123], [-0.823308270677, -0.144991212654], [-0.764661646565, -0.0553603329472], [-0.76917293168, 0.155536024836], [-1.27499864417, -0.00190077378082], [-1.40977443625, -0.00744132136452], [-1.40300753568, 0.00232957533985], [-1.4062495981, -0.00190094658623], [-1.44585841727, 0.023733724826], [-1.26315789474, 0.0764499121265], [0.383458098726, -0.118630380102], [0.385713559733, 0.287345674825], [-0.62030075188, -0.403339191564], [-0.645112781791, -0.382249558956], [-0.665413533835, -0.361159929701], [-0.766915716845, -0.255739074756], [0.406015027711, -0.198795180394], [0.392481628058, -0.255019730164], [0.390225525287, -0.307234647008], [0.406014293789, -0.347391429612], [0.462405655752, -0.387550200308], [0.318045106201, -0.463852214425], [0.324812126821, -0.499999294402], [0.324812040444, -0.564257032436], [0.243609022556, -0.568273092369], [0.408270676623, 0.339357429922], [-0.550376432649, 0.624497992375], [-0.259398496245, 0.68072289153], [-0.839097744395, -0.226907632743], [-0.96992481203, -0.267068273092], [-1.02406017359, -0.259036144072], [-1.26313763077, -0.0983833395938], [-1.25413466244, -0.0220883534074], [-1.25413442231, -0.0261043609807], [-1.28345864662, 0.0622490034767], [-1.17067668333, 0.198795197787], [-1.22030075136, -0.174698794147], [-1.16165387343, -0.210844550489], [-1.14135338346, -0.210843373494], [-1.10977456461, -0.263053357332], [-1.03759399836, -0.259036662222], [-0.994743662909, -0.29518072289], [-0.90451745621, -0.275100401254], [-0.872932330827, -0.259036307164], [-0.861654135465, -0.24297189143], [-0.839097745139, -0.226907633437], [-0.821052631579, -0.194779116621], [-0.800751879699, -0.174698795182], [-0.789473698585, -0.162650601597], [-0.782706815474, -0.146586452138], [-0.7736842106, -0.134538029011], [-0.757894736842, -0.078313253012], [-0.751127819552, -0.0461979462563], [-0.74887198953, -0.110440429761], [-0.0140513624715, 0.0124588351802], [-0.265625, 0.664241164085], [-0.378124891587, -0.626817818018], [-0.309022556391, -0.636546184739], [-0.778195477736, 0.134538132661], [0.348440699038, -0.0685962778042], [0.315789459599, -0.0341365461898], [0.322556376283, -0.038152599937], [0.356390972134, -0.07429649605], [0.356390977446, -0.347389558231], [0.293233090938, 0.0140562248999], [0.297744360902, 0.0180722891563], [0.302255639098, 0.0220865189813], [0.290977443609, 0.0140562229622], [0.261654135338, 0.00200803212851], [0.261654135338, -0.00200576738605], [0.304511274624, -0.0220883534114], [0.270676691729, 0.00200803212851], [0.261654131465, 0.0020082827901], [0.297744360814, 0.00602248185801], [0.313534327386, 0.0301196922605], [0.284210526453, -0.001568598838], [-0.655866635942, 0.367459371062], [0.25939849826, 0.00200803212849], [0.28195249353, 0.0100401529905], [0.286466088561, 0.0100401606425], [0.290977303763, 0.0140560623142], [0.237456496351, 0.288174079106], [0.533391836909, 0.359550883761], [-0.873479992439, -0.138468641979], [0.375356803045, 0.157894736842], [-0.71217887726, -0.293233082707], [-0.671102655865, -0.448453842984], [-0.800469483568, 0.179731243001], [0.35211267753, 0.0621500575544], [0.298122065728, -0.485442322638], [0.319248122783, -0.438409854424], [0.349765258215, -0.391377381342], [0.373239436705, -0.354423308143], [-0.145539906103, -0.844904809462], [0.00469483568078, -0.764277715535], [-0.309859154929, 0.636604116825], [-0.176056338028, 1.05655095185], [0.368544600941, 0.673572225962], [-0.762910947142, 0.212427630242], [0.253521126761, 3.85267565349e-37], [0.295774647887, 0.0216765339553], [-1.37323943662, -0.0173410404628], [-0.840625, -0.206703910615], [-0.859375, -0.237430167598], [0.337429111531, 0.0570934256055], [-1.74553571429, -1.30042153819e-18], [-1.75580357143, -1.89620693519e-14], [-1.76949404762, -0.00342242897837], [-1.76690079017, -0.00908691668966], [-1.76084287627, -0.0151448639157], [-1.76844946026, 0.0507850834151], [-1.75490677134, 0.0124141315048], [-1.25608439647, -0.380323846909], [-0.163640824155, 1.03263002945], [-0.159126592846, 1.02585868684], [-0.16364082307, 1.03488712863], [-1.26106356968, 0.0843520782396], [0.276604523227, 0.00667787286064], [0.371920004547, 0.0896149334245], [-0.839253351243, 0.224703568554], [0.430141336804, -0.37468913379], [0.292296368989, 0.477379784102], [-0.707442757205, 0.352703445601], [-0.297716822298, 0.654510337569], [-1.23125613346, 0.170412168793], [0.294553483808, -0.468351324828], [-0.0981844946026, 0.978459273798], [-0.955717056826, 0.285404516611], [-1.86141148847, 0.000174576818205], [-1.87002058157, -1.15657319071e-05], [0.329036804886, 0.498441925899], [-0.552067934839, 0.49431312482], [-0.752549575059, 0.127053824344], [-0.775345249984, 0.143342752296], [-0.801413884894, 0.254088779047], [-0.723229461757, 0.270396597478], [-0.742775898649, -0.218270537897], [0.407223796033, 0.319263455817], [0.397450425208, 0.136827052595], [0.299716644825, -0.0162889518414], [0.289943336213, -0.0130311614731], [0.28016908436, -0.0195463808831], [-0.195473369808, -0.66133971579], [-1.28826191107, 0.0638525892632], [-1.41583904059, 0.0436501134606], [-1.30753424658, 0.0735159817352], [-1.4703196347, -1.65014322703e-34], [-1.59962899543, 6.74107829036e-16], [-0.804227624934, 0.177056088068], [-0.764041095891, 0.133904109589], [-0.960155936704, 0.2720938919], [-1.11032026995, 0.278795169989], [-0.865369261477, -0.236427145709], [-0.800360230767, 0.165706052309], [-0.188928571429, -0.653857142857], [-0.0903571428571, 0.653857142857], [0.25289249252, -2.13677787172e-05], [-0.727318448642, 0.362344966282], [-0.67230851535, -0.459326022269], [-0.563825848411, -0.643479123819], [-0.563252193244, -0.642233600167], [0.44184113124, 0.377012968347], [-0.646582086467, 0.384887263475], [-1.40742871939, 0.136801742276], [-0.745113173889, -0.204099992565], [-0.745113174294, -0.204099992082], [-0.745113174294, -0.204099992081], [-0.743292416341, 0.131241762355], [0.356309775875, 0.352237194321], [-0.833758617531, -0.204639878111], [0.300449953288, 0.474322978697], [0.325983693411, 0.425014131548], [-1.23544832874, 0.142354421138], [0.294310009984, 0.485479973169], [0.325733285936, 0.428636252654], [0.307073749372, 0.585461008295], [0.289741667552, -0.490176764951], [-1.23137391927, 0.137300769409], [0.300858704415, -0.478067797682], [0.288687847634, -0.490133161317], [-1.23089352193, 0.133344890168], [-0.886525182522, -0.24116719021], [-0.372418585213, -0.0470057807412], [-0.209805602084, -0.127412654756], [-0.177679125671, -0.116801889837], [-0.604540074452, 0.110270021884], [-0.237423965852, 0.0709515512935], [-0.237180621258, 0.0714490284234], [-0.235709583976, 0.0744563169391], [-0.233721840193, 0.0785199250617], [-0.232340571971, 0.0813436958213], [-1.62560099933, 7.64469391346e-05], [-1.17981481481, 0.255555555556], [-1.25631516262, -0.380371868878], [-0.126862868566, -0.987250140984], [0.267651741869, -0.00390800134017], [0.274688948769, -0.00633846417184], [-1.74177083333, -1.61276419189e-14], [-0.221481481481, 0.698518518519], [-0.80712962963, -0.225740740741], [0.272592590399, 0.483425924666], [-0.751759259259, -0.0638888888889], [-0.767439516096, 0.176209677385], [-0.40088519334, -0.592834552636], [-0.45579688938, -0.577713901561], [-0.460853036978, -0.575050571151], [-0.743495547617, -0.154223153139], [-0.779162333887, -0.134535611324], [-0.778829423957, -0.135617670408], [-0.748534236675, -0.124798089947], [-0.774834450718, -0.134868525415], [0.37341954023, 0.105747126437], [-0.409770114942, 0.598132183908], [-0.166955579632, 0.656608884074]];
