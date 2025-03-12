// Komponenta pro odeslání žádosti o reset hesla
import React, { useState } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import styles from './ForgotPassword.module.scss';
import logo from '../assets/images/sm-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Loader from '../components/Loader';
import { faChevronLeft, faEnvelope, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { useMessage } from '@/providers/MessageProvider';
import Button from '../components/Button';
import InputGroup from '@/components/InputGroup';

const ForgotPassword: React.FC = () => {
  // Funkce pro reset hesla
  const { forgotPassword } = useAuthContext();
  const { showMessage } = useMessage();

  // Navigace a stavy
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<boolean>(false);

  // Odeslání žádosti o reset hesla
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      showMessage('E-mail pro reset hesla byl odeslán.', 'success');
      setEmail('');
    } catch (err: any) {
      showMessage(err.message || 'Došlo k chybě při odesílání žádosti.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Návrat na přihlašovací obrazovku
  const handleBack = () => {
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.card__content}>
          <div className={styles.logo}>
            <img src={logo} alt="Výkazovník logo" />
            <h1>Výkazovník</h1>
          </div>
          {loading && <Loader className={styles.loader} />}
          <form onSubmit={handleSubmit} className={styles.form}>
            <h2>Žádost o resetování hesla</h2>
            <InputGroup
              id="email"
              label="Email"
              type="email"
              icon={faEnvelope}
              value={email}
              placeholder=""
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className={styles.submitButton}>
              Odeslat <FontAwesomeIcon icon={faPaperPlane} />
            </Button>
            <Button type="button" className={styles.backButton} onClick={handleBack}>
              <FontAwesomeIcon icon={faChevronLeft} /> Zpět na přihlášení
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
