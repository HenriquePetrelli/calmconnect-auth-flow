import { describe, expect, it } from 'vitest';
import {
  COMPLAINT_OPTIONS,
  hasConductComplaint,
  legacyProblemResolved,
} from '@/components/sos/patientFeedbackOptions';

/**
 * Business rules of the structured patient SOS feedback.
 * Clinical outcome must never be conflated with a complaint about conduct.
 */
const buildRow = (input: {
  resolution: 'resolved' | 'partially_resolved' | 'not_resolved';
  rating: number;
  complaints?: string[];
  description?: string;
}) => {
  const complaints = input.complaints ?? [];
  return {
    rating: input.rating,
    resolution_status: input.resolution,
    problem_resolved: legacyProblemResolved(input.resolution),
    has_complaint: complaints.length > 0,
    complaint_categories: complaints,
    complaint_description: input.description?.trim() || null,
    requires_admin_review: hasConductComplaint(complaints),
  };
};

describe('patient SOS feedback', () => {
  it('positive flow keeps the record clean', () => {
    const row = buildRow({ resolution: 'resolved', rating: 5 });
    expect(row).toMatchObject({
      problem_resolved: 'yes',
      has_complaint: false,
      requires_admin_review: false,
      complaint_categories: [],
    });
  });

  it('partial flow stores the selected reason without admin review', () => {
    const row = buildRow({ resolution: 'partially_resolved', rating: 3, complaints: ['connection'] });
    expect(row.problem_resolved).toBe('partially');
    expect(row.has_complaint).toBe(true);
    expect(row.requires_admin_review).toBe(false);
  });

  it('conduct complaint flags administrative review', () => {
    const row = buildRow({
      resolution: 'not_resolved',
      rating: 1,
      complaints: ['disrespectful'],
      description: '  relato  ',
    });
    expect(row.requires_admin_review).toBe(true);
    expect(row.complaint_description).toBe('relato');
  });

  it('early termination is also reviewable', () => {
    expect(hasConductComplaint(['ended_too_early'])).toBe(true);
    expect(hasConductComplaint(['not_welcoming'])).toBe(true);
    expect(hasConductComplaint(['rude'])).toBe(true);
  });

  it('unresolved crisis without conduct complaint is not a review case', () => {
    const row = buildRow({ resolution: 'not_resolved', rating: 2, complaints: ['not_helpful', 'could_not_explain'] });
    expect(row.has_complaint).toBe(true);
    expect(row.requires_admin_review).toBe(false);
  });

  it('exposes stable category values for future admin metrics', () => {
    expect(COMPLAINT_OPTIONS.map((o) => o.value)).toEqual([
      'ended_too_early',
      'not_helpful',
      'not_listened',
      'not_welcoming',
      'rude',
      'disrespectful',
      'connection',
      'audio_video',
      'could_not_explain',
      'other',
    ]);
  });
});
