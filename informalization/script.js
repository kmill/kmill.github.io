"use strict";

let mathjaxPromise = new Promise(function (resolve, reject) {
  if (MathJax.startup && MathJax.startup.promise) {
    MathJax.startup.promise.then(resolve, reject);
  } else {
    document.getElementById("MathJax-script").onload = function () {
      MathJax.startup.promise.then(resolve, reject);
    };
  }
});

async function typeset() {
  mathjaxPromise = (async() => {
    await mathjaxPromise;
    await MathJax.typesetPromise();
  })();
  try {
    return await mathjaxPromise;
  } catch (err) {
    return console.log('Typeset failed: ' + err.message);
  }
}

// Component for handling MathJax rendering lifecycle.
function MathJaxComponent(initialVnode) {
  let lastText = null;
  function maybeUpdate(vnode) {
    if (lastText !== vnode.attrs.text) {
      lastText = vnode.attrs.text;
      //MathJax.typesetClear([vnode.dom]);
      $(vnode.dom).empty().append(vnode.attrs.text);
      typeset(() => [vnode.dom]);
    }
  }
  return {
    oncreate: function (vnode) {
      maybeUpdate(vnode);
    },
    onupdate: function (vnode) {
      maybeUpdate(vnode);
    },
    onremove: function (vnode) {
      MathJax.typesetClear([vnode.dom]);
    },
    view: function (vnode) {
      return m("span.math", {rawText : vnode.attrs.text});
    }
  }
}

// Used by the MainComponent to highlight some nodes after expanding/collapsing explanations.
var highlightClassWhenClick = null;

function TooltipComponent(initialVnode) {
  let t = null;
  let shown = false;
  function createTippy(el) {
    t = tippy(el, {
      placement: "bottom", // <- instead of top to prevent overflow
      allowHTML: true,
      theme: "sample",
      interactive: true,
      trigger: "mouseenter click",
      animation: "scale-extreme",
      duration: [275, 100],
      appendTo: document.body,
      onMount(instance) {
        MathJax.typesetPromise([instance.popper]).then(() => {
          globalThis.tippyTypeset = true
        })
      },
      onShow(instance) {
        shown = true;
      },
      onHide(instance) {
        shown = false;
      }
    });
    if (shown) {
      shown = false;
      // Haven't had a case where this is needed, so waiting until it's obvious:
      //t.show(0);
    }
  }
  let lastTooltipText = null;
  function maybeCreateTippy(el) {
    // We need to keep track of whether the tooltip for this Component has changed, since
    // if it does we need to reinitialize tippy for this dom element.
    let newTooltipText = el.getAttribute("data-tippy-content");
    if (lastTooltipText !== newTooltipText) {
      lastTooltipText = newTooltipText;
      if (t) {
        t.destroy();
      }
      createTippy(el);
    }
  }
  return {
    oncreate : function (vnode) {
      maybeCreateTippy(vnode.dom);
    },
    onupdate: function (vnode) {
      maybeCreateTippy(vnode.dom);
      // TODO figure out how to get the tooltip to disappear when the contained children for this component change.
      // The following hack has the issue that if you move your mouse across this component just right you can get the tooltip to get stuck open.
      if (shown) {
        // Hack to get the tooltip to recenter
        //t.hide(0);
        //t.show(0);
      }
      //console.log(shown);
    },
    onremove : function (vnode) {
      lastTooltipText = null;
      shown = false;
      t.destroy();
    },
    view : function (vnode) {
      let tooltip = vnode.attrs.tooltip;
      return m("span.withToolTip", {'data-tippy-content' : tooltip}, vnode.children);
    }
  }
}

