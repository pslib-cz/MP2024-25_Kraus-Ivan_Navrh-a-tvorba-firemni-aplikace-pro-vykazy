import React, { useEffect, useState } from 'react';
import Menu from '../components/Menu';
import styles from './Standup.module.scss';
import Header from '@/components/Header';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import { useReportContext } from '@/providers/ReportProvider';
import { useClientContext } from '@/providers/ClientsProvider';
import { format, addDays, getDay, isFriday } from 'date-fns';
import Loader from '../components/Loader';

const gifs: Record<string, { default: string }> = import.meta.glob('@/assets/gifs/*.gif', {
  eager: true,
});

// Funkce vracící náhodný GIF
const getRandomGif = (gifArray: string[]): string => {
  const keys = Object.keys(gifs);
  const filteredKeys = keys.filter((key) => gifArray.some((gif) => key.includes(gif)));
  if (filteredKeys.length === 0) return '';
  return gifs[filteredKeys[Math.floor(Math.random() * filteredKeys.length)]].default;
};

const Standup = () => {
  // Funkce z kontextů
  const { fetchMyReports, reports, loading: loadingReports } = useReportContext();
  const { fetchClientById } = useClientContext();

  // Lokální proměnné
  const today = new Date();
  const yesterday = format(addDays(today, -1), 'yyyy-MM-dd');
  const dateTo = format(addDays(today, -1), 'yyyy-MM-dd');
  const isSunday = getDay(addDays(today, -1)) === 0;
  const isSaturday = getDay(addDays(today, -1)) === 6;
  const isFridayToday = isFriday(today);

  const [totalHours, setTotalHours] = useState(0);
  const [companyNames, setCompanyNames] = useState({});
  const [loadingClients, setLoadingClients] = useState(false);

  // Načtení reportů za minulý den
  useEffect(() => {
    const fetchReportsForYesterday = async () => {
      try {
        await fetchMyReports(1, 100, { date_from: yesterday, date_to: dateTo });
      } catch (err) {
        console.error('Chyba při načítání reportů:', err);
      }
    };
    fetchReportsForYesterday();
  }, [fetchMyReports, yesterday, dateTo]);

  // Načtení klientů pro reporty
  useEffect(() => {
    if (reports.length === 0) return;

    const fetchCompanyNames = async () => {
      setLoadingClients(true);
      try {
        const uniqueCompanyIds = Array.from(
          new Set(reports.map((report) => report.company_id).filter(Boolean)),
        );

        const clientFetchPromises = uniqueCompanyIds.map(async (id) => {
          const client = await fetchClientById(id);
          return client ? { id, name: client.name } : null;
        });

        const clients = (await Promise.all(clientFetchPromises)).filter(
          (client): client is { id: number; name: string } => client !== null,
        );

        const names: Record<number, string> = clients.reduce((acc, client) => {
          acc[client.id] = client.name;
          return acc;
        }, {} as Record<number, string>);

        setCompanyNames(names);
      } catch (err) {
        console.error('Chyba při načítání názvů klientů:', err);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchCompanyNames();
  }, [reports, fetchClientById]);

  // Spočítání celkové doby všech reportů
  useEffect(() => {
    setTotalHours(reports.reduce((sum, report) => sum + parseFloat(report.length || '0'), 0));
  }, [reports]);

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/standup" />
      <div className={styles.contentContainer}>
        <Header icon={faComments} title="Standup" />
        <div className={styles.content}>
          {(loadingReports || loadingClients) && (
            <div className={styles.loaderContainer}>
              <Loader isContentOnly={true} />
            </div>
          )}

          {!loadingReports && !loadingClients && (
            <>
              <div className={styles.title}>
                <h2>Včera odpracováno:</h2>
                <p className={styles.total}>
                  <strong>
                    <span>Σ </span>
                    {totalHours.toFixed(2)} h
                  </strong>
                </p>
              </div>

              {reports.length === 0 && isSunday && (
                <div className={styles.empty}>
                  <p>Klid, včera byla neděle.</p>
                  <img
                    src={getRandomGif(['monday1.gif', 'monday2.gif'])}
                    alt="Back to work"
                    className={styles.gif}
                  />
                </div>
              )}

              {reports.length === 0 && isSaturday && (
                <div className={styles.empty}>
                  <p>Užívej víkend, včera byla sobota!</p>
                  <img
                    src={getRandomGif(['happy1.gif', 'happy2.gif'])}
                    alt="Relax Saturday gif"
                    className={styles.gif}
                  />
                </div>
              )}

              {reports.length === 0 && !isSunday && !isSaturday && (
                <div className={styles.empty}>
                  <p>Buď si včera nepracoval(a), nebo nevykázal(a)!</p>
                  <img
                    src={getRandomGif(['no_work1.gif', 'no_work2.gif', 'no_work3.gif'])}
                    alt="No work gif"
                    className={styles.gif}
                  />
                </div>
              )}

              {reports.length > 0 && (
                <>
                  <ul className={styles.reportList}>
                    {reports.map((report) => (
                      <li key={report.id} className={styles.reportItem}>
                        <span className={styles.itemTitle}>
                          {report.client_name || 'Unknown Client'}
                          <span className={styles.length}>{report.length} h</span>
                        </span>
                        <span className={styles.taskName}>
                          {report.task_name || 'Neznámý úkol'}
                        </span>
                        <p className={styles.itemSummary}>{report.summary}</p>
                      </li>
                    ))}
                  </ul>

                  {isFridayToday && (
                    <div className={styles.fridayGif}>
                      <img
                        src={getRandomGif(['friday1.gif', 'friday2.gif'])}
                        alt="It's Friday gif"
                        className={styles.gif}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Standup;
