/**
 * Grading Utilities
 * Helper functions for grade calculation and display
 */

import { getGrade, getGradeDescription } from './weights.js';

/**
 * Get color for grade
 * @param {string} grade - Letter grade
 * @returns {string} CSS color
 */
export function getGradeColor(grade) {
  const colors = {
    A: '#22c55e',  // Green
    B: '#84cc16',  // Lime
    C: '#eab308',  // Yellow
    D: '#f97316',  // Orange
    F: '#ef4444'   // Red
  };
  return colors[grade] || colors.F;
}

/**
 * Get background color for grade
 * @param {string} grade - Letter grade
 * @returns {string} CSS background color
 */
export function getGradeBackgroundColor(grade) {
  const colors = {
    A: '#dcfce7',  // Light green
    B: '#ecfccb',  // Light lime
    C: '#fef9c3',  // Light yellow
    D: '#ffedd5',  // Light orange
    F: '#fee2e2'   // Light red
  };
  return colors[grade] || colors.F;
}

// Re-export for convenience
export { getGrade, getGradeDescription };
