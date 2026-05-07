'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 3001;

// ── Persistence ───────────────────────────────────────────────────────────────

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { factories: [], clusters: [] };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ── Phase / cluster helpers ───────────────────────────────────────────────────

const PHASE_ORDER = ['purchase', 'movein', 'infra', 'cluster', 'platform', 'release'];

function deriveClusterStatus(phases) {
  if (!phases || phases.length === 0) return 'purchase';
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...phases].sort((a, b) => a.date.localeCompare(b.date));
  for (const phase of sorted) {
    if (phase.status === 'blocked') return phase.phase;
    if (phase.date >= today) return phase.phase;
  }
  return sorted[sorted.length - 1].phase;
}

function hydratePhaseStatuses(phases) {
  if (!phases || phases.length === 0) return [];
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...phases].sort((a, b) => {
    const dc = a.date.localeCompare(b.date);
    return dc !== 0 ? dc : PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
  });
  const current = deriveClusterStatus(sorted);
  const finalPhase = sorted[sorted.length - 1];
  const activePhase = (finalPhase && today > finalPhase.date && finalPhase.status !== 'blocked')
    ? null : current;

  return sorted.map(phase => {
    let status;
    if (phase.status === 'blocked') {
      status = 'blocked';
    } else if (phase.date > today) {
      status = 'estimated';
    } else if (phase.phase === activePhase) {
      status = 'in_progress';
    } else {
      status = 'completed';
    }
    return { ...phase, status };
  });
}

function hydrateCluster(cluster, factories) {
  const factory = factories.find(f => f.id === cluster.factory_id);
  const factory_name = factory?.name ?? cluster.factory_name ?? '';

  if (cluster.operations?.length) {
    const hydratedOps = cluster.operations.map(op => ({
      ...op,
      phases: hydratePhaseStatuses(op.phases),
    }));
    const latestOp = hydratedOps[hydratedOps.length - 1];
    const status = deriveClusterStatus(latestOp.phases);
    const { phases: _phases, ...rest } = cluster;
    void _phases;
    return { ...rest, factory_name, operations: hydratedOps, status };
  }

  const phases = hydratePhaseStatuses(cluster.phases ?? []);
  return {
    ...cluster,
    factory_name,
    phases,
    status: phases.length ? deriveClusterStatus(phases) : cluster.status ?? 'purchase',
  };
}

function validatePhaseDates(phases) {
  for (let i = 1; i < phases.length; i++) {
    if (phases[i].date < phases[i - 1].date) {
      return `${phases[i].phase} date must not be before ${phases[i - 1].phase} date`;
    }
  }
  return null;
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors({
  origin: [
    'http://momo.hwchiu.com',
    'https://momo.hwchiu.com',
    /^http:\/\/localhost(:\d+)?$/,
  ],
}));
app.use(express.json());

// ── Factories ─────────────────────────────────────────────────────────────────

app.get('/api/factories', (req, res) => {
  const db = loadDB();
  res.json(db.factories);
});

app.post('/api/factories', (req, res) => {
  const db = loadDB();
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  if (db.factories.find(f => f.name === name)) {
    return res.status(400).json({ message: `Factory "${name}" already exists` });
  }
  const factory = { id: uuidv4(), name, created_at: new Date().toISOString() };
  db.factories.push(factory);
  saveDB(db);
  res.status(201).json(factory);
});

app.delete('/api/factories/:id', (req, res) => {
  const db = loadDB();
  if (db.clusters.find(c => c.factory_id === req.params.id)) {
    return res.status(400).json({ message: 'Cannot delete factory: clusters are referencing it' });
  }
  db.factories = db.factories.filter(f => f.id !== req.params.id);
  saveDB(db);
  res.status(204).send();
});

// ── Clusters ──────────────────────────────────────────────────────────────────

