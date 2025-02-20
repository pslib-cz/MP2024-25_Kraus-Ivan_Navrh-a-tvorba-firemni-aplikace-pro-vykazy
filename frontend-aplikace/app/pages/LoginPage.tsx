import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useMessage } from '@/providers/MessageProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './LoginPage.module.scss';
import logo from '../assets/images/sm-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Loader from '../components/Loader';
import { useFetch } from '@/utils/useFetch';
import { faEnvelope, faLock, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import { faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import DOMPurify from 'dompurify';
import Button from '../components/Button';
import InputGroup from '@/components/InputGroup';

const LoginPage: React.FC = () => {
  const { login, msLogin, user } = useAuthContext();
  const { showMessage } = useMessage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [joke, setJoke] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = location.state?.from?.pathname + location.state?.from?.search || '/my-reports';

  const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (user) {
      navigate(fromPath, { replace: true });
    }
  }, [user, navigate, fromPath]);

  useEffect(() => {
    const fetchJoke = async () => {
      try {
        const data = await useFetch(`${BASE_API_URL}/joke`, 'GET');

        const sanitizedJoke = DOMPurify.sanitize(
          data.text
            ?.replace(/\\[rnt]/g, ' ')
            ?.replace(/\\"/g, '"')
            ?.replace(/<[^>]*>/g, '')
            ?.trim() || 'Vtip pro dnešní den.',
        );

        setJoke(sanitizedJoke);
      } catch (error) {
        console.error('Chyba při načítání vtipu:', error);
        setJoke('Vtip pro dnešní den.');
      }
    };

    fetchJoke();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showMessage('Úspěšně přihlášen!', 'success');
      navigate(fromPath, { replace: true });
    } catch (err: any) {
      showMessage('Přihlášení selhalo. Zkontrolujte své údaje.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMsLogin = async () => {
    setLoading(true);
    try {
      await msLogin();
      showMessage('Úspěšně přihlášen přes Microsoft!', 'success');
      navigate(fromPath, { replace: true });
    } catch (error) {
      showMessage('Microsoft login selhal. Zkuste to znovu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!joke) {
    return <Loader className={styles.loader} />;
  }

  return (
    <div className={styles.container}>
      {loading && <Loader className={styles.loader} />}
      <div className={styles.card}>
        <div className={styles.leftColumn}>
          <div className={styles.logo}>
            <img src={logo} alt="Výkazovník logo" />
            <h1>Výkazovník</h1>
          </div>
          {joke && <p className={styles.joke} dangerouslySetInnerHTML={{ __html: joke }} />}
        </div>
        <div className={styles.divider}></div>
        <div className={styles.rightColumn}>
          <div className={styles.inputs}>
            <form onSubmit={handleSubmit} className={styles.form}>
              <InputGroup
                id="email"
                label="Email"
                type="email"
                icon={faEnvelope}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <InputGroup
                id="password"
                label="Heslo"
                type="password"
                icon={faLock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className={styles.submitButton}>
                Přihlásit se <FontAwesomeIcon icon={faRightToBracket} />
              </Button>
            </form>
            <div className={styles.footer}>
              <a className={styles.forgotPassword} onClick={() => navigate('/forgot-password')}>
                Zapomenuté heslo
              </a>
            </div>
            <Button className={styles.microsoftButton} onClick={handleMsLogin}>
              Microsoft <FontAwesomeIcon icon={faMicrosoft} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
