import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Clusters from './Clusters';
import { resetDB } from '../mock/store';
import * as clustersApi from '../api/clusters';
import type { PhaseKey } from '../types';

const queryClients: QueryClient[] = [];

function renderClusters() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  queryClients.push(queryClient);

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

async function waitForEditFormToClose() {
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });
}

async function waitForQueryClientsToSettle() {
  await waitFor(() => {
    for (const queryClient of queryClients) {
      expect(queryClient.isMutating()).toBe(0);
      expect(queryClient.isFetching()).toBe(0);
    }
  });
}

async function clickAndWaitForQueryClientsToSettle(button: HTMLElement) {
  await userEvent.setup().click(button);
  await waitForQueryClientsToSettle();
}

function getUnexpectedConsoleErrors(consoleError: ReturnType<typeof vi.spyOn>) {
  return consoleError.mock.calls.filter(([message]: [unknown, ...unknown[]]) => {
    return (
      typeof message !== 'string' ||
      (!message.includes('not wrapped in act') &&
        !message.includes('The current testing environment is not configured to support act(...)'))
    );
  });
}

describe('Clusters milestone date editing', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDB();
  });

  afterEach(async () => {
    await waitForQueryClientsToSettle();
    for (const queryClient of queryClients) {
      queryClient.clear();
    }
    queryClients.length = 0;
    vi.restoreAllMocks();
  });

  it('creates a cluster from milestone dates instead of a manual status selection', async () => {
    renderClusters();

    await screen.findByText('F1-K8S-Prod');
    fireEvent.click(screen.getByRole('button', { name: 'Create Cluster' }));

    const form = getForm();
    expect(form.querySelector('select[name="status"]')).toBeNull();
    expect(form.querySelectorAll('input[type="date"]')).toHaveLength(6);

    fireEvent.change(getNamedElement<HTMLSelectElement>(form, 'select[name="factory_id"]'), {
      target: { value: 'f10' },
    });
    fireEvent.change(getNamedElement<HTMLInputElement>(form, 'input[name="name"]'), {
      target: { value: 'F10-K8S-New' },
    });
    fireEvent.change(getNamedElement<HTMLSelectElement>(form, 'select[name="type"]'), {
      target: { value: 'k8s' },
    });
    setPhaseDate(form, 'purchase', '2026-05-01');
    setPhaseDate(form, 'movein', '2026-05-05');
    setPhaseDate(form, 'infra', '2026-05-09');
    setPhaseDate(form, 'cluster', '2026-05-12');
    setPhaseDate(form, 'platform', '2026-05-16');
    setPhaseDate(form, 'release', '2026-05-20');

    fireEvent.click(within(form).getByRole('button', { name: 'Create' }));

    await screen.findByText('F10-K8S-New');
    await waitFor(async () => {
      const created = (await clustersApi.listClusters()).find((cluster) => cluster.name === 'F10-K8S-New');
      expect(created?.operations?.[0]?.phases?.map(({ phase, date }) => ({ phase, date }))).toEqual([
        { phase: 'purchase', date: '2026-05-01' },
        { phase: 'movein', date: '2026-05-05' },
        { phase: 'infra', date: '2026-05-09' },
        { phase: 'cluster', date: '2026-05-12' },
        { phase: 'platform', date: '2026-05-16' },
        { phase: 'release', date: '2026-05-20' },
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
    setPhaseDate(form, 'purchase', '2026-05-06');
    setPhaseDate(form, 'movein', '2026-05-05');
    setPhaseDate(form, 'infra', '2026-05-09');
    setPhaseDate(form, 'cluster', '2026-05-12');
    setPhaseDate(form, 'platform', '2026-05-16');
    setPhaseDate(form, 'release', '2026-05-20');

    fireEvent.click(within(form).getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Move-In date must be on or after Purchase date.')).toBeInTheDocument();
    expect((await clustersApi.listClusters()).some((cluster) => cluster.name === 'F10-K8S-OutOfOrder')).toBe(false);
  });

  it('edits an existing cluster using milestone date inputs', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderClusters();

    const clusterName = 'F1-K8S-Prod';
    const existing = (await clustersApi.listClusters()).find((cluster) => cluster.name === clusterName);
    expect(existing).toBeDefined();

    const row = (await screen.findByText(clusterName)).closest('tr') as HTMLTableRowElement;
    await clickAndWaitForQueryClientsToSettle(within(row).getByTitle('Edit'));

    const form = getForm();
    expect(getNamedElement<HTMLInputElement>(form, 'input[name="purchase"]').value).toBe(
      existing!.operations![0].phases.find((phase) => phase.phase === 'purchase')!.date,
    );
    expect(form.querySelector('select[name="status"]')).toBeNull();

    setPhaseDate(form, 'infra', '2026-03-15');
    await clickAndWaitForQueryClientsToSettle(within(form).getByRole('button', { name: 'Update' }));

    await waitFor(async () => {
      const updated = (await clustersApi.listClusters()).find((cluster) => cluster.name === clusterName);
      expect(updated?.operations?.[0]?.phases?.find((phase) => phase.phase === 'infra')?.date).toBe('2026-03-15');
    });
    await waitForEditFormToClose();

    await clickAndWaitForQueryClientsToSettle(
      within((await screen.findByText(clusterName)).closest('tr') as HTMLTableRowElement).getByTitle('Edit'),
    );
    await waitFor(() => {
      expect(getNamedElement<HTMLInputElement>(getForm(), 'input[name="infra"]').value).toBe('2026-03-15');
    });
    await waitForQueryClientsToSettle();

    expect(getUnexpectedConsoleErrors(consoleError)).toEqual([]);
  });

  it('preserves blocked milestone metadata when editing dates', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderClusters();

    const clusterName = 'F2-K8S-Prod';
    const existing = (await clustersApi.listClusters()).find((cluster) => cluster.name === clusterName);
    const blockedPhase = existing?.operations?.[0]?.phases?.find((phase) => phase.phase === 'infra');
    expect(blockedPhase).toMatchObject({
      date: '2026-06-04',
      status: 'blocked',
      note: '機器延遲到貨，預計 W23 恢復',
    });

    const row = (await screen.findByText(clusterName)).closest('tr') as HTMLTableRowElement;
    await clickAndWaitForQueryClientsToSettle(within(row).getByTitle('Edit'));

    const form = getForm();
    setPhaseDate(form, 'cluster', '2026-06-25');
    await clickAndWaitForQueryClientsToSettle(within(form).getByRole('button', { name: 'Update' }));

    await waitFor(async () => {
      const updated = (await clustersApi.listClusters()).find((cluster) => cluster.name === clusterName);
      expect(updated?.operations?.[0]?.phases?.find((phase) => phase.phase === 'cluster')?.date).toBe('2026-06-25');
      expect(updated?.operations?.[0]?.phases?.find((phase) => phase.phase === 'infra')).toMatchObject({
        date: '2026-06-04',
        status: 'blocked',
        note: '機器延遲到貨，預計 W23 恢復',
      });
    });
    await waitForEditFormToClose();

    await clickAndWaitForQueryClientsToSettle(
      within((await screen.findByText(clusterName)).closest('tr') as HTMLTableRowElement).getByTitle('Edit'),
    );
    await waitFor(() => {
      expect(getNamedElement<HTMLInputElement>(getForm(), 'input[name="cluster"]').value).toBe('2026-06-25');
    });
    await waitForQueryClientsToSettle();

    expect(getUnexpectedConsoleErrors(consoleError)).toEqual([]);
  });

  it('switches from editing to a blank create form when Create Cluster is clicked', async () => {
    renderClusters();

    const clusterName = 'F1-K8S-Prod';
    const row = (await screen.findByText(clusterName)).closest('tr') as HTMLTableRowElement;
    fireEvent.click(within(row).getByTitle('Edit'));

    const editForm = getForm();
    expect(getNamedElement<HTMLInputElement>(editForm, 'input[name="name"]').value).toBe(clusterName);
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create Cluster' }));

    const createForm = getForm();
    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(getNamedElement<HTMLInputElement>(createForm, 'input[name="name"]').value).toBe('');
    expect(getNamedElement<HTMLSelectElement>(createForm, 'select[name="factory_id"]').value).toBe('');
    expect(getNamedElement<HTMLInputElement>(createForm, 'input[name="purchase"]').value).toBe('');
  });

  it('shows the create mutation error without leaking an unhandled rejection', async () => {
    vi.spyOn(clustersApi, 'createCluster').mockRejectedValueOnce(new Error('Create failed'));
    renderClusters();

    await screen.findByText('F1-K8S-Prod');
    fireEvent.click(screen.getByRole('button', { name: 'Create Cluster' }));

    const form = getForm();
    fireEvent.change(getNamedElement<HTMLSelectElement>(form, 'select[name="factory_id"]'), {
      target: { value: 'f10' },
    });
    fireEvent.change(getNamedElement<HTMLInputElement>(form, 'input[name="name"]'), {
      target: { value: 'F10-K8S-New' },
    });
    fireEvent.change(getNamedElement<HTMLSelectElement>(form, 'select[name="type"]'), {
      target: { value: 'k8s' },
    });
    setPhaseDate(form, 'purchase', '2026-05-01');
    setPhaseDate(form, 'movein', '2026-05-05');
    setPhaseDate(form, 'infra', '2026-05-09');
    setPhaseDate(form, 'cluster', '2026-05-12');
    setPhaseDate(form, 'platform', '2026-05-16');
    setPhaseDate(form, 'release', '2026-05-20');

    fireEvent.click(within(form).getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Create failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('shows the update mutation error without leaking an unhandled rejection', async () => {
    vi.spyOn(clustersApi, 'updateCluster').mockRejectedValueOnce(new Error('Update failed'));
    renderClusters();

    const row = (await screen.findByText('F1-K8S-Prod')).closest('tr') as HTMLTableRowElement;
    fireEvent.click(within(row).getByTitle('Edit'));

    const form = getForm();
    setPhaseDate(form, 'infra', '2026-03-15');
    fireEvent.click(within(form).getByRole('button', { name: 'Update' }));

    expect(await screen.findByText('Update failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });
});