function ExplanationComponent(initialVnode) {
  return {
    view : function (vnode) {
      // The inlinePrefix is a list of elements that can commute with paragraph breaks, and they prefer to be the start of a new paragraph.
      let inlinePrefixNodes = vnode.attrs.inlinePrefix || [];
      let inlinePostfix = vnode.attrs.inlinePostfix || [];
      let explanation = vnode.attrs.explanation;
      let inspector = vnode.attrs.inspector;
      let name = vnode.attrs.name || "expl";
      let spanClasses = vnode.attrs.spanClasses || "";
      let tooltip = vnode.attrs.tooltip || null;

      // We process the explanation using a sort of state machine to split things into logical paragraph elements.

      let block = [];
      let currPara = [];
      let currSpan = [];
      let currSpanClasses = spanClasses;
      let currTooltip = tooltip;

      // This class is used to store the classes for each element pushed onto the InlinePrefix, which we need to do
      // since the span state is allowed to change before they are finally inserted into the span themselves.
      class InlinePrefixNode {
        constructor(classes, nodes) {
          this.classes = classes;
          this.nodes = nodes;
        }
      }
      let inlinePrefix = [new InlinePrefixNode(spanClasses, inlinePrefixNodes)];

      function withSpanClasses(newSpanClasses, f) {
        let oldSpanClasses = spanClasses;
        spanClasses = newSpanClasses;
        f();
        spanClasses = oldSpanClasses;
      }
      function withTooltip(newTooltip, f) {
        let oldTooltip = tooltip;
        tooltip = newTooltip;
        f();
        tooltip = oldTooltip;
      }

      // Whether the state for span content has changed.
      // This signals we need to end the current span before adding new content.
      function shouldFlushSpan() {
        return currSpanClasses !== spanClasses || currTooltip !== tooltip;
      }

      function withExtraClass(name, f) {
        withSpanClasses(spanClasses + " " + name, f);
      }

      function flushInlinePrefix() {
        if (inlinePrefix.length > 0) {
          let toPush = inlinePrefix;
          inlinePrefix = [];
          withTooltip(null, () => {
            toPush.forEach(o => {
              withSpanClasses(o.classes, () => {
                // Warning: this calls flushInlinePrefix, but it is OK because we cleared inlinePrefix.
                addToPara(...o.nodes);
              });
            });
        });
        }
      }

      function flushSpan() {
        if (currSpan.length > 0) {
          let e = null;
          if (currSpanClasses.length > 0) {
            e = m("span", {class : currSpanClasses}, currSpan);
          } else {
            e = m.fragment(currSpan);
          }
          if (currTooltip !== null) {
            e = m(TooltipComponent, {tooltip : currTooltip}, e);
          }
          currPara.push(e);
          currSpan = [];
        }
        currSpanClasses = spanClasses;
        currTooltip = tooltip;
      }

      function paragraphBreak(hard) {
        if (hard) {
          flushInlinePrefix();
        }
        flushSpan();
        if (currPara.length > 0) {
          block.push(m("p", currPara));
          currPara = [];
        }
      }
      function addToPara(...args) {
        flushInlinePrefix();
        if (shouldFlushSpan()) {
          flushSpan();
        }
        currSpan.push(...args);
      }
      function addToInlinePrefix(...args) {
        flushSpan();
        inlinePrefix.push(new InlinePrefixNode(spanClasses, args));
      }

      function process(e, name) {
        switch (e.type) {
          case "Explanation.empty":
            break;
          case "Explanation.paragraphBreak":
            paragraphBreak();
            break;
          case "Explanation.str":
            addToPara(m(MathJaxComponent, {text : e.value}));
            break;
          case "Explanation.human":
            addToPara(m("span.human", m(MathJaxComponent, {text : e.value})));
            break;
          case "Explanation.join":
            e.value.forEach((e2, i) => process(e2, name + "-join" + i));
            break;
          case "Explanation.goalState":
            let attrs = {onclick : function () { inspector.toggleGoal(e.goalState); }};
            if (inspector.getGoal() === e.goalState) {
              attrs.class = "goal_button_active";
            }
            addToInlinePrefix(" ", m(".goal_button", attrs, "⬭"), " ");
            break;
          case "Explanation.withToolTip":
            withTooltip(e.tooltip, () => {
              process(e.value, name + "-tooltip");
            });
            break;
          case "Explanation.withReplacement":
            if (e.expanded) {
              process(e.preReplace, name + "-prerepl");
              let newName = name + "-repl";
              withExtraClass(newName, () => {
                addToInlinePrefix(m("span.explanation_refinement_button.button_unexpand",
                            {"data-expl" : name, // for debugging
                             "data-highlight" : newName,
                              onclick : function () { e.expanded = false; highlightClassWhenClick = name + "-val"; } },
                            "⊖"));
                process(e.replace, newName + "-postrepl");
              });
              process(e.postReplace, name);
            } else {
              process(e.preValue, name + "-preval");
              let newName = name + "-val";
              withExtraClass(newName, () => {
                addToInlinePrefix(m("span.explanation_refinement_button.button_expand",
                            {"data-expl" : name, // for debugging
                              "data-highlight" : newName,
                              onclick : function () { e.expanded = true; highlightClassWhenClick = name + "-repl"; } },
                            "⊕"));
                process(e.value, newName);
              });
              process(e.postValue, name + "-postval");
            }
            break;
          case "Explanation.withTrailer":
            withExtraClass(name + "-trail", () => {
              addToPara(m("a.explanation_withTrailer",
                { href : "#",
                  "data-highlight": name + "-trail",
                  onclick : (event) => {
                    event.preventDefault();
                    e.expanded = !e.expanded;
                    highlightClassWhenClick = name + "-trail";
                  }},
                e.value));
              if (e.expanded) {
                process(e.trailer, name + "-trail");
              }
            });

            break;
          case "Explanation.indent":
            paragraphBreak(true);
            block.push(m(".explanation_indent", m(ExplanationComponent, {explanation : e.value, inspector, name : name + "-ind", spanClasses})));
            break;
          case "Explanation.list":
            paragraphBreak(true);
            block.push(m("ul", e.value.map((item, i) => m("li", m(ExplanationComponent, {explanation : item, inspector, name : name + "-list" + i, spanClasses})))));
            break;
          case "Explanation.enumList":
            paragraphBreak(true);
            block.push(m("ol", {type : "1"}, e.value.map((item, i) => m("li", m(ExplanationComponent, {explanation : item, inspector, name : name + "-list" + i, spanClasses})))));
            break;
          case "Explanation.computation":
            paragraphBreak(true);
            let table_rows = [];
            let start = m("td", `\\(${e.start}\\)`);
            e.steps.forEach((step, i) => {
              let row = m("tr", [start, m("td", `\\(${step.rel}\\)`), m("td", `\\(${step.rhs}\\)`),
                                 m("td.explanation", m(ExplanationComponent, {explanation : step.expl, inspector, name : name + "-computation" + i, spanClasses}))]);
              table_rows.push(row);
              start = m("td");
            });
            if (table_rows.length === 0) {
              // shouldn't happen.
              table_rows.push(m("tr", start));
            }
            block.push(m("table.explanation_computation", table_rows));
            break;
          default:
            paragraphBreak();
            addToPara(`Unknown explanation type ${e.type}.`);
            paragraphBreak();
            break;
        }
      }

      process(explanation, name);
      addToInlinePrefix(...inlinePostfix);
      paragraphBreak(true);

      return m.fragment(block);
    }
  }
}

