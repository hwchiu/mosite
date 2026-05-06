import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PhaseCell from './PhaseCell';

describe('PhaseCell solid rendering', () => {
  it('renders estimated phases as solid fills instead of dashed borders', () => {
    const { container } = render(
      <PhaseCell
        cell={{ phases: ['infra'], status: 'estimated', isCurrentPhase: false }}
      />,
    );

    const cell = container.firstChild as HTMLDivElement;
    expect(cell.style.background).toBe('rgb(99, 102, 241)');
    expect(cell.style.border).toBe('');
  });

  it('renders blocked phases as solid fills without dashed borders', () => {
    const { container } = render(
      <PhaseCell
        cell={{ phases: ['movein'], status: 'blocked', isCurrentPhase: true }}
      />,
    );

    const cell = container.firstChild as HTMLDivElement;
    expect(cell.style.background).toBe('rgb(245, 158, 11)');
    expect(cell.style.border).toBe('');
    expect(cell.style.outline).toBe('2px solid #6366f1');
    expect(cell.title).toBe('BLOCKED');
  });

  it('renders blocked non-current phases with a blocked title and no outline', () => {
    const { container } = render(
      <PhaseCell
        cell={{ phases: ['movein'], status: 'blocked', isCurrentPhase: false }}
      />,
    );

    const cell = container.firstChild as HTMLDivElement;
    expect(cell.style.background).toBe('rgb(245, 158, 11)');
    expect(cell.style.outline).toBe('');
    expect(cell.title).toBe('BLOCKED');
  });
});