app.get('/api/clusters', (req, res) => {
  const db = loadDB();
  let list = db.clusters.map(c => hydrateCluster(c, db.factories));
  if (req.query.factory_id) list = list.filter(c => c.factory_id === req.query.factory_id);
  if (req.query.type) list = list.filter(c => c.type === req.query.type);
  res.json(list);
});

app.get('/api/clusters/:id', (req, res) => {
  const db = loadDB();
  const cluster = db.clusters.find(c => c.id === req.params.id);
  if (!cluster) return res.status(404).json({ message: 'Cluster not found' });
  res.json(hydrateCluster(cluster, db.factories));
});

app.post('/api/clusters', (req, res) => {
  const db = loadDB();
  const { name, type, factory_id, phases, description } = req.body;
  const factory = db.factories.find(f => f.id === factory_id);
  if (!factory) return res.status(400).json({ message: 'Factory not found' });

  const phaseList = phases ?? [];
  const err = validatePhaseDates(phaseList);
  if (err) return res.status(400).json({ message: err });

  const created_at = new Date().toISOString();
  const cluster = {
    id: uuidv4(),
    name,
    type,
    factory_id,
    factory_name: factory.name,
    description,
    created_at,
    operations: [{ id: uuidv4(), type: 'init', phases: phaseList, created_at }],
  };
  db.clusters.push(cluster);
  saveDB(db);
  res.status(201).json(hydrateCluster(cluster, db.factories));
});

app.put('/api/clusters/:id', (req, res) => {
  const db = loadDB();
  const idx = db.clusters.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'Cluster not found' });

  const cluster = { ...db.clusters[idx] };
  const { name, type, factory_id, description } = req.body;

  if (name !== undefined) cluster.name = name;
  if (type !== undefined) cluster.type = type;
  if (description !== undefined) cluster.description = description;
  if (factory_id !== undefined) {
    const factory = db.factories.find(f => f.id === factory_id);
    if (!factory) return res.status(400).json({ message: 'Factory not found' });
    cluster.factory_id = factory_id;
    cluster.factory_name = factory.name;
  }

  db.clusters[idx] = cluster;
  saveDB(db);
  res.json(hydrateCluster(cluster, db.factories));
});

app.delete('/api/clusters/:id', (req, res) => {
  const db = loadDB();
  db.clusters = db.clusters.filter(c => c.id !== req.params.id);
  saveDB(db);
  res.status(204).send();
});

// ── Operations ────────────────────────────────────────────────────────────────

app.post('/api/clusters/:id/operations', (req, res) => {
  const db = loadDB();
  const idx = db.clusters.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'Cluster not found' });

  const cluster = db.clusters[idx];
  const { type, label, phases } = req.body;

  if (type === 'init' && cluster.operations?.some(o => o.type === 'init')) {
    return res.status(400).json({ message: 'Cluster already has an init operation' });
  }
  const err = validatePhaseDates(phases ?? []);
  if (err) return res.status(400).json({ message: err });

  const op = { id: uuidv4(), type, label, phases: phases ?? [], created_at: new Date().toISOString() };
  cluster.operations = [...(cluster.operations ?? []), op];
  db.clusters[idx] = cluster;
  saveDB(db);
  res.status(201).json(hydrateCluster(cluster, db.factories));
});

app.put('/api/clusters/:id/operations/:opId', (req, res) => {
  const db = loadDB();
  const idx = db.clusters.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'Cluster not found' });

  const cluster = { ...db.clusters[idx] };
  const opIdx = (cluster.operations ?? []).findIndex(o => o.id === req.params.opId);
  if (opIdx < 0) return res.status(404).json({ message: 'Operation not found' });

  const { phases } = req.body;
  const err = validatePhaseDates(phases ?? []);
  if (err) return res.status(400).json({ message: err });

  cluster.operations = cluster.operations.map((op, i) => i === opIdx ? { ...op, phases } : op);
  db.clusters[idx] = cluster;
  saveDB(db);
  res.json(hydrateCluster(cluster, db.factories));
});

