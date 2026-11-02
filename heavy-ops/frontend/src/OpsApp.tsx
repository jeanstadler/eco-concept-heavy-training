import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';

type SummaryCard = { label: string; value: string };
type DashboardPayload = {
  summary: SummaryCard[];
  charts: Array<{ label: string; points: number[] }>;
  logs: Array<{ level: string; message: string; source: string }>;
  // US03 : indicateurs deja calcules par le serveur (plus besoin de charger tous les dossiers).
  statusSummary: Array<{ key: string; count: number }>;
  teamSummary: Array<Omit<TeamSnapshot, 'label'>>;
  urgentRecords: UrgentRecord[];
  generatedAt: string;
};
type UrgentRecord = {
  id: string;
  team: string;
  owner: string;
  status: string;
  score: number;
  notes: string;
  historyCount: number;
};
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
// US04 : la liste ne contient plus les notes ni l'historique, charges a l'ouverture d'un dossier.
type RecordSummary = Omit<RecordRow, 'notes' | 'history'>;
type RecordPage = {
  items: RecordSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
type SettingsPayload = {
  pollingMs: number;
  autoRefresh: boolean;
  retainedWidgets: string[];
};
type AnalyticsPayload = {
  summary: SummaryCard[];
  charts: Array<{ label: string; points: number[] }>;
  logs: Array<{ level: string; message: string; source: string }>;
  settings: SettingsPayload;
};
type TeamSnapshot = {
  key: string;
  label: string;
  total: number;
  average: number;
  warningCount: number;
  reviewCount: number;
};
type StatusSnapshot = {
  key: string;
  label: string;
  count: number;
  tone: string;
};

const TEAM_LABELS: Record<string, string> = {
  support: 'Support premium',
  ops: 'Exploitation',
  sales: 'Activation commerciale',
  legal: 'Conformite'
};

const STATUS_META: Record<string, { label: string; tone: string }> = {
  ok: { label: 'Stable', tone: 'stable' },
  warning: { label: 'Sous surveillance', tone: 'warning' },
  review: { label: 'A arbitrer', tone: 'review' }
};

const CHART_TITLES = [
  'Flux support',
  'Escalades grands comptes',
  'Validation metier',
  'Conformite documentaire',
  'Traitement prioritaire',
  'Rappels terrain'
];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error('Echec sur ' + url);
  }
  return response.json() as Promise<T>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatRecordId(record: { team: string }, index: number) {
  return record.team.slice(0, 3).toUpperCase() + '-' + String(index + 1204).padStart(4, '0');
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function statusInfo(status: string) {
  return STATUS_META[status] ?? { label: status, tone: 'neutral' };
}

function teamLabel(team: string) {
  return TEAM_LABELS[team] ?? team;
}

// US01 : la barre laterale n'affiche plus le resume ni les statuts (deja presents dans la vue centrale).
// On garde le titre et la navigation ; summary / statusSummary ne sont donc plus necessaires ici.
// US02 : la barre laterale recoit un bouton de rafraichissement manuel + l'heure de derniere mise a jour.
// Le rechargement automatique (toutes les 5s) est supprime : l'utilisateur recharge quand il en a besoin.
function Sidebar({ onRefresh, lastUpdated, isRefreshing }: {
  onRefresh: () => void;
  lastUpdated: Date | null;
  isRefreshing: boolean;
}) {
  return (
    <aside className="ops-sidebar">
      <div className="ops-sidebar-block">
        <p className="ops-eyebrow">Pilotage</p>
        <strong>NorthStar Desk</strong>
        <p className="ops-sidebar-copy">Centre de controle pour les arbitrages quotidiens et le suivi des files actives.</p>
      </div>

      <nav className="ops-nav">
        <NavLink to="/" end>
          Vue generale
        </NavLink>
        <NavLink to="/table">File active</NavLink>
        <NavLink to="/analytics">Analyse</NavLink>
        <NavLink to="/settings">Reglages</NavLink>
      </nav>

      {/* US02 : rafraichissement a la demande (remplace le rechargement auto toutes les 5s) */}
      <div className="ops-sidebar-block ops-refresh-block">
        <button
          type="button"
          className="ops-refresh-button"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Rafraichissement...' : 'Rafraichir les donnees'}
        </button>
        <small className="ops-refresh-meta">
          {lastUpdated
            ? 'Derniere mise a jour : ' + lastUpdated.toLocaleTimeString('fr-FR')
            : 'Donnees non chargees'}
        </small>
      </div>
    </aside>
  );
}

function DashboardPage({
  dashboard,
  statusSummary,
  teamSummary,
  urgentRecords
}: {
  dashboard: DashboardPayload;
  statusSummary: StatusSnapshot[];
  teamSummary: TeamSnapshot[];
  urgentRecords: UrgentRecord[];
}) {
  return (
    <div className="ops-stack">
      <section className="ops-hero-panel">
        <div>
          <p className="ops-eyebrow">Vue generale</p>
          <h1>Suivi temps reel des operations</h1>
          <p>
            Supervision des demandes, capacite des equipes et signaux a arbitrer dans une seule vue.
          </p>
        </div>
        <div className="ops-generated-at">Actualise le {formatDateTime(dashboard.generatedAt)}</div>
      </section>

      <section className="ops-summary-grid">
        {dashboard.summary.map((item) => (
          <article key={item.label} className="ops-summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="ops-main-grid">
        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Cadence</p>
              <h2>Flux surveilles</h2>
            </div>
          </div>
          <div className="ops-chart-grid">
            {/* US01 : 4 graphiques au lieu de 6 (nombre pair pour garder la grille a 2 colonnes propre) */}
            {dashboard.charts.slice(0, 4).map((chart, index) => (
              <article key={chart.label} className="ops-trend-card">
                <div className="ops-card-header">
                  <h3>{CHART_TITLES[index] ?? chart.label}</h3>
                  <span>{average(chart.points)} pts</span>
                </div>
                <div className="ops-bar-row">
                  {chart.points.slice(-12).map((point, pointIndex) => (
                    <span key={chart.label + '-' + pointIndex} style={{ height: point + '%' }} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="ops-panel ops-log-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Journal live</p>
              <h2>Derniers evenements</h2>
            </div>
          </div>
          <div className="ops-log-list">
            {/* US01 : on limite le journal a 6 evenements pour alleger le DOM (avant : tous, ~20) */}
            {dashboard.logs.slice(0, 6).map((log, index) => (
              <article key={log.message + '-' + index} className="ops-log-entry">
                <div className="ops-card-header">
                  <span className={'ops-status-pill ' + (log.level === 'high' ? 'warning' : 'neutral')}>{log.level}</span>
                  <small>{log.source}</small>
                </div>
                <p>{log.message}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="ops-health-layout">
        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Etat des files</p>
              <h2>Distribution instantanee</h2>
            </div>
          </div>
          <div className="ops-summary-grid compact">
            {statusSummary.map((item) => (
              <article key={item.key} className="ops-summary-card compact">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </article>
            ))}
          </div>
          <div className="ops-team-list">
            {teamSummary.map((team) => (
              <div key={team.key} className="ops-team-row">
                <div>
                  <strong>{team.label}</strong>
                  <span>{team.total} dossiers actifs</span>
                </div>
                <div className="ops-team-meta">
                  <span>{team.average} pts</span>
                  <small>{team.warningCount + team.reviewCount} a surveiller</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">A arbitrer</p>
              <h2>Points chauds du moment</h2>
            </div>
          </div>
          <div className="ops-watch-list">
            {/* US01 : on affiche 3 points chauds au lieu de 6 */}
            {urgentRecords.slice(0, 3).map((record, index) => {
              const meta = statusInfo(record.status);
              return (
                <article key={record.id} className="ops-watch-card">
                  <div className="ops-card-header">
                    <strong>{formatRecordId(record, index)}</strong>
                    <span className={'ops-status-pill ' + meta.tone}>{meta.label}</span>
                  </div>
                  <p>{teamLabel(record.team)} · {record.owner}</p>
                  <small>{record.notes}...</small>
                </article>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}

const RECORDS_PAGE_SIZE = 10;

// US04 : la page charge elle-meme une page de dossiers (10 au lieu des 180 complets),
// puis le detail (notes + historique) uniquement du dossier ouvert.
function TablePage({ refreshKey }: { refreshKey: number }) {
  const [page, setPage] = useState(1);
  const [recordPage, setRecordPage] = useState<RecordPage | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<RecordRow | null>(null);

  useEffect(() => {
    fetchJson<RecordPage>('/api/records?page=' + page + '&pageSize=' + RECORDS_PAGE_SIZE).then((payload) => {
      setRecordPage(payload);
      setSelectedId((current) =>
        payload.items.some((record) => record.id === current) ? current : payload.items[0]?.id ?? ''
      );
    });
  }, [page, refreshKey]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedRecord(null);
      return;
    }
    fetchJson<RecordRow>('/api/records/' + selectedId).then(setSelectedRecord);
  }, [selectedId, refreshKey]);

  if (!recordPage) {
    return <div className="ops-stack"><p>Chargement...</p></div>;
  }

  const records = recordPage.items;
  const offset = (recordPage.page - 1) * recordPage.pageSize;
  const selectedIndex = records.findIndex((record) => record.id === selectedRecord?.id);

  return (
    <div className="ops-stack">
      <section className="ops-hero-panel compact">
        <div>
          <p className="ops-eyebrow">File active</p>
          <h1>Vue dossier par dossier</h1>
          <p>Selectionnez une ligne pour consulter l'historique, le contexte et le score de suivi associe.</p>
        </div>
      </section>

      <section className="ops-records-grid">
        <article className="ops-panel ops-record-list">
          {records.map((record, index) => {
            const meta = statusInfo(record.status);
            const isSelected = record.id === selectedId;
            return (
              <button
                key={record.id}
                type="button"
                className={isSelected ? 'ops-record-button selected' : 'ops-record-button'}
                onClick={() => setSelectedId(record.id)}
              >
                <div className="ops-card-header">
                  <strong>{formatRecordId(record, offset + index)}</strong>
                  <span className={'ops-status-pill ' + meta.tone}>{meta.label}</span>
                </div>
                <div className="ops-record-meta">
                  <span>{teamLabel(record.team)}</span>
                  <span>{record.owner}</span>
                  <span>{formatDateTime(record.createdAt)}</span>
                </div>
                <div className="ops-progress-bar">
                  <span style={{ width: record.score + '%' }} />
                </div>
              </button>
            );
          })}

          <div className="ops-pagination">
            <button
              type="button"
              className="ops-pagination-button"
              disabled={recordPage.page <= 1}
              onClick={() => setPage(recordPage.page - 1)}
            >
              Precedent
            </button>
            <span>Page {recordPage.page} / {recordPage.totalPages}</span>
            <button
              type="button"
              className="ops-pagination-button"
              disabled={recordPage.page >= recordPage.totalPages}
              onClick={() => setPage(recordPage.page + 1)}
            >
              Suivant
            </button>
          </div>
        </article>

        <aside className="ops-panel ops-record-detail">
          {selectedRecord ? (
            <>
              <div className="ops-section-header">
                <div>
                  <p className="ops-eyebrow">Detail</p>
                  <h2>{formatRecordId(selectedRecord, offset + Math.max(selectedIndex, 0))}</h2>
                </div>
                <span className={'ops-status-pill ' + statusInfo(selectedRecord.status).tone}>
                  {statusInfo(selectedRecord.status).label}
                </span>
              </div>

              <div className="ops-detail-grid">
                <article className="ops-detail-card">
                  <span>Equipe</span>
                  <strong>{teamLabel(selectedRecord.team)}</strong>
                </article>
                <article className="ops-detail-card">
                  <span>Referent</span>
                  <strong>{selectedRecord.owner}</strong>
                </article>
                <article className="ops-detail-card">
                  <span>Score de suivi</span>
                  <strong>{selectedRecord.score} pts</strong>
                </article>
                <article className="ops-detail-card">
                  <span>Creation</span>
                  <strong>{formatDateTime(selectedRecord.createdAt)}</strong>
                </article>
              </div>

              <article className="ops-narrative-panel">
                <p className="ops-eyebrow">Contexte</p>
                <p>{selectedRecord.notes}</p>
              </article>

              <article className="ops-narrative-panel">
                <p className="ops-eyebrow">Historique recent</p>
                <div className="ops-history-list">
                  {selectedRecord.history.map((entry) => (
                    <div key={entry.timestamp + entry.message} className="ops-history-row">
                      <strong>{formatDateTime(entry.timestamp)}</strong>
                      <p>{entry.message}</p>
                    </div>
                  ))}
                </div>
              </article>
            </>
          ) : (
            <p>Chargement du dossier...</p>
          )}
        </aside>
      </section>
    </div>
  );
}

function AnalyticsPage({
  analytics,
  teamSummary,
  urgentRecords
}: {
  analytics: AnalyticsPayload;
  teamSummary: TeamSnapshot[];
  urgentRecords: UrgentRecord[];
}) {
  return (
    <div className="ops-stack">
      <section className="ops-hero-panel compact">
        <div>
          <p className="ops-eyebrow">Analyse</p>
          <h1>Tendances et niveaux d'attention</h1>
          <p>Lecture croisee des volumes, des equipes les plus sollicitees et des dossiers a arbitrer.</p>
        </div>
      </section>

      <section className="ops-analytics-grid">
        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Equipes</p>
              <h2>Charge moyenne</h2>
            </div>
          </div>
          <div className="ops-ranking-list">
            {teamSummary.map((team) => (
              <div key={team.key} className="ops-ranking-row">
                <div>
                  <strong>{team.label}</strong>
                  <small>{team.total} dossiers</small>
                </div>
                <div className="ops-ranking-bar">
                  <span style={{ width: team.average + '%' }} />
                </div>
                <strong>{team.average}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Signaux</p>
              <h2>Rythmes de flux</h2>
            </div>
          </div>
          <div className="ops-signal-list">
            {analytics.charts.slice(0, 4).map((chart, index) => (
              <div key={chart.label} className="ops-signal-row">
                <div className="ops-card-header">
                  <strong>{CHART_TITLES[index] ?? chart.label}</strong>
                  <span>{average(chart.points)} pts</span>
                </div>
                <div className="ops-mini-bars">
                  {chart.points.slice(-18).map((point, pointIndex) => (
                    <span key={chart.label + '-' + pointIndex} style={{ height: point + '%' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="ops-main-grid">
        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Resume</p>
              <h2>Indicateurs de supervision</h2>
            </div>
          </div>
          <div className="ops-summary-grid compact">
            {analytics.summary.map((item) => (
              <article key={item.label} className="ops-summary-card compact">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </article>

        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Priorites</p>
              <h2>Dossiers les plus exposes</h2>
            </div>
          </div>
          <div className="ops-watch-list">
            {urgentRecords.map((record, index) => (
              <article key={record.id} className="ops-watch-card compact">
                <div className="ops-card-header">
                  <strong>{formatRecordId(record, index)}</strong>
                  <span>{teamLabel(record.team)}</span>
                </div>
                <small>{record.historyCount} evenement(s) · {record.score} pts</small>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function SettingsPage({ settings }: { settings: SettingsPayload }) {
  return (
    <div className="ops-stack">
      <section className="ops-hero-panel compact">
        <div>
          <p className="ops-eyebrow">Reglages</p>
          <h1>Configuration du poste</h1>
          <p>Parametres de rafraichissement et widgets retenus pour les equipes de supervision.</p>
        </div>
      </section>

      <section className="ops-settings-grid">
        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Cadence</p>
              <h2>Parametres clefs</h2>
            </div>
          </div>
          <div className="ops-summary-grid compact">
            <article className="ops-summary-card compact">
              <span>Polling</span>
              <strong>{settings.pollingMs} ms</strong>
            </article>
            <article className="ops-summary-card compact">
              <span>Auto refresh</span>
              <strong>{settings.autoRefresh ? 'Actif' : 'Desactive'}</strong>
            </article>
            <article className="ops-summary-card compact">
              <span>Widgets conserves</span>
              <strong>{settings.retainedWidgets.length}</strong>
            </article>
          </div>
        </article>

        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Widgets</p>
              <h2>Elements affiches</h2>
            </div>
          </div>
          <div className="ops-bullet-stack">
            {settings.retainedWidgets.map((widget) => (
              <div key={widget} className="ops-bullet-row">
                <strong>{widget}</strong>
                <small>Visible dans la colonne de pilotage</small>
              </div>
            ))}
          </div>
        </article>

        <article className="ops-panel">
          <div className="ops-section-header">
            <div>
              <p className="ops-eyebrow">Routines</p>
              <h2>Cadre de supervision</h2>
            </div>
          </div>
          <div className="ops-bullet-stack">
            <div className="ops-bullet-row">
              <strong>Relecture des alertes toutes les 15 minutes</strong>
              <small>Verifier les niveaux warning et review avant la prochaine bascule.</small>
            </div>
            <div className="ops-bullet-row">
              <strong>Partage des arbitrages en fin de cycle</strong>
              <small>Centraliser les decisions pour le tour de table suivant.</small>
            </div>
            <div className="ops-bullet-row">
              <strong>Controle des pics de charge</strong>
              <small>Surveiller les equipes dont la moyenne depasse 70 pts.</small>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default function OpsApp() {
  const location = useLocation();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  // US03 : null = pas encore charge. Ces donnees ne sont recuperees qu'a l'ouverture de leur page.
  // US04 : les dossiers sont charges par la page Dossiers elle-meme (pagination + detail a la demande).
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  // US02 : on memorise l'heure du dernier chargement et l'etat "en cours" pour le bouton manuel.
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // US04 : incremente par le bouton "Rafraichir" pour que la page Dossiers recharge sa page courante.
  const [refreshKey, setRefreshKey] = useState(0);

  // US03 : avant, loadAll chargeait 4 endpoints au demarrage (dont les 180 dossiers complets).
  // Desormais le demarrage ne charge que /api/dashboard ; chaque page charge ses propres donnees.
  const loadDashboard = useCallback(
    () => fetchJson<DashboardPayload>('/api/dashboard').then(setDashboard),
    []
  );

  const loadPageData = useCallback((pathname: string) => {
    if (pathname === '/analytics') return fetchJson<AnalyticsPayload>('/api/analytics').then(setAnalytics);
    if (pathname === '/settings') return fetchJson<SettingsPayload>('/api/settings').then(setSettings);
    return Promise.resolve();
  }, []);

  // US02 : rafraichissement manuel. US03 : il ne recharge que le tableau de bord et la page courante.
  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey((key) => key + 1);
    Promise.all([loadDashboard(), loadPageData(location.pathname)])
      .then(() => setLastUpdated(new Date()))
      .finally(() => setIsRefreshing(false));
  }, [loadDashboard, loadPageData, location.pathname]);

  // US02 : un seul chargement au montage. On a SUPPRIME le window.setInterval(loadAll, 5000)
  // qui rechargeait les 4 endpoints toutes les 5 secondes (requetes reseau repetees et inutiles).
  useEffect(() => {
    loadDashboard().then(() => setLastUpdated(new Date()));
  }, [loadDashboard]);

  // US03 : chargement a la demande, la premiere fois qu'une page est ouverte.
  useEffect(() => {
    const isMissing =
      (location.pathname === '/analytics' && analytics === null) ||
      (location.pathname === '/settings' && settings === null);
    if (isMissing) {
      loadPageData(location.pathname);
    }
  }, [location.pathname, analytics, settings, loadPageData]);

  const statusSummary = useMemo<StatusSnapshot[]>(() => {
    return (dashboard?.statusSummary ?? []).map((item) => ({
      key: item.key,
      label: statusInfo(item.key).label,
      tone: statusInfo(item.key).tone,
      count: item.count
    }));
  }, [dashboard]);

  const teamSummary = useMemo<TeamSnapshot[]>(() => {
    return (dashboard?.teamSummary ?? []).map((team) => ({ ...team, label: teamLabel(team.key) }));
  }, [dashboard]);

  if (!dashboard) {
    return <main className="ops-loading-shell"><p>Chargement du cockpit...</p></main>;
  }

  const pageLoading = <div className="ops-stack"><p>Chargement...</p></div>;

  return (
    <div className="ops-app">
      <Sidebar onRefresh={refresh} lastUpdated={lastUpdated} isRefreshing={isRefreshing} />
      <main className="ops-content">
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                dashboard={dashboard}
                statusSummary={statusSummary}
                teamSummary={teamSummary}
                urgentRecords={dashboard.urgentRecords}
              />
            }
          />
          <Route path="/table" element={<TablePage refreshKey={refreshKey} />} />
          <Route
            path="/analytics"
            element={
              analytics ? (
                <AnalyticsPage analytics={analytics} teamSummary={teamSummary} urgentRecords={dashboard.urgentRecords} />
              ) : (
                pageLoading
              )
            }
          />
          <Route path="/settings" element={settings ? <SettingsPage settings={settings} /> : pageLoading} />
        </Routes>
      </main>
    </div>
  );
}
