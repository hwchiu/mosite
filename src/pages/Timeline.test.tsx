import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Timeline from './Timeline';
import { resetDB } from '../mock/store';

function renderTimeline() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Timeline />
    </QueryClientProvider>,
  );
}

describe('Timeline month view timezone alignment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('TZ', 'America/Los_Angeles');
    vi.setSystemTime(new Date('2026-01-01T00:30:00Z'));
    localStorage.clear();
    resetDB();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    localStorage.clear();
    resetDB();
  });

  it('uses the UTC year when entering and resetting month view around a UTC year boundary', async () => {
    renderTimeline();

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '月' }));
    expect(screen.getByText('TODAY').closest('div')).toHaveClass('bg-indigo-50');

    fireEvent.click(screen.getByRole('button', { name: '◀' }));
    expect(screen.getByText('Jan')).not.toHaveClass('bg-indigo-50');

    fireEvent.click(screen.getByRole('button', { name: '今年' }));
    expect(screen.getByText('TODAY').closest('div')).toHaveClass('bg-indigo-50');
  });

  it('does not show estimated or blocked legend entries', async () => {
    renderTimeline();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const legend = screen.getByText('藍色外框 = 當前 Phase').closest('div');

    expect(legend).not.toBeNull();
    expect(within(legend!).queryByText('預估')).not.toBeInTheDocument();
    expect(within(legend!).queryByText(/BLOCKED/)).not.toBeInTheDocument();
  });
});
