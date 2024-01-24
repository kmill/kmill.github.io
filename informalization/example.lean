import Mathlib.Tactic.SolveByElim
import Informal.Proofs.PrintProofsIn

open Function

--#print_proofs (config := .verbose) in
theorem inj_comp {α β γ} {f : α → β} {g : β → γ} (hf : Injective f) (hg : Injective g) :
  Injective (g ∘ f) :=
by
  --change ∀ _, _
  intros x y h
  apply hf
  apply hg
  exact h

--#print_proofs (config := .verbose) in
theorem inj_comp₂ {α β γ} {f : α → β} {g : β → γ} (hf : Injective f) (hg : Injective g) :
  Injective (g ∘ f) :=
by
  intros x y h
  refine' hf ?_
  apply hg
  exact h

--#print_proofs (config := .verbose) in
theorem inj_comp₃ {α β γ} {f : α → β} {g : β → γ} (hf : Injective f) (hg : Injective g) :
  Injective (g ∘ f) :=
by
  intros x y h
  solve_by_elim

--#print_proofs (config := .verbose) in
theorem contra (P : Prop) (h : ¬ ¬ P) : P := by
  by_contra h'
  exact h h'

--#print_proofs (config := .verbose) in
theorem bycases (P Q : Prop) (hPQ : P → Q) (hnPQ : ¬ P → Q) : Q := by
  by_cases h : P
  · exact hPQ h
  · exact hnPQ h

--#print_proofs (config := .verbose) in
theorem withLet : True := by
  let x : True := trivial
  exact x

--#print_proofs (config := .verbose) in
/- TODO: we would like the next two examples to render the same.-/
theorem withExacts (P Q : Prop) (h : P) (h' : Q) : P ∧ Q  := by
  constructor
  exacts [h, h']

--#print_proofs (config := .verbose) in
theorem withConstructor (P Q : Prop) (h : P) (h' : Q) : P ∧ Q  := by
  constructor
  exact h
  exact h'
