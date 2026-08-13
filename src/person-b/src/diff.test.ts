import { describe, it, expect } from 'vitest';
import { computeVibeCheckDiff } from './diff.js';
import { VibeCheckData } from './checklist.js';

describe('VibeCheck Deterministic Diff Engine', () => {
  const mockExpected: VibeCheckData = {
    elements: [
      {
        id: 'submit_button',
        type: 'button',
        text: 'Submit Form',
        position: { x: 100, y: 200, width: 120, height: 40 },
        style: { color: '#FFFFFF', background_color: '#0055FF', font_size: 16 },
        required: true,
        visibility: 'visible'
      },
      {
        id: 'email_input',
        type: 'input',
        text: '',
        position: { x: 100, y: 150, width: 250, height: 40 },
        style: { color: '#000000', background_color: '#FFFFFF' },
        required: true,
        visibility: 'visible'
      }
    ]
  };

  it('computes 100% score for exact match', () => {
    const mockFound: VibeCheckData = JSON.parse(JSON.stringify(mockExpected));
    const report = computeVibeCheckDiff(mockExpected, mockFound);

    expect(report.score).toBe(100);
    expect(report.matchedCount).toBe(2);
    expect(report.missingCount).toBe(0);
    expect(report.mismatchCount).toBe(0);
    expect(report.unexpectedCount).toBe(0);
  });

  it('detects missing required elements', () => {
    const mockFound: VibeCheckData = {
      elements: [mockExpected.elements[0]] // email_input is missing
    };

    const report = computeVibeCheckDiff(mockExpected, mockFound);

    expect(report.missingCount).toBe(1);
    expect(report.details.find((d) => d.id === 'email_input')?.status).toBe('missing');
    expect(report.score).toBeLessThan(100);
  });

  it('detects text and visual property mismatches', () => {
    const mockFound: VibeCheckData = {
      elements: [
        {
          id: 'submit_button',
          type: 'button',
          text: 'Send Request', // Mismatched text
          position: { x: 100, y: 200, width: 120, height: 40 },
          style: { color: '#FFFFFF', background_color: '#FF0000', font_size: 16 }, // Mismatched background color
          required: true,
          visibility: 'visible'
        },
        mockExpected.elements[1]
      ]
    };

    const report = computeVibeCheckDiff(mockExpected, mockFound);

    expect(report.mismatchCount).toBe(1);
    const submitDiff = report.details.find((d) => d.id === 'submit_button');
    expect(submitDiff?.status).toBe('mismatched');
    expect(submitDiff?.mismatches.some((m) => m.property === 'text')).toBe(true);
    expect(submitDiff?.mismatches.some((m) => m.property === 'style.background_color')).toBe(true);
  });

  it('identifies unexpected extra elements', () => {
    const mockFound: VibeCheckData = {
      elements: [
        ...mockExpected.elements,
        {
          id: 'extra_banner',
          type: 'card',
          text: 'Ad Banner',
          position: { x: 0, y: 0, width: 100, height: 50 }
        }
      ]
    };

    const report = computeVibeCheckDiff(mockExpected, mockFound);

    expect(report.unexpectedCount).toBe(1);
    expect(report.details.find((d) => d.id === 'extra_banner')?.status).toBe('unexpected');
  });
});