function ProofComponent(initialVnode) {
  return {
    view : function (vnode) {
      let explanation = vnode.attrs.explanation;
      let name = vnode.attrs.name;
      let inspector = vnode.attrs.inspector;

      return m(".proof", [
        m(ExplanationComponent, {inlinePrefix : [m("span.proof_text", "Proof."), " "],
                                 inlinePostfix : [m("span.qed", "□")],
                                 spanClasses : "highlightable",
                                 explanation : explanation,
                                 name : name,
                                 inspector}),
      ])
    }
  }
}

function TheoremComponent(initialVnode) {
  return {
    view : function (vnode) {
      let decl = vnode.attrs.info;
      let name = vnode.attrs.name || 'thm'
      let inspector = vnode.attrs.inspector;

      console.log(decl);
      let body = [
        m(".theorem_statement", [
          m("span.theorem_name", [decl.header, " (", m("code", decl.name), ")."]),
          " ", m(MathJaxComponent, {text : decl.statement})
        ])
      ];
      decl.explanations.forEach((e, i) => {
        body.push(m(ProofComponent, {explanation : e, name : `${name}-proof${i}`, inspector}));
      });
      return m(".theorem", body);
    }
  }
}

function DocumentComponent(initialVnode) {
  return {
    view : function (vnode) {
      let decls = vnode.attrs.decls;
      let inspector = vnode.attrs.inspector;

      // TODO generic walker
      function setAllExpanded(expanded, o) {
        switch (o.type) {
          case "LemmaInfo":
            o.explanations.forEach(e => setAllExpanded(expanded, e));
            break;
          case "Explanation.empty":
          case "Explanation.paragraphBreak":
          case "Explanation.str":
          case "Explanation.human":
            break;
          case "Explanation.join":
            o.value.forEach(e => setAllExpanded(expanded, e));
            break;
          case "Explanation.goalState":
            break;
          case "Explanation.withReplacement":
            o.expanded = expanded;
            setAllExpanded(expanded, o.preValue);
            setAllExpanded(expanded, o.value);
            setAllExpanded(expanded, o.postValue);
            setAllExpanded(expanded, o.preReplace);
            setAllExpanded(expanded, o.replace);
            setAllExpanded(expanded, o.postReplace);
            break;
          case "Explanation.withTrailer":
            o.expanded = expanded;
            setAllExpanded(expanded, o.trailer);
            break;
          case "Explanation.withToolTip":
            setAllExpanded(expanded, o.value);
            break;
          case "Explanation.indent":
            setAllExpanded(expanded, o.value);
            break;
          case "Explanation.list":
            o.value.forEach(e => setAllExpanded(expanded, e));
            break;
          case "Explanation.enumList":
            o.value.forEach(e => setAllExpanded(expanded, e));
            break;
          case "Explanation.computation":
            o.steps.forEach(step => {
              setAllExpanded(expanded, step.expl);
            });
            break;
          default:
            throw Error(`Unknown type ${o.type}`)
        }
      }
      function expandAll() { decls.forEach(decl => { setAllExpanded(true, decl); highlightClassWhenClick = null; }); }
      function unexpandAll() { decls.forEach(decl => { setAllExpanded(false, decl); highlightClassWhenClick = null; }); }

      let result = [];

      result.push(m(".controls", [
        m("input", {type : "button", value : "Expand all", onclick : expandAll}),
        " ",
        m("input", {type : "button", value : "Collapse all", onclick : unexpandAll})
      ]));

      decls.forEach((decl, i) => {
        switch (decl.type) {
          case "LemmaInfo":
            result.push(m(TheoremComponent, {info : decl, name : `thm${i}`, inspector}));
            break;
          default:
            result.push(m(".error", `Unknown declaration type ${decl.type}.`));
        }
      });
      return m(".document", result);
    }
  }
}

