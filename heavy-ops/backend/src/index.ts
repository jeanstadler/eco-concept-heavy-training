import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log('[ops-api] ' + req.method + ' ' + req.url);
  next();
});
app.use('/assets', express.static(path.join(projectRoot, 'assets'), { maxAge: 0 }));
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.post('/api/session', (_req, res) => {
  res.json({ token: 'training-session', user: 'eco-learner', expiresIn: 3600 });
});

type RecordRow = {
  id: string;
  team: string;
  owner: string;
  status: string;
  score: number;
  createdAt: string;
  notes: string;
  history: Array<{ timestamp: string; message: string }>;
};

// US03 : les indicateurs du tableau de bord (statuts, equipes, points chauds) sont calcules ici,
// pour que le front n'ait plus a telecharger les 180 dossiers complets au premier affichage.
function buildRecordSummaries(records: RecordRow[]) {
  const statusSummary = ['ok', 'warning', 'review'].map((status) => ({
    key: status,
    count: records.filter((record) => record.status === status).length
  }));

  const buckets: Record<string, { total: number; scoreTotal: number; warningCount: number; reviewCount: number }> = {};
  for (const record of records) {
    const bucket = (buckets[record.team] ??= { total: 0, scoreTotal: 0, warningCount: 0, reviewCount: 0 });
    bucket.total += 1;
    bucket.scoreTotal += record.score;
    if (record.status === 'warning') bucket.warningCount += 1;
    if (record.status === 'review') bucket.reviewCount += 1;
  }
  const teamSummary = Object.entries(buckets)
    .map(([key, bucket]) => ({
      key,
      total: bucket.total,
      average: Math.round(bucket.scoreTotal / bucket.total),
      warningCount: bucket.warningCount,
      reviewCount: bucket.reviewCount
    }))
    .sort((left, right) => right.average - left.average);

  // On n'envoie que les champs affiches (notes tronquees, nombre d'evenements au lieu de l'historique).
  const urgentRecords = [...records]
    .filter((record) => record.status !== 'ok' || record.score >= 70)
    .sort((left, right) => right.score + right.history.length * 4 - (left.score + left.history.length * 4))
    .slice(0, 6)
    .map((record) => ({
      id: record.id,
      team: record.team,
      owner: record.owner,
      status: record.status,
      score: record.score,
      notes: record.notes.slice(0, 118),
      historyCount: record.history.length
    }));

  return { statusSummary, teamSummary, urgentRecords };
}

app.get('/api/dashboard', (_req, res) => {
  const analytics = readJson('data/analytics.json');
  const records: RecordRow[] = readJson('data/records.json');
  res.json({
    summary: analytics.summary,
    // US03 : uniquement ce que la vue affiche (4 graphiques sur 16, 6 evenements du journal sur 20).
    charts: analytics.charts.slice(0, 4),
    logs: analytics.logs.slice(0, 6),
    ...buildRecordSummaries(records),
    generatedAt: new Date().toISOString()
  });
});

// US04 : liste paginee et allegee. Les notes et l'historique ne sont plus envoyes dans la liste,
// ils sont servis par /api/records/:id a l'ouverture d'un dossier.
app.get('/api/records', (req, res) => {
  const records: RecordRow[] = readJson('data/records.json');
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 10, 1), 50);
  const totalPages = Math.max(Math.ceil(records.length / pageSize), 1);
  const page = Math.min(Math.max(Number(req.query.page) || 1, 1), totalPages);
  const items = records
    .slice((page - 1) * pageSize, page * pageSize)
    .map(({ notes, history, ...summary }) => summary);
  res.json({ items, page, pageSize, total: records.length, totalPages });
});

app.get('/api/records/:id', (req, res) => {
  const records: RecordRow[] = readJson('data/records.json');
  const record = records.find((item) => item.id === req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Dossier introuvable' });
    return;
  }
  res.json(record);
});

app.get('/api/analytics', (_req, res) => {
  res.json(readJson('data/analytics.json'));
});

app.get('/api/settings', (_req, res) => {
  const analytics = readJson('data/analytics.json');
  res.json(analytics.settings);
});

app.listen(4100, () => {
  console.log('heavy-ops backend running on http://localhost:4100');
});
