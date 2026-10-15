import { StructuredReason } from './calculator';
import { RecommendationItem } from '../../../shared/services/riskService';

/**
 * Pure function: Generates actionable, deterministic recommendations from structured risk reasons.
 * Each recommendation explicitly links to the underlying reason that triggered it.
 */
export function generateRecommendations(reasons: StructuredReason[]): RecommendationItem[] {
  if (!reasons || reasons.length === 0) {
    return [
      {
        id: 'rec_nominal',
        category: 'advising',
        title: 'Maintain Current Academic Trajectory',
        description: 'Attendance and continuous evaluation records are within nominal institutional guidelines. Continue regular course participation.',
        priority: 'low',
      },
    ];
  }

  const recs: RecommendationItem[] = [];

  reasons.forEach((r, idx) => {
    if (r.component === 'attendance') {
      if (r.severity === 'high') {
        recs.push({
          id: `rec_att_high_${idx}`,
          category: 'attendance',
          title: 'Establish Immediate Attendance Recovery Agreement',
          description: `Attendance is critically low (${r.observed}%). Schedule an advising conference with your faculty advisor to avoid examination disbarment.`,
          priority: 'high',
        });
      } else {
        recs.push({
          id: `rec_att_med_${idx}`,
          category: 'attendance',
          title: 'Attend Remedial and Tutorial Sessions',
          description: `Current attendance (${r.observed}%) is below the ${r.threshold}% minimum. Attend all remaining scheduled class sessions to restore attendance margin.`,
          priority: 'medium',
        });
      }
    } else if (r.component === 'marks') {
      if (r.severity === 'high') {
        recs.push({
          id: `rec_marks_high_${idx}`,
          category: 'marks',
          title: 'Request Course Tutoring & Academic Remediation',
          description: `Continuous assessment average is critically low (${r.observed}%). Seek one-on-one assistance from department teaching assistants before midterms.`,
          priority: 'high',
        });
      } else {
        recs.push({
          id: `rec_marks_med_${idx}`,
          category: 'marks',
          title: 'Consult Instructor on Assessment Deficits',
          description: `Continuous marks average is ${r.observed}%. Review previous quizzes with your instructor during faculty office hours.`,
          priority: 'medium',
        });
      }
    } else if (r.component === 'completion') {
      recs.push({
        id: `rec_comp_${idx}`,
        category: 'advising',
        title: 'Submit Outstanding Assessment Deliverables',
        description: `${r.observed} assignment(s) are unrecorded or unsubmitted. Contact your course instructor to verify late submission eligibility.`,
        priority: r.severity === 'high' ? 'high' : 'medium',
      });
    } else if (r.component === 'trend') {
      recs.push({
        id: `rec_trend_${idx}`,
        category: 'advising',
        title: 'Stabilize Recent Grade Trajectory',
        description: `Recent assessment scores have dropped by ${r.observed}%. Join peer study circles and review prerequisite concepts to reverse downward trend.`,
        priority: r.severity === 'high' ? 'high' : 'medium',
      });
    }
  });

  return recs;
}
