import Examples.Topology

section

theorem rudin {X : Type*} [TopologicalSpace X] (E : Set X) :
    IsOpen E ↔ IsClosed Eᶜ := by
  constructor
  · intro hop
    apply isClosed_iff_clusterPt'.2
    intro x hx
    have hx' : x ∉ interior E := by
      intro hi
      rcases mem_interior.1 hi with ⟨U, hU, hop, hm⟩
      rcases hx U (IsOpen.mem_nhds hop hm) hop with ⟨y, hy⟩
      exact absurd (hU (Set.mem_of_mem_inter_left hy))
              ((Set.mem_compl_iff _ _).1 <| Set.mem_of_mem_inter_right hy)
    have hintc := Set.compl_subset_compl_of_subset (subset_interior_iff_isOpen.2 hop)
    exact hintc hx'
  · intro hc
    apply subset_interior_iff_isOpen.1
    intro x hx
    have hx' : x ∉ Eᶜ := Set.not_mem_compl_iff.mpr hx
    have hnc : ¬ClusterPt' x Eᶜ := by
      intro h
      exact absurd (isClosed_iff_clusterPt'.1 hc _ h) hx'
    rcases not_clusterPt'_principal_iff.1 hnc with ⟨N, hN, hop, he⟩
    apply mem_interior.2
    use N, Set.diff_eq_empty.mp he, hop
    exact mem_of_mem_nhds hN
