import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WeekHeader from './WeekHeader';

describe('WeekHeader', () => {
  it('formats non-current week labels with the business W6xx style', () => {
    render(
      <WeekHeader
        columns={['2026-W01', '2026-W19', '2026-W20']}
        nowColumn="2026-W19"
      />,
    );

    expect(screen.getByText('W601')).toBeInTheDocument();
    expect(screen.getByText('W620')).toBeInTheDocument();
    expect(screen.queryByText('W01')).not.toBeInTheDocument();
    expect(screen.queryByText('W20')).not.toBeInTheDocument();
  });

  it('keeps the TODAY marker on the current week column', () => {
    render(
      <WeekHeader
        columns={['2026-W18', '2026-W19', '2026-W20']}
        nowColumn="2026-W19"
      />,
    );

    expect(screen.getByText('TODAY')).toBeInTheDocument();
  });
});
