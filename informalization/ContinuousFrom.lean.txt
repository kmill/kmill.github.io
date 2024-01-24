import Examples.Topology

open Set

theorem continuous_of_dense [TopologicalSpace X] [TopologicalSpace Y] [RegularSpace' Y]
    {A : Set X} (hA : Dense A) (f : X → Y) (hf : ∀ x, ContinuousWithinAt' f A x) : Continuous' f := by
  intro x
  suffices key : ∀ V' ∈ Nhd (f x), IsClosed V' → ∃ U ∈ Nhd x, f '' U ⊆ V'
  · intro V' V'_in
    rcases RegularSpace'.closed_nhd_basis (f x) V' V'_in with ⟨W, W_in, W_closed, hW⟩
    rcases key W W_in W_closed with ⟨U, U_in, hU⟩
    exact ⟨U, U_in, hU.trans hW⟩
  intro V' V'_in V'_closed
  obtain ⟨V, V_in, V_op, hV⟩ : ∃ V ∈ Nhd x, IsOpen V ∧ f '' (V ∩ A) ⊆ V'
  · rcases (hf x).2 V' V'_in with ⟨U, U_in, hU⟩
    rcases exists_IsOpen_Nhd U_in with ⟨V, V_in, V_op, hVU⟩
    use V, V_in, V_op
    exact (image_subset f $ inter_subset_inter_left A hVU).trans hU
  use V, V_in
  rintro _ ⟨z, z_in, rfl⟩
  have limV : TendsToWithin f (V ∩ A) z (f z)
  · constructor
    · apply V_op.inter_closure (t := A)
      exact ⟨z_in, hA z⟩
    · intro W W_in
      rcases (hf z).2 W W_in with ⟨U, U_in, hU⟩
      use U, U_in
      exact (image_subset f $ inter_subset_inter_right U (inter_subset_right V A)).trans hU
  calc
    f z ∈ closure (f '' (V ∩ A)) := limV.mem_closure_image
    _   ⊆ closure V'             := closure_mono hV
    _   = V'                     := V'_closed.closure_eq















set_option trace.English true
#english ∀ X Y [TopologicalSpace X] [TopologicalSpace Y] [RegularSpace' Y]
{A : Set X},  Dense A → ∀ (f : X → Y),  (∀ x, ContinuousWithinAt' f A x) → Continuous' f