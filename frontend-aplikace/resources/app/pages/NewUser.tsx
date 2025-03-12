import React, { useEffect, useState } from 'react';

import Menu from '../components/Menu';
import InputGroup from '@/components/InputGroup';
import Button from '@/components/Button';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import {
  faEnvelope,
  faKey,
  faLock,
  faUser,
  faUserPlus,
  faUserShield,
  faQuestionCircle,
  faFloppyDisk,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from '@/pages/NewUser.module.scss';

import { useUsersContext } from '@/providers/UserProvider';
import { useRoles } from '@/providers/RoleProvider';
import { useJobTitles } from '@/providers/JobTitleProvider';
import { useMessage } from '@/providers/MessageProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';

const NewUser: React.FC = () => {
  // Stavy a funkce z kontextů
  const { fetchSupervisors, addUser } = useUsersContext();
  const { roles, loading: rolesLoading, error: rolesError } = useRoles();
  const { jobTitles, loading: jobTitlesLoading, error: jobTitlesError } = useJobTitles();
  const { user: currentUser } = useAuthContext();
  const { showMessage } = useMessage();
  const navigate = useNavigate();

  const [supervisors, setSupervisors] = useState<{ value: string; label: string }[]>([]);

  // Formulářová data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    supervisor: '',
    job_title: '',
    auto_approved: '0',
  });

  // Seznam možných nadřízených
  useEffect(() => {
    const loadSupervisors = async () => {
      try {
        const supervisorData = await fetchSupervisors();
        const options = supervisorData.map((supervisor) => ({
          value: supervisor.id.toString(),
          label: supervisor.name,
        }));
        options.unshift({ value: '', label: 'Bez nadřízeného' });
        setSupervisors(options);
      } catch {
        showMessage('Chyba při načítání nadřízených.', 'error');
      }
    };
    loadSupervisors();
  }, [fetchSupervisors, showMessage]);

  // Změny ve formuláři
  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Odeslání formuláře a vytvoření nového uživatele
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.role ||
      !formData.job_title
    ) {
      showMessage('Vyplňte všechna povinná pole!', 'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showMessage('Hesla se neshodují!', 'error');
      return;
    }

    try {
      await addUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        role_id: parseInt(formData.role),
        supervisor_id: formData.supervisor ? parseInt(formData.supervisor) : null,
        job_title_id: parseInt(formData.job_title),
        auto_approved: formData.auto_approved === '1',
      });

      const userName = formData.name.split(' ')[0];
      showMessage('Uživatel ' + userName + ' byl úspěšně přidán.', 'success');
      navigate('/all-users');
    } catch (errors) {
      if (errors && typeof errors === 'object') {
        Object.entries(errors).forEach(([field, msgs]) => {
          (msgs as string[]).forEach((msg) => {
            showMessage(msg, 'error');
          });
        });
      } else {
        showMessage('Chyba při přidávání uživatele.', 'error');
      }
    }
  };

  // Ošetření chyb při načítání rolí a jobTitles
  if (rolesError || jobTitlesError) {
    showMessage('Chyba při načítání dat!', 'error');
    return null;
  }

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/new-user" />
      <div className={styles.contentContainer}>
        <Header
          icon={faUserPlus}
          title="Nový uživatel"
          backButton={{ link: '/all-users', showOn: 'both' }}
        />
        <div className={styles.content}>
          {rolesLoading || jobTitlesLoading ? (
            <Loader isContentOnly={true} />
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                <InputGroup
                  id="name"
                  label="Jméno"
                  type="text"
                  icon={faUser}
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />

                <InputGroup
                  id="email"
                  label="Email"
                  type="email"
                  icon={faEnvelope}
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />

                <InputGroup
                  id="role"
                  label="Práva"
                  icon={faKey}
                  isSelect
                  selectOptions={roles
                    .filter((role) => currentUser?.role.id !== 2 || role.id !== 1)
                    .map((role) => ({
                      value: role.id.toString(),
                      label: role.name,
                    }))}
                  value={formData.role}
                  onSelectChange={(option) => handleInputChange('role', option?.value || '')}
                />

                <InputGroup
                  id="supervisor"
                  label="Nadřízený"
                  icon={faUserShield}
                  isSelect
                  selectOptions={supervisors}
                  value={formData.supervisor}
                  onSelectChange={(option) => handleInputChange('supervisor', option?.value || '')}
                />

                <InputGroup
                  id="password"
                  label="Heslo"
                  type="password"
                  icon={faLock}
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />

                <InputGroup
                  id="confirmPassword"
                  label="Potvrdit heslo"
                  type="password"
                  icon={faLock}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                />

                <InputGroup
                  id="job_title"
                  label="Pozice"
                  icon={faUser}
                  isSelect
                  selectOptions={jobTitles.map((job) => ({
                    value: job.id.toString(),
                    label: job.name,
                  }))}
                  value={formData.job_title}
                  onSelectChange={(option) => handleInputChange('job_title', option?.value || '')}
                />

                <InputGroup
                  id="auto_approved"
                  label="Kontrola"
                  icon={faQuestionCircle}
                  isSelect
                  selectOptions={[
                    { value: '1', label: 'Vyžaduje kontrolu' },
                    { value: '0', label: 'Nevyžaduje kontrolu' },
                  ]}
                  value={formData.auto_approved}
                  onSelectChange={(option) =>
                    handleInputChange('auto_approved', option?.value || '0')
                  }
                />

                <div className={styles.buttonContainer}>
                  <Button type="submit">
                    Uložit <FontAwesomeIcon icon={faFloppyDisk} />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewUser;
