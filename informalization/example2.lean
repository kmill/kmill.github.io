import Mathlib.Tactic
import Informal.Proofs.PrintProofsIn

def injective {α β : Type _} (f : α → β) := ∀ (x y : α), f x = f y → x = y

theorem inj_comp {α β γ} {f : α → β} {g : β → γ} (hf : injective f) (hg : injective g) :
  injective (g ∘ f) :=
by
  intros x y h
  have key : f x = f y := by
    apply hg
    exact h
  apply hf
  exact key

theorem inj_comp'' {α β γ} {f : α → β} {g : β → γ} (hf : injective f) (hg : injective g) :
  injective (g ∘ f) :=
by
  intros x y h
  have key : f x = f y := by
    exact hg _ _ h
  exact hf x y key

--#print_proofs (config := .verbose) in
theorem have_ex : 2 = 2 :=
by
  have : ∀ (x : Nat), x = x
  · intro x
    rfl
  apply this

theorem constructor : True ∧ 1 = 1 := by
  constructor
  · trivial
  · rfl

theorem rcases_test (p : α → Prop) (h : ∃ n, p n) : Nonempty α := by
  rcases h with ⟨n, hn⟩
  constructor
  assumption

theorem rcases_test2 (α : Nat → Type) (v : (n : Nat) × (α n)) : ∃ n, Nonempty (α n) := by
  rcases v with ⟨n, x⟩
  use n
  constructor
  assumption

theorem rcases_test3 (α β : Nat → Type) (v : (n : Nat) × (α n) × (β n)) : ∃ n, Nonempty (α n) := by
  rcases v with ⟨n, x, y⟩
  use n
  constructor
  assumption

theorem rcases_test4 (α : Nat → Type) (p : (n : Nat) → α n → Prop) (h : ∃ (n : Nat) (x : α n), p n x) :
    ∃ (v : (n : Nat) × α n), p v.1 v.2 := by
  rcases h with ⟨n, x, h⟩
  exact ⟨⟨n, x⟩, h⟩

theorem rcases_test5 (α : Nat → Type) (p : (n : Nat) → α n → Prop) (h : ∃ (v : (n : Nat) × α n), p v.1 v.2) :
    ∃ (n : Nat) (x : α n), p n x := by
  rcases h with ⟨⟨n, x⟩, h⟩
  exact ⟨n, x, h⟩

theorem obv1 (P Q : Prop) (hp : P) (hq : Q) : P ∧ Q := by
  constructor
  · assumption
  · assumption

theorem obv2 (P Q : Prop) (hpq : P ∧ Q) : P ∧ Q := by
  assumption

theorem nat_add_comm (m n : Nat) : m + n = n + m := by
  induction n with
  | zero => exact (Nat.zero_add _).symm
  | succ n' ih =>
    calc m + (n' + 1) = (m + n') + 1 := Nat.add_succ _ _
         _            = (n' + m) + 1 := congrArg (· + 1) ih
         _            = (n' + 1) + m := (Nat.succ_add n' m).symm
