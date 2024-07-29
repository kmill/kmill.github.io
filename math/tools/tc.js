// tc.js

"use strict";

var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

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

function gen(v,/*opt*/e) {
  /* create a word from a single variable */
  return [{v:v, e:arguments.length<2?1:+e}];
}

function inv(r) {
  var rinv = r.map(function (a) { return { v : a.v, e : -a.e }; });
  rinv.reverse();
  return rinv;
}

function prod(w1, w2) {
  /* prod guarantees the product of simplified words is simplified */
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
  /* raises a word to the nth power */
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
  /* breaks exponents into individual t^1 and t^-1 terms */
  var r2 = [];
  for (var i = 0; i < r.length; i++) {
    var e = Math.abs(r[i].e);
    for (var j = 0; j < e; j++) {
      r2.push({v : r[i].v, e : sign(r[i].e)});
    }
  }
  return r2;
}

function generators(rels) {
  /* returns the set of generator variables for a set of relations */
  var gens = [];
  rels.forEach(function (r) {
    r.forEach(function (t) {
      if (gens.indexOf(t.v) === -1) {
        gens.push(t.v);
      }
    });
  });
  return gens;
}

function parse_rel(s) {
  /* parses things such as ab^2c^-2(a(ab)^3b^2)^3 */
  var re = /([\)1a-z])(\^(-?[0-9]+))?|(\()/g;
  var m;
  var r = [],
      rs = [];
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
    } else if (m[1] !== '1' && exponent !== 0) {
      r = prod(r, gen(m[1], exponent));
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
    } else {
      rels.push(simp(parse_rel(s)));
    }
  });
  return rels;
}

function repr_rel(r) {
  var d = Q.span();
  if (r.length === 0) {
    d.append('1');
  }
  for (var i = 0; i < r.length; i++) {
    d.append(Q.span(r[i].v).addClass('var'));
    if (r[i].e !== 1) {
      d.append(Q.sup(''+r[i].e));
    }
  }
  return d;
}

function CoveringSpace() {
  this._vertices = {}; // id -> (gen -> id)
  this._nextVertex = 1;

  this._unvisited = [];
  this._seen = {};

  this._vert_quo = {}; // tracks quotiented vertices

  this.v1 = this.createVertex();
}
CoveringSpace.getGen = function (v, invp) {
  return (invp ? '-' : '+') + v;
};
CoveringSpace.invGen = function (g) {
  return (g[0] === '+' ? '-' : '+') + g.slice(1);
};
CoveringSpace.prototype.createVertex = function () {
  var id = this._nextVertex++;
  this._vertices[id] = {};
  this._unvisited.push(id);
  return id;
};
CoveringSpace.prototype.getVertex = function (id) {
  var id2 = id;
  while (has(this._vert_quo, id2)) {
    id2 = this._vert_quo[id2];
  }
  if (id2 !== id) {
    this._vert_quo[id] = id2;
  }
  return id2;
};
CoveringSpace.prototype.join = function (id1, id2) {
  var rid = id1;
  var to_join = [id1, id2];
  while (to_join.length > 0) {
    id2 = this.getVertex(to_join.pop());
    id1 = this.getVertex(to_join.pop());
    if (id1 !== id2) {
      this._vert_quo[id2] = id1;
      if (has(this._seen, id2) && !has(this._seen, id1)) {
        this._seen[id1] = true;
      }
      var adj1 = this._vertices[id1];
      var adj2 = this._vertices[id2];
      delete this._vertices[id2];

      for (var g in adj2) {
        if (has(adj2, g)) {
          if (has(adj1, g)) {
            to_join.push(adj1[g]);
            to_join.push(adj2[g]);
          } else {
            adj1[g] = adj2[g];
          }
        }
      }
    }
  }
  return this.getVertex(rid);
};
CoveringSpace.prototype.addEdge = function (id1, g, id2) {
  id1 = this.getVertex(id1);
  if (!has(this._vertices[id1], g)) {
    this._vertices[id1][g] = id2;
  } else {
    this.join(this._vertices[id1][g], id2);
  }
  return this;
};
CoveringSpace.prototype.follow = function (id, g, /*opt*/eid) {
  /* follows edge labeled g from vertex, with an optional expected destination */
  id = this.getVertex(id);
  var rid;
  if (!has(this._vertices[id], g)) {
    rid = eid !== void 0 ? eid : this.createVertex();
    this.addEdge(id, g, rid);
    this.addEdge(rid, CoveringSpace.invGen(g), id);
  } else {
    rid = this.getVertex(this._vertices[id][g]);
    if (eid !== void 0 && rid !== eid) {
      this.join(eid, rid);
    }
  }
  return rid;
};
CoveringSpace.prototype.getUnvisited = function () {
  while (this._unvisited.length > 0) {
    var id = this.getVertex(this._unvisited.shift());
    if (!has(this._seen, id)) {
      this._seen[id] = true;
      return id;
    }
  }
  return null;
};
CoveringSpace.prototype.numVertices = function () {
  var num = 0;
  for (var id in this._vertices) {
    if (has(this._vertices, id)) {
      num++;
    }
  }
  return num;
};
CoveringSpace.prototype.vertices = function () {
  var vertices = [];
  for (var id in this._vertices) {
    if (has(this._vertices, id)) {
      vertices.push(id);
    }
  }
  return vertices;
};