function commaSep(items) {
  if (items.length === 0)
    return "";
  else if (items.length === 1)
    return items[0];
  else if (items.length === 2)
    return `${items[0]} and ${items[1]}`;
  else
    return `${items[0]}, ${commaSep(items.slice(1))}`;
}

function GoalComponent(initialVnode) {
  return {
    view : function (vnode) {
      let inspector = vnode.attrs.inspector;

      let G = inspector.getGoal();
      if (!G) {
        return m(".goal_view", m(".goal_header", "No proof state selected."));
      }

      console.log(G);

      let mitems = [];
      let currVars = [], singularType = null, pluralType = null, classes = [], provides = [];
      function mergeable(item) {
        return item.name !== null && item.pluralType !== null && !item.auxDecl && !item.implementationDetail && !item.value;
      }
      function flush() {
        if (currVars.length !== 0) {
          let type = currVars.length === 1 ? singularType : pluralType;
          let vars = commaSep(currVars.filter(v => v !== null).map(v => `\\(${v}\\)`));
          let decl = m("div.goal_context_item_text", m(MathJaxComponent, {text : `${vars} ${type}`}));
          if (provides.length > 0) {
            let mprovides = [];
            provides.forEach(v => {
              mprovides.push(m("div.goal_context_item_provides", [
                m(MathJaxComponent, {text : `\\((${v})\\)`})
              ]));
            })
            decl = m.fragment([decl,
              m("div.goal_context_item_provides_holder", mprovides)]);
          }
          mitems.push(m(".goal_context_item", {class : classes.join(" ")}, decl));
          // ++ if let some value := ci.value then s!" := <span class=goal_context_item_value>{value}</div>" else ""
          currVars.length = 0;
          singularType = pluralType = null;
          classes.length = 0;
          provides.length = 0;
        }
      }
      G.items.forEach(item => {
        if (mergeable(item) && singularType == item.singularType) {
          currVars.push(item.name);
        } else {
          flush();
          currVars.push(item.name);
          provides.push(...item.provides);
          singularType = item.singularType;
          pluralType = item.pluralType;
          if (item.auxDecl) { classes.push("goal_context_item_aux_decl"); }
          if (item.implementationDetail) { classes.push("goal_context_item_implementation_detail"); }
          if (!mergeable(item)) {
            flush();
          }
        }
      });
      flush();

      return m(".goal_view", [
        m(".goal_header", "Current proof state:"),
        m(".goal_items", mitems),
        m(".goal_context_target", [G.targetPrefix, " ", m(MathJaxComponent, {text : G.target})]),
        m("p", [m(MathJaxComponent, {text : G.paragraphForm})])
      ]);
    }
  }
}

