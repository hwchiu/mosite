import type { ServerStatus } from '../types';

const statusConfig: Record<ServerStatus, { label: string; classes: string }> = {
  purchased: {
    label: 'Purchased',
    classes: 'bg-gray-100 text-gray-700 ring-gray-300',
  },
  waiting_infra: {
    label: 'Waiting Infra',
    classes: 'bg-yellow-100 text-yellow-800 ring-yellow-300',
  },
  waiting_cluster_setup: {
    label: 'Waiting Cluster',
    classes: 'bg-orange-100 text-orange-800 ring-orange-300',
  },
  waiting_platform: {
    label: 'Waiting Platform',
    classes: 'bg-blue-100 text-blue-800 ring-blue-300',
  },
  active: {
    label: 'Active',
    classes: 'bg-green-100 text-green-800 ring-green-300',
  },
  retired: {
    label: 'Retired',
    classes: 'bg-red-100 text-red-700 ring-red-300',
  },
};

interface StatusBadgeProps {
  status: ServerStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    classes: 'bg-gray-100 text-gray-700 ring-gray-300',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
