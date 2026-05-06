import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Clusters from './Clusters';
import { resetDB } from '../mock/store';
import { listClusters } from '../api/clusters';
import type { PhaseKey } from '../types';

function renderClusters() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Clusters />
    </QueryClientProvider>,
  );
}

function getForm(): HTMLFormElement {
  return (
    screen.queryByRole('button', { name: 'Update' }) ??
    screen.getByRole('button', { name: 'Create' })
  ).closest('form') as HTMLFormElement;
}

function getNamedElement<T extends Element>(form: HTMLFormElement, selector: string): T {
  const element = form.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element for selector: ${selector}`);
  }
  return element;
}

function setPhaseDate(form: HTMLFormElement, phase: PhaseKey, value: string) {
  fireEvent.change(getNamedElement<HTMLInputElement>(form, `input[name="${phase}"]`), {
    target: { value },
  });
}

describe('Clusters milestone date editing', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDB();
  });

  it('creates a cluster from milestone dates instead of a manual status selection', async () => {
    renderClusters();

    await screen.findByText('F1-K8S-Prod');
    fireEvent.click(screen.getByRole('button', { name: 'Create Cluster' }));

    const form = getForm();
    expect(form.querySelector('select[name="status"]')).toBeNull();
    expect(form.querySelectorAll('input[type="date"]')).toHaveLength(5);

    fireEvent.change(getNamedElement<HTMLSelectElement>(form, 'select[name="factory_id"]'), {
      target: { value: 'f10' },
    });
    fireEvent.change(getNamedElement<HTMLInputElement>(form, 'input[name="name"]'), {
      target: { value: 'F10-K8S-New' },
    });
    fireEvent.change(getNamedElement<HTMLSelectElement>(form, 'select[name="type"]'), {
      target: { value: 'k8s' },
    });
    setPhaseDate(form, 'PO', '2026-05-01');
    setPhaseDate(form, 'server_movein', '2026-05-05');
    setPhaseDate(form, 'infra', '2026-05-09');
    setPhaseDate(form, 'cpld', '2026-05-12');
    setPhaseDate(form, 'sipd', '2026-05-16');

    fireEvent.click(within(form).getByRole('button', { name: 'Create' }));

    await screen.findByText('F10-K8S-New');
    await waitFor(async () => {
      const created = (await listClusters()).find((cluster) => cluster.name === 'F10-K8S-New');
      expect(created?.phases?.map(({ phase, date }) => ({ phase, date }))).toEqual([
        { phase: 'PO', date: '2026-05-01' },
        { phase: 'server_movein', date: '2026-05-05' },
        { phase: 'infra', date: '2026-05-09' },
        { phase: 'cpld', date: '2026-05-12' },
        { phase: 'sipd', date: '2026-05-16' },
      ]);
    });
  });

  it('shows the shared milestone validation error when dates move backward', async () => {
    renderClusters();

    await screen.findByText('F1-K8S-Prod');
    fireEvent.click(screen.getByRole('button', { name: 'Create Cluster' }));

    const form = getForm();
    fireEvent.change(getNamedElement<HTMLSelectElement>(form, 'select[name="factory_id"]'), {
      target: { value: 'f10' },
    });
    fireEvent.change(getNamedElement<HTMLInputElement>(form, 'input[name="name"]'), {
      target: { value: 'F10-K8S-OutOfOrder' },
    });
    fireEvent.change(getNamedElement<HTMLSelectElement>(form, 'select[name="type"]'), {
      target: { value: 'k8s' },
    });
    setPhaseDate(form, 'PO', '2026-05-06');
    setPhaseDate(form, 'server_movein', '2026-05-05');
    setPhaseDate(form, 'infra', '2026-05-09');
    setPhaseDate(form, 'cpld', '2026-05-12');
    setPhaseDate(form, 'sipd', '2026-05-16');

    fireEvent.click(within(form).getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Move-In date must be on or after PO date.')).toBeInTheDocument();
    expect((await listClusters()).some((cluster) => cluster.name === 'F10-K8S-OutOfOrder')).toBe(false);
  });

  it('edits an existing cluster using milestone date inputs', async () => {
    renderClusters();

    const clusterName = 'F1-K8S-Prod';
    const existing = (await listClusters()).find((cluster) => cluster.name === clusterName);
    expect(existing).toBeDefined();

    const row = (await screen.findByText(clusterName)).closest('tr') as HTMLTableRowElement;
    fireEvent.click(within(row).getByTitle('Edit'));

    const form = getForm();
    expect(getNamedElement<HTMLInputElement>(form, 'input[name="PO"]').value).toBe(
      existing!.phases!.find((phase) => phase.phase === 'PO')!.date,
    );
    expect(form.querySelector('select[name="status"]')).toBeNull();

    setPhaseDate(form, 'infra', '2026-03-15');
    fireEvent.click(within(form).getByRole('button', { name: 'Update' }));

    await waitFor(async () => {
      const updated = (await listClusters()).find((cluster) => cluster.name === clusterName);
      expect(updated?.phases?.find((phase) => phase.phase === 'infra')?.date).toBe('2026-03-15');
    });
  });
});
