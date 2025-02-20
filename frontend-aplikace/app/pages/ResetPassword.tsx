import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ResetPassword.module.scss';
import logo from '../assets/images/sm-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Loader from '../components/Loader';
import {
  faChevronLeft,
  faEnvelope,
  faLock,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { useMessage } from '@/providers/MessageProvider';
import Button from '../components/Button';
import InputGroup from '@/components/InputGroup';

const ResetPassword: React.FC = () => {
  const { resetPassword } = useAuthContext();
  const { showMessage } = useMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirmation, setPasswordConfirmation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const emailFromQuery = queryParams.get('email');
    const tokenFromQuery = queryParams.get('token');

    if (emailFromQuery) {
      setEmail(emailFromQuery);
    } else {
      showMessage('Email není k dispozici v URL.', 'error');
    }

    if (tokenFromQuery) {
      setToken(tokenFromQuery);
    } else {
      showMessage('Token není k dispozici v URL.', 'error');
    }
  }, [location.search, showMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!token) {
      showMessage('Token pro reset hesla není k dispozici.', 'error');
      setIsLoading(false);
      return;
    }
    if (password !== passwordConfirmation) {
      showMessage('Hesla se neshodují.', 'error');
      setIsLoading(false);
      return;
    }

    try {
      await resetPassword(email, password, passwordConfirmation, token);
      showMessage('Heslo bylo úspěšně resetováno.', 'success');
      navigate('/login');
    } catch (err: any) {
        let errorMsg = 'Chyba při resetu hesla. Zkuste to znovu.';

        if (err?.message && typeof err.message === 'object' && Array.isArray(err.message.password)) {
            errorMsg = err.message.password[0];
        }
        else if (typeof err?.message === 'string') {
            errorMsg = err.message;
        }

        showMessage(errorMsg, 'error');
    }  finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {isLoading && <Loader className={styles.loader} />}
      <div className={styles.card}>
        <div className={styles.card__content}>
          <div className={styles.logo}>
            <img src={logo} alt="Výkazovník logo" />
            <h1>Výkazovník</h1>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <h2>Reset hesla</h2>
            <InputGroup
              id="email"
              label="Email"
              type="email"
              icon={faEnvelope}
              value={email}
              readOnly
              className={styles.readOnlyInput}
            />

            <InputGroup
              id="password"
              label="Nové heslo"
              type="password"
              icon={faLock}
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <InputGroup
              id="passwordConfirmation"
              label="Potvrdit nové heslo"
              type="password"
              icon={faLock}
              placeholder=""
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
            />

            <Button type="submit" className={styles.submitButton}>
              Resetovat heslo <FontAwesomeIcon icon={faRotateRight} />
            </Button>

            <Button type="button" className={styles.backButton} onClick={() => navigate('/login')}>
              <FontAwesomeIcon icon={faChevronLeft} /> Zpět na přihlášení
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