function MainComponent(initialVnode) {
  let currGoal = null;

  let inspector = {
    setGoal(newGoal) {
      currGoal = newGoal;
    },
    getGoal() {
      return currGoal;
    },
    toggleGoal(newGoal) {
      if (newGoal === currGoal) {
        currGoal = null;
      } else {
        currGoal = newGoal;
      }
    }
  }

  let split = null;

  return {
    view : function (vnode) {
      return m(".main_div", [
        m(".main_doc", [m(DocumentComponent, {decls : declData, inspector})]),
        m(".main_goal", [m(GoalComponent, {inspector})])
      ]);
    },
    oncreate : function (vnode) {
      let columnElts = Array.prototype.slice.call(vnode.dom.children);
      split = Split(columnElts, {
        sizes: [60, 40], // in percent
        minSize: 200, // in pixels
      });
    },
    onremove : function (vnode) {
      split.destroy();
    },
    onbeforeupdate : function (vnode) {
      $(".highlight").removeClass("highlight");
    },
    onupdate : function (vnode) {
      //typeset();
      //typeset(() => [vnode.dom]);

      if (highlightClassWhenClick) {
        $("." + highlightClassWhenClick).addClass("highlight");
        highlightClassWhenClick = null;
      }
    }
  };
}

$(document).ready(function () {
  m.mount(document.getElementById("main"), MainComponent);

  $(document).mouseover(function (e) {
    let highlight = e.target.getAttribute("data-highlight");
    if (highlight) {
      e.stopPropagation();
      $("." + highlight).addClass("highlight");
    } else {
      // If a button moves when expanding, this helps make sure we can clear any highlighting.
      highlightClassWhenClick = null;
      $(".highlight").removeClass("highlight");
    }
  });
  $(document).mouseout(function (e) {
    let highlight = e.target.getAttribute("data-highlight");
    if (highlight) {
      e.stopPropagation();
      highlightClassWhenClick = null;
      $(".highlight").removeClass("highlight");
    }
  });
});
