# naive_rref.py
# (c)2016 Kyle Miller
#
# This is a naive implementation of algorithms to compute row-echelon
# and reduced row-echelon forms of a matrix.  I am just taking the
# criteria as listed in the textbook, and using various elementary row
# operations to correct any failures to meet the criteria.
# Interestingly, this is enough to make an algorithm.
#
# However, the resulting algorithms are very inefficient.  Almost no
# attempts were made to improve efficiency; making an efficient
# implementation of rref is left as an exercise.  The book suggests an
# implementation starting on page 17.
#
# Warning: A difference between this and the textbook is that, in
# Python, lists are 0-indexed rather than 1-indexed, which means an
# m x n matrix has rows labeled 0 through m-1 rather than 1 through m.

from __future__ import division
from fractions import Fraction as F

# Some example matrices to try:
test_A = [[1,2,3],
          [4,5,6]]
# fractions give exact calculations:
test_A2 = [[F(1),F(2),F(3)],
           [F(4),F(5),F(6)]]
test_A3 = [[F(3),F(1),F(5)],
           [F(1),F(2),F(6)]]
test_A4 = [[F(1),F(3),F(0),F(3)],
           [F(-1),F(-1),F(-1),F(1)],
           [F(0),F(-4),F(2),F(-8)],
           [F(2),F(0),F(3),F(-1)]]

# examples:
# print_matrix(rref(test_A))
# print_matrix(ref(test_A2))
# print_matrix(rref(test_A2))

epsilon = 1e-10
def is_zero(x) :
    """Floating-point numbers can be treacherous.  If the number is a
    float, we see if it is within `epsilon` of zero."""
    if isinstance(x, F) :
        return x == 0
    else :
        return abs(x) < epsilon

def is_matrix(A) :
    """Checks whether A is a list of lists of the same length."""
    if not list(A) :
        return False
    if not all(list(row) for row in A) :
        return False
    if 1 != len(set([len(row) for row in A])) :
        return False
    return True

def print_matrix(A) :
    """Prints a matrix nicely"""
    sA = [[str(e) for e in row] for row in A]
    lens = [max(len(s) for s in col) for col in zip(*sA)]
    for row in sA :
        print "[",
        for l,e in zip(lens,row) :
            print ("{0:>{1}}").format(e,l),
        print "]"

def nrows(A) :
    return len(A)
def ncols(A) :
    return A[0]

report_operations = True

def swap(A, i, j) :
    """Swaps rows i and j"""
    assert is_matrix(A)
    if report_operations :
        print "r{0} <-> r{1}".format(i, j)
    return [A[j if k == i else i if k == j else k]
            for k in range(nrows(A))]
def scale(A, i, c) :
    """Scales row i by a factor of c"""
    assert is_matrix(A)
    assert c != 0
    if report_operations :
        print "{0} * r{1} -> r{1}".format(c, i)
    return [[c * e for e in A[i]] if k == i else A[k]
            for k in range(nrows(A))]
def replace(A, i, c, j) :
    """Adds row j scaled by a factor of c to row i"""
    assert is_matrix(A)
    assert i != j
    if report_operations :
        print "r{0} + {1} * r{2} -> r{0}".format(i, c, j)
    return [[ei + c * ej for ei, ej in zip(A[i], A[j])] if k == i else A[k]
            for k in range(nrows(A))]

def ref(A) :
    """Puts a matrix into row-echelon form."""
    assert is_matrix(A)

    if report_operations :
        print_matrix(A)
        print

    # Check condition I, that all-zero rows are last
    for i in range(nrows(A) - 1) :
        if all(is_zero(e) for e in A[i]) :
            # This is an all-zero row, so see if the next row is all-zero, too
            if not all(is_zero(e) for e in A[i+1]) :
                # Not in ref form! Swap this row with the next
                return ref(swap(A, i, i+1))
    # Check condition II, that leading entries are to right of the
    # leading entry of the previous row
    last_leading_col = -1 # stores the column number of the previous row's leading entry
    for i in range(nrows(A)) :
        if all(is_zero(e) for e in A[i]) :
            # This is an all-zero row, so no leading entry (and rest
            # of rows are zero, too, since condition I is satisfied)
            break
        leading_col = min(j for j, e in enumerate(A[i]) if not is_zero(e))
        if last_leading_col == leading_col :
            # Need to eliminate this leading entry using the previous row
            factor = -A[i][leading_col] / A[i-1][last_leading_col]
            return ref(replace(A, i, factor, i-1))
        if last_leading_col > leading_col :
            # Rows in wrong order: just swap
            return ref(swap(A, i, i-1))
        last_leading_col = leading_col
    # Check condition III, that entries in col below leading entry are zeros
    # (There is no need to check III; after I and II are satisfied, how could III not be?)
    return A

def rref(A) :
    # First make sure A is in row echelon form:
    A = ref(A)
    
    # Check condition IV, that leading entries are 1's
    for i in range(nrows(A)) :
        if all(is_zero(e) for e in A[i]) :
            # This (and the rest) are zero rows
            break
        leading_col = min(j for j, e in enumerate(A[i]) if not is_zero(e))
        if A[i][leading_col] != 1 :
            return rref(scale(A, i, 1 / A[i][leading_col]))
    # Check condition V, that each leading 1 is only entry in column
    # (only need to check entries above leading entry)
    for i in range(nrows(A)) :
        if all(is_zero(e) for e in A[i]) :
            # This (and the rest) are zero rows
            break
        leading_col = min(j for j, e in enumerate(A[i]) if not is_zero(e))
        for j in range(i) :
            if not is_zero(A[j][leading_col]) :
                return rref(replace(A, j, -A[j][leading_col], i))
    # All conditions are satisfied
    return A
