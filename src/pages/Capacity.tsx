import { useState, useEffect } from 'react';

const LS_KEY = 'mosite_capacity_v1';

interface CapacityRow {
  site: string;
  type: 'VM' | 'K8S';
  serverTotal: number;
  pod_vmAvailability: number;
  pod_vmProvisioned: number;
  utilizationPct: number;
  serverUtilPct: number;
  capacityPlanPct: number;
  serverRequire: number;
}

const SEED_DATA: CapacityRow[] = [
  { site: 'F12', type: 'VM',  serverTotal: 800,  pod_vmAvailability: 11200, pod_vmProvisioned: 6500,  utilizationPct: 58.04, serverUtilPct: 58.04, capacityPlanPct: 80, serverRequire: -219 },
  { site: 'F18', type: 'VM',  serverTotal: 1200, pod_vmAvailability: 16800, pod_vmProvisioned: 15500, utilizationPct: 92.26, serverUtilPct: 92.26, capacityPlanPct: 80, serverRequire: 184  },
  { site: 'F21', type: 'VM',  serverTotal: 500,  pod_vmAvailability: 7000,  pod_vmProvisioned: 1000,  utilizationPct: 14.28, serverUtilPct: 14.29, capacityPlanPct: 80, serverRequire: -410 },
  { site: 'F23', type: 'VM',  serverTotal: 500,  pod_vmAvailability: 7000,  pod_vmProvisioned: 5500,  utilizationPct: 78.57, serverUtilPct: 78.57, capacityPlanPct: 80, serverRequire: -8   },
  { site: 'F12', type: 'K8S', serverTotal: 800,  pod_vmAvailability: 11200, pod_vmProvisioned: 7000,  utilizationPct: 62.50, serverUtilPct: 62.50, capacityPlanPct: 80, serverRequire: -175 },
  { site: 'F18', type: 'K8S', serverTotal: 1200, pod_vmAvailability: 16800, pod_vmProvisioned: 15800, utilizationPct: 94.05, serverUtilPct: 94.05, capacityPlanPct: 80, serverRequire: 211  },
  { site: 'F21', type: 'K8S', serverTotal: 500,  pod_vmAvailability: 7000,  pod_vmProvisioned: 5000,  utilizationPct: 71.43, serverUtilPct: 71.43, capacityPlanPct: 80, serverRequire: -53  },
  { site: 'F23', type: 'K8S', serverTotal: 500,  pod_vmAvailability: 7000,  pod_vmProvisioned: 4000,  utilizationPct: 57.14, serverUtilPct: 57.14, capacityPlanPct: 80, serverRequire: -142 },
];

function loadData(): CapacityRow[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as CapacityRow[];
  } catch { /* fall through */ }
  return SEED_DATA;
}

export default function Capacity() {
  const [rows, setRows] = useState<CapacityRow[]>(loadData);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  }, [rows]);

  // setRows will be used in Task 3 — kept to avoid re-adding it later
  void setRows;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Capacity</h1>
      <p className="text-gray-500">Loaded {rows.length} rows.</p>
    </div>
  );
}