app.delete('/api/clusters/:id/operations/:opId', (req, res) => {
  const db = loadDB();
  const idx = db.clusters.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'Cluster not found' });

  const cluster = db.clusters[idx];
  const op = (cluster.operations ?? []).find(o => o.id === req.params.opId);
  if (!op) return res.status(404).json({ message: 'Operation not found' });
  if (op.type === 'init') return res.status(400).json({ message: 'Cannot delete the init operation' });

  cluster.operations = cluster.operations.filter(o => o.id !== req.params.opId);
  db.clusters[idx] = cluster;
  saveDB(db);
  res.status(204).send();
});

// ── Reschedule Notes ──────────────────────────────────────────────────────────────

app.post('/api/clusters/:id/operations/:opId/notes', (req, res) => {
  const db = loadDB();
  const cluster = db.clusters.find(c => c.id === req.params.id);
  if (!cluster) return res.status(404).json({ message: 'Cluster not found' });
  const op = (cluster.operations ?? []).find(o => o.id === req.params.opId);
  if (!op) return res.status(404).json({ message: 'Operation not found' });
  const { note } = req.body;
  if (!note || typeof note !== 'string' || !note.trim()) {
    return res.status(400).json({ message: 'note is required' });
  }
  const entry = {
    id: uuidv4(),
    date: new Date().toISOString().slice(0, 10),
    note: note.trim(),
  };
  op.reschedule_notes = [...(op.reschedule_notes ?? []), entry];
  saveDB(db);
  res.status(201).json(entry);
});

app.put('/api/clusters/:id/operations/:opId/notes/:noteId', (req, res) => {
  const db = loadDB();
  const cluster = db.clusters.find(c => c.id === req.params.id);
  if (!cluster) return res.status(404).json({ message: 'Cluster not found' });
  const op = (cluster.operations ?? []).find(o => o.id === req.params.opId);
  if (!op) return res.status(404).json({ message: 'Operation not found' });
  const noteIdx = (op.reschedule_notes ?? []).findIndex(n => n.id === req.params.noteId);
  if (noteIdx < 0) return res.status(404).json({ message: 'Note not found' });
  const { note, date } = req.body;
  if (!note || typeof note !== 'string' || !note.trim()) {
    return res.status(400).json({ message: 'note is required' });
  }
  const updated = {
    ...op.reschedule_notes[noteIdx],
    note: note.trim(),
    ...(date ? { date } : {}),
  };
  op.reschedule_notes = op.reschedule_notes.map((n, i) => i === noteIdx ? updated : n);
  saveDB(db);
  res.json(updated);
});

app.delete('/api/clusters/:id/operations/:opId/notes/:noteId', (req, res) => {
  const db = loadDB();
  const cluster = db.clusters.find(c => c.id === req.params.id);
  if (!cluster) return res.status(404).json({ message: 'Cluster not found' });
  const op = (cluster.operations ?? []).find(o => o.id === req.params.opId);
  if (!op) return res.status(404).json({ message: 'Operation not found' });
  const noteExists = (op.reschedule_notes ?? []).some(n => n.id === req.params.noteId);
  if (!noteExists) return res.status(404).json({ message: 'Note not found' });
  op.reschedule_notes = (op.reschedule_notes ?? []).filter(n => n.id !== req.params.noteId);
  saveDB(db);
  res.status(204).send();
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

app.get('/api/dashboard', (req, res) => {
  const db = loadDB();
  const clusters = db.clusters.map(c => hydrateCluster(c, db.factories));
  const statuses = ['purchase', 'movein', 'infra', 'cluster', 'platform', 'release'];
  const status_counts = Object.fromEntries(
    statuses.map(s => [s, clusters.filter(c => c.status === s).length])
  );
  res.json({ status_counts, total: clusters.length });
});

// ── Timeline ──────────────────────────────────────────────────────────────────

app.get('/api/timeline', (req, res) => {
  const db = loadDB();
  res.json(db.clusters.map(c => hydrateCluster(c, db.factories)));
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running at http://0.0.0.0:${PORT}`);
});