function TC(gens) {
  this.gens = gens;

  this.cs = new CoveringSpace();
  this.cid1 = this.cs.v1;

  this.num = 0;
  this.go = true;
}
TC.getGen = function (g) {
  return CoveringSpace.getGen(g.v, g.e < 0);
};
TC.prototype.mul = function (g, cid, /*opt*/ecid) {
  return this.cs.follow(cid, TC.getGen(g), ecid);
};
TC.prototype.addRel = function (r, cid) {
  var c = cid;
  for (var j = r.length - 1; j >= 0; j--) {
    if (j === 0) {
      c = this.mul(r[j], c, cid);
    } else {
      c = this.mul(r[j], c);
    }
  }
};
TC.prototype.init = function (rels) {
  for (var i = 0; i < rels.length; i++) {
    this.addRel(rels[i], this.cid1);
  }
};
TC.prototype.step = function (rels) {
  /* expects _unsimplified_ (via unsimp) relations */
  var cid = this.cs.getUnvisited();
  if (cid === null) {
    return false;
  }
  this.num++;
  for (var i = 0; i < this.gens.length; i++) {
    this.cs.follow(cid, CoveringSpace.getGen(this.gens[i], true));
    this.cs.follow(cid, CoveringSpace.getGen(this.gens[i], false));
  }
  for (var i = 0; i < rels.length; i++) {
    this.addRel(rels[i], cid);
  }
  return true;
};
TC.prototype.run = function (rels, found, stats) {
  /* expects _unsimplified_ (via unsimp) relations */
  stats = stats || function () {};
  var self = this;
  window.setTimeout(function () {
    if (!self.go) return;
    var start = Date.now();
    while (Date.now() - start < 5) {
      for (var i = 0; i < 200; i++) {
        if (!self.step(rels)) {
          found(self);
          return;
        }
      }
    }
    stats(self);
    self.run(rels, found, stats);
  }, 0);
};
TC.prototype.num_cosets = function () {
  return this.cs.numVertices();
};
TC.prototype.name_cosets = function () {
  var start = this.cs.getVertex(this.cid1);
  this.coset_names = {};
  this.coset_names[start] = [];
  var to_visit = [start];
  while (to_visit.length > 0) {
    var v = this.cs.getVertex(to_visit.shift());
    for (var i = 0; i < this.gens.length; i++) {
      var v2 = this.mul({v : this.gens[i], e : 1}, v);
      if (!has(this.coset_names, v2)) {
        this.coset_names[v2] = [this.gens[i]].concat(this.coset_names[v]);
        to_visit.push(v2);
      }
    }
  }
};
TC.prototype.cosets = function () {
  return this.cs.vertices();
};

function get_relations(el) {
  var lines = el.value().split(/\r?\n/);
  var rels = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.length > 0) {
      parse_rels(line).forEach(function (rel) { rels.push(rel); });
    }
  }
  rels = rels.filter(function (r) { return r.length > 0; });
  return rels;
}
function print_generators(gens, dest) {
  if (gens.length === 0) {
    dest.append(Q.div("no generators"));
    return;
  }
  for (var i = 0; i < gens.length; i++) {
    if (i > 0) {
      dest.append(', ');
    }
    dest.append(Q.span(gens[i]).addClass('var'));
  }
}
function print_relations(rels, dest) {
  if (rels.length === 0) {
    dest.append(Q.div('none'));
    return;
  }
  for (var i = 0; i < rels.length; i++) {
    var p = Q.div(repr_rel(rels[i])).appendTo(dest);
    if (rels[i].eq) {
      p
        .append('\u2001(')
        .append(repr_rel(rels[i].eq[0]))
        .append(Q.span('=').addClass('eq'))
        .append(repr_rel(rels[i].eq[1]))
        .append(')');
    }
  }
}


