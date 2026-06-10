import { useCallback, useEffect, useState } from 'react';
import { fetchReceipts, fetchCategoryStats } from '../api/receipts';
import FileUploader from '../components/FileUploader';

const CATEGORY_COLORS = {
  'Ruoka': '#e0a458',
  'Liikenne': '#5b9cf6',
  'Elektroniikka': '#9b7ef7',
  'Vapaa-aika': '#e07a9b',
  'Muu': '#8a93a6',
};

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: currency || 'EUR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function Dashboard() {
  const [receipts, setReceipts] = useState([]);
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [receiptsData, statsData] = await Promise.all([
        fetchReceipts(),
        fetchCategoryStats(),
      ]);
      setReceipts(receiptsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Summat lasketaan valuutoittain — eri valuuttoja ei voi laskea yhteen
  const totalsByCurrency = receipts.reduce((acc, r) => {
    const cur = r.currency || 'EUR';
    acc[cur] = (acc[cur] || 0) + Number(r.total_amount);
    return acc;
  }, {});
  const totalsList = Object.entries(totalsByCurrency);

  const avgCheck =
    receipts.length > 0
      ? receipts.reduce((s, r) => s + Number(r.total_amount), 0) / receipts.length
      : 0;

  const maxCategoryTotal = Math.max(...stats.map((s) => Number(s.total)), 1);

  if (isLoading) return <p className="status">Ladataan…</p>;

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="topbar__eyebrow">Oma talous</p>
          <h1 className="topbar__title">Kulut</h1>
        </div>
      </header>

      <FileUploader onUploadSuccess={loadData} />

      {error && <p className="error-message">{error}</p>}

      <section className="stats-grid">
        <div className="stat-card stat-card--primary">
          <p className="stat-card__label">Kulut yhteensä</p>
          {totalsList.length === 0 ? (
            <p className="stat-card__value">—</p>
          ) : (
            totalsList.map(([cur, total]) => (
              <p key={cur} className="stat-card__value">
                {formatMoney(total, cur)}
              </p>
            ))
          )}
        </div>

        <div className="stat-card">
          <p className="stat-card__label">Kuitteja ladattu</p>
          <p className="stat-card__value">{receipts.length}</p>
        </div>

        <div className="stat-card">
          <p className="stat-card__label">Keskiostos</p>
          <p className="stat-card__value">
            {receipts.length ? formatMoney(avgCheck, receipts[0]?.currency) : '—'}
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Luokittain</h2>
        {stats.length === 0 ? (
          <p className="empty-state">Lataa ensimmäinen kuitti, niin analytiikka ilmestyy tähän</p>
        ) : (
          <ul className="category-list">
            {stats.map((s) => {
              const color = CATEGORY_COLORS[s.category] || CATEGORY_COLORS['Muu'];
              return (
                <li key={s.category} className="category-row">
                  <span className="category-name">
                    <span className="category-dot" style={{ background: color }} />
                    {s.category}
                  </span>
                  <div className="category-bar-track">
                    <div
                      className="category-bar"
                      style={{
                        width: `${(Number(s.total) / maxCategoryTotal) * 100}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <span className="category-total">
                    {formatMoney(Number(s.total))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Viimeisimmät kuitit</h2>
        {receipts.length === 0 ? (
          <p className="empty-state">Ei kuitteja vielä</p>
        ) : (
          <table className="receipts-table">
            <thead>
              <tr>
                <th>Päivämäärä</th>
                <th>Kauppa</th>
                <th>Luokka</th>
                <th>Rivejä</th>
                <th>Summa</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => {
                const color = CATEGORY_COLORS[r.category] || CATEGORY_COLORS['Muu'];
                return (
                  <tr key={r.id}>
                    <td className="cell-muted">
                      {new Date(r.purchase_date).toLocaleDateString('fi-FI')}
                    </td>
                    <td className="cell-store">{r.store_name}</td>
                    <td>
                      <span className="category-chip">
                        <span className="category-dot" style={{ background: color }} />
                        {r.category}
                      </span>
                    </td>
                    <td className="cell-muted">{r.items_count}</td>
                    <td className="amount">
                      {formatMoney(Number(r.total_amount), r.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}