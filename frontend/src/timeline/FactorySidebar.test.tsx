import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FactorySidebar from './FactorySidebar';
import type { Factory } from '../types';

const factories: Factory[] = [
  { id: 'f1', name: 'F1', created_at: '' },
  { id: 'f2', name: 'F2', created_at: '' },
  { id: 'f3', name: 'F3', created_at: '' },
];

function renderSidebar() {
  const onToggle = vi.fn();
  const onShowAll = vi.fn();
  const props: any = {
    factories,
    visibleIds: new Set(factories.map((factory) => factory.id)),
    onToggle,
    onShowAll,
    onShowProblems: vi.fn(),
  };

  render(<FactorySidebar {...props} />);

  return { onShowAll, onToggle };
}

describe('FactorySidebar', () => {
  it('keeps only the show-all action in the sidebar controls', () => {
    const { onShowAll } = renderSidebar();

    expect(screen.getByRole('button', { name: '全部廠區' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /只看異常/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '全部廠區' }));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it('uses one shared dot color for every factory item', () => {
    renderSidebar();

    const dots = factories.map((factory) => screen.getByText(factory.name).previousElementSibling as HTMLElement);

    expect(dots[0].style.background).not.toBe('');
    expect(dots.every((dot) => dot.style.background === dots[0].style.background)).toBe(true);
  });
});