Q(function () {
  Q('#compute').on("click", function (e) {
    e.preventDefault();

    Q('#stop').prop('disabled', false);

    Q('#derivation').empty();

    var grels = get_relations(Q('#Grelations'));
    var hrels = get_relations(Q('#Hrelations'));

    var gens = generators(grels.concat(hrels));

    Q('#desc').css("display", "block");

    print_generators(gens, Q("#printedGenerators").empty());
    print_relations(grels, Q("#printedGRelations").empty());
    print_relations(hrels, Q("#printedHRelations").empty());

    var tc = new TC(gens);

    grels = grels.map(function (rel) { return unsimp(rel); });
    hrels = hrels.map(function (rel) { return unsimp(rel); });

    console.log(grels);

    if (window.tc) { window.tc.go = false; }
    window.tc = tc;

    Q('#derivation').empty();

    tc.init(hrels);
    tc.run(grels, function (tc) {
      Q('#stats')
        .empty()
        .append("(Visited " + tc.num + " cosets. Finished with " + tc.num_cosets() + ".)");

      Q('#stop').prop('disabled', true);
      //window.tc = null;

      tc.name_cosets();
      var cosets = tc.cosets();
      cosets.sort(function (a, b) {
        var cnamea = tc.coset_names[a];
        var cnameb = tc.coset_names[b];
        if (cnamea.length < cnameb.length) { return -1; }
        else if (cnamea.length > cnameb.length) { return 1; }
        else if ('' + cnamea < '' + cnameb) { return -1; }
        else if ('' + cnamea > '' + cnameb) { return 1; }
        else { return 0; }
      });
      console.log(cosets);

      function word_name(w) {
        w = simp(w);
        var span = Q.span();
        if (w.length > 0 || hrels.length === 0) {
          span.append(repr_rel(w));
        }
        if (hrels.length > 0) {
          span.append('H');
        }
        return span;
      }
      function coset_name(cid) {
        return word_name(tc.coset_names[cid].map(function (g) { return {v:g,e:1};}));
      }

      var coset_index = {};
      for (var i = 0; i < cosets.length; i++) {
        coset_index[cosets[i]] = i;
      }


      function eq() {
        return Q.span('=').addClass('eq');
      }
      function cdot() {
        return Q.span('\u00b7').addClass('eq');
      }


      var deriv = Q('#derivation').empty();

      var toggleIndices = Q.a("(toggle indices)").prop("href", "#");

      Q.p('Permutation representations of generators: ').append(toggleIndices).appendTo(deriv);

      toggleIndices.on("click", function (e) {
        e.preventDefault();
        deriv.toggleClass("show_indices");
      });

      function cycle_decomp(f) {
        var to_see = cosets.slice(0).map(function (d) { return +d; });
        var perms = [];
        while (to_see.length > 0) {
          var c = to_see.shift();
          var this_perm = [c];
          var d = f(c);
          while (+d !== +c) {
            this_perm.push(d);
            to_see.splice(to_see.indexOf(+d), 1);
            d = f(d);
          }
          if (this_perm.length > 1) {
            perms.push(this_perm);
          }
        }
        if (perms.length === 0) {
          perms.push([]);
        }
        return perms;
      }
      function show_cycle_decomp(div, perms) {
        perms.forEach(function (perm) {
          div.append('(');
          for (var i = 0; i < perm.length; i++) {
            if (i > 0) {
              div.append('\u2002');
              //div.append(' ');
              //div.append('\u205f');
            }
            div.append(Q.span(coset_name(perm[i])).addClass("coset_name"));
            div.append(Q.span(coset_index[perm[i]] + 1).addClass("coset_index"));
          }
          div.append(')');
        });
      }

      for (var i = 0; i < tc.gens.length; i++) {
        var g = {v:tc.gens[i],e:1};
        perms = cycle_decomp(function (c) { return tc.mul(g, c); });
        
        var div = Q.div(tc.gens[i], eq()).appendTo(deriv);
        show_cycle_decomp(div, perms);
        console.log(g.v, '(' + perms.join(')(') + ')');
      }

      Q.p('List of cosets:').appendTo(deriv);

      var list = Q.ol().appendTo(deriv);
      for (var i = 0; i < cosets.length; i++) {
        var cid = cosets[i];
        list.append(Q.li(Q.div(coset_name(cid))));
      }

      
      var is_normal = true;
      var automorphisms = [];
      test_normal:
      for (var i = 0; i < tc.gens.length; i++) {
        var auto = {}; // automorphism to construct
        auto[1] = tc.mul({v:tc.gens[i],e:1}, 1);
        var seen = {};
        var to_see = [1]; // list of cosets in domain
        while (to_see.length > 0) {
          var c = to_see.shift();
          if (c in seen) continue;
          seen[c] = true;
          for (var j = 0; j < tc.gens.length; j++) {
            var c2 = tc.mul({v:tc.gens[j],e:1},c);
            var c2t = tc.mul({v:tc.gens[j],e:1},auto[c]);
            if (c2 in auto && auto[c2] != c2t) {
              is_normal = false;
              continue test_normal;
            }
            auto[c2] = c2t;
            to_see.push(c2);
          }
        }
        console.log(auto);
        automorphisms.push(auto);
      }
      console.log("normal: ", is_normal);

      if (!is_normal) {
        Q.p('H is not a normal subgroup.').appendTo(deriv);
      } else {
        Q.p('H is a normal subgroup. Generators for a coset-transitive automorphism group:').appendTo(deriv);
        var list = Q.ol().appendTo(deriv);
        for (var i = 0; i < automorphisms.length; i++) {
          var perms = cycle_decomp(function (d) { return automorphisms[i][d]; });
          console.log(perms);
          var li = Q.li().appendTo(list);
          show_cycle_decomp(li, perms);
        }
      }

      var crepform = Q.create('form').appendTo(deriv);
      var creplabel = Q.create('label').appendTo(crepform);
      creplabel.append("Representative for: ");
      var crepinput = Q.create('input').appendTo(creplabel);
      crepinput.prop("type", "text").prop("placeholder", "word");
      var crepbutton = Q.create('input').appendTo(crepform);
      crepbutton.prop("type", "submit").prop("value", "Compute");
      var crepdest = Q.div().appendTo(deriv);
      function crep_compute(e) {
        e.preventDefault();
        crepdest.empty();
        var word = unsimp(parse_rel(crepinput.value()));
        var cs = tc.cid1;
        for (var i = word.length-1; i >= 0; i--) {
          cs = tc.mul(word[i], cs);
        }
        crepdest.append("is ");
        crepdest.append(word_name(word));
        crepdest.append(eq());
        crepdest.append(coset_name(cs));
      }
      crepform.on("submit", crep_compute);

      var normCore = Q.p("Index of normal core of H: ").appendTo(deriv);
      var normCoreSize = Q.span().appendTo(normCore);
      var normalCoreButton = Q.create("input").appendTo(normCoreSize);
      normalCoreButton.prop('type', 'button').prop('value', 'Compute');
      normalCoreButton.on('click', function (e) {
        e.preventDefault();
        normCoreSize.empty();
        // calculate normal core of stabilizer (i.e., kernel of perm repr)
        var start = cosets;
        var to_visit = [start];
        var core_verts = new Set;
        while (to_visit.length > 0) {
          var node = to_visit.pop();
          if (core_verts.has(node.toString())) continue;
          core_verts.add(node.toString());
          for (var i = 0; i < tc.gens.length; i++) {
            for (var pow = -1; pow <= 1; pow += 2) {
              var g = {v:tc.gens[i],e:pow};
              var node2 = node.map(function (c) { return tc.mul(g,c); });
              to_visit.push(node2);
            }
          }
        }
        normCoreSize.append(''+core_verts.size);
      });
      
    }, function (tc) {
      Q("#stats")
        .empty()
        .append("(Visited " + tc.num + " cosets.  Currently have " + tc.num_cosets() + ". Running...)");
    });
  });

  Q('#stop').on("click", function (e) {
    e.preventDefault();
    if (window.tc) { window.tc.go = false; }
    window.tc = null;
    Q('#stop').prop('disabled', true);
  });

});
