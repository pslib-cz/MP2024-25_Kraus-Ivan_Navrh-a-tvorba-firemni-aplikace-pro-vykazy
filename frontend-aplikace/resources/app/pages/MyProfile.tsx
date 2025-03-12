import React, { useEffect, useState } from 'react';
import Menu from '../components/Menu';
import styles from './MyProfile.module.scss';
import Header from '@/components/Header';
import {
  faFloppyDisk,
  faLock,
  faUser,
  faUserShield,
  faEnvelope,
  faKey,
  faQuestionCircle,
  faRotateLeft,
  faChevronUp,
  faChevronDown,
  faUnlink,
} from '@fortawesome/free-solid-svg-icons';
import profile_picture_placeholder from '@/assets/images/profile_picture_placeholder.webp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuthContext, AuthActionTypes } from '@/providers/AuthProvider';
import { useMessage } from '@/providers/MessageProvider';
import { faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import { useFetch } from '@/utils/useFetch';
import ReactCollapse, { CollapseProps } from 'react-collapse';

const Collapse: React.FC<CollapseProps> = ReactCollapse as unknown as React.FC<CollapseProps>;

import Loader from '@/components/Loader';
import Button from '@/components/Button';
import InputGroup from '@/components/InputGroup';
import RoleInfo from '@/components/RoleInfo';
import JobTitle from '@/components/JobTitle';
import { useRoles } from '@/providers/RoleProvider';
import { useJobTitles } from '@/providers/JobTitleProvider';

// Interface manažera
interface Supervisor {
  id: number;
  name: string;
}

const MyProfile: React.FC = () => {
  // Funkce z AuthProvideru
  const { user, toggleShowAllTasks, connectMsAccount, disconnectMsAccount, dispatch } =
    useAuthContext();
  const { showMessage } = useMessage();

  // Otevření a zavření sekce pro změnu hesla
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);

  // Načtení rolí a pracovních pozic
  const { roles, loading: rolesLoading } = useRoles();
  const { jobTitles, loading: jobTitlesLoading } = useJobTitles();

  // Stav načítání profilu
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const isLoading = isProfileLoading || rolesLoading || jobTitlesLoading;

  // Formulářová data
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role_id: user?.role.id || '',
    job_title_id: user?.job_title.id || '',
    supervisor_id: user?.supervisor?.id || '',
    auto_approved: user?.auto_approved || false,
    show_all_tasks: user?.show_all_tasks || false,
  });

  // Informace o změně formuláře
  const [isDirty, setIsDirty] = useState(false);

  // Manažeři
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);

  // Heslo
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');

  // Profilovka
  const profilePicture = user?.avatar
    ? `data:image/jpeg;base64,${user.avatar}`
    : profile_picture_placeholder;

  // Načtení dat
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsProfileLoading(true);
        if (
          !roles ||
          roles.length === 0 ||
          !jobTitles ||
          jobTitles.length === 0 ||
          supervisors.length === 0
        ) {
          const supervisorsData = await fetch('/users/supervisors').then((res) => res.json());
          setSupervisors([{ id: 0, name: 'Bez nadřízeného' }, ...supervisorsData]);
        }
      } catch (error) {
        console.error('Chyba při načítání dat:', error);
      } finally {
        setIsProfileLoading(false);
      }
    };

    loadInitialData();
  }, [roles, jobTitles, supervisors]);

  // Synchronizace stavu show_all_tasks s kontextovým userem
  useEffect(() => {
    if (user) {
      setFormData((prevData) => ({
        ...prevData,
        show_all_tasks: user.show_all_tasks || false,
      }));
    }
  }, [user]);

  // Změna formulářových dat
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]:
        name === 'supervisor_id' && value === '0'
          ? null
          : type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value || null,
    }));
    setIsDirty(true);
  };

  // Reset pořadí sloupců
  const resetColumns = () => {
    localStorage.removeItem('myReportsColumnOrder');
    localStorage.removeItem('allReportsColumnOrder');
    localStorage.removeItem('allUsersColumnOrder');
    showMessage('Pořadí sloupců obnoveno!', 'success');
    window.location.reload();
  };

  // Připojení Microsoft účtu
  const handleMicrosoftConnect = async () => {
    try {
      await connectMsAccount();
      const updatedUser = await fetch('/users/me').then((res) => res.json());
      dispatch({ type: AuthActionTypes.UPDATE_USER, payload: updatedUser });
      showMessage('Microsoft účet byl úspěšně propojen!', 'success');
    } catch (error) {
      console.error('Chyba při propojení Microsoft účtu:', error);
      showMessage('Chyba při propojení Microsoft účtu!', 'error');
    }
  };

  // Odpojení Microsoft účtu
  const handleDisconnectMsAccount = async () => {
    try {
      await disconnectMsAccount();
      const updatedUser = await fetch('/users/me').then((res) => res.json());
      dispatch({ type: AuthActionTypes.UPDATE_USER, payload: updatedUser });
      showMessage('Microsoft účet byl odpojen.', 'success');
    } catch (error) {
      console.error('Chyba při odpojování Microsoft účtu:', error);
      showMessage('Chyba při odpojování Microsoft účtu!', 'error');
    }
  };

  function resolveNestedKey(obj: any, key: string): any {
    return key.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  // Změna auto_approved
  const handleAutoApprovedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      auto_approved: !checked,
    }));
    setIsDirty(true);
  };

  // Odeslání formuláře
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Zadání nového hesla
      if (newPassword && confirmPassword) {
        if (newPassword !== confirmPassword) {
          showMessage('Hesla se neshodují!', 'error');
          return;
        }
        await useFetch('/users/me/settings/password', 'PUT', {
          password_old: oldPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        });
        showMessage('Heslo bylo úspěšně změněno!', 'success');
      }

      // Změny v profilu
      if (isDirty) {
        const updatedData: Partial<typeof formData> = {};

        const keyMap: Record<string, string> = {
          name: 'name',
          email: 'email',
          role_id: 'role.id',
          job_title_id: 'job_title.id',
          supervisor_id: 'supervisor.id',
          auto_approved: 'auto_approved',
          show_all_tasks: 'show_all_tasks',
        };

        Object.keys(formData).forEach((key) => {
          const mappedKey = keyMap[key];
          if (!mappedKey) return;

          const formValue = formData[key as keyof typeof formData];
          const userValue = resolveNestedKey(user, mappedKey);

          const normalizedFormValue =
            typeof formValue === 'boolean' ? Number(formValue) : formValue;
          const normalizedUserValue =
            typeof userValue === 'boolean' ? Number(userValue) : userValue;

          if (normalizedFormValue !== normalizedUserValue) {
            (updatedData as any)[key] = formValue;
          }
        });

        if (Object.keys(updatedData).length === 0) {
          showMessage('Nebyly provedeny žádné změny.', 'info');
          return;
        }

        await useFetch('/users/me/settings', 'PUT', updatedData);

        const updatedUser = await fetch('/users/me').then((res) => res.json());
        dispatch({ type: AuthActionTypes.UPDATE_USER, payload: updatedUser });

        if ('show_all_tasks' in updatedData) {
          toggleShowAllTasks(updatedData.show_all_tasks ?? false);
        }

        showMessage('Údaje byly úspěšně aktualizovány!', 'success');
        setIsDirty(false);

        if (updatedData.role_id) {
          window.location.reload();
        }
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      let errorMsg = 'Chyba při aktualizaci profilu!';

      if (error.errors && typeof error.errors === 'object') {
        const joinedErrors = Object.values(error.errors).flat().join(' | ');
        if (joinedErrors) {
          errorMsg = joinedErrors;
        }
      } else if (error.message && typeof error.message === 'string') {
        errorMsg = error.message;
      }
      showMessage(errorMsg, 'error');
    }
  };

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/my-profile" />

      <div className={styles.contentContainer}>
        <Header icon={faUser} title="Můj profil" backButton={{ link: '/more', showOn: 'mobile' }} />

        <div className={styles.content}>
          {isLoading ? (
            <Loader isContentOnly={true} />
          ) : (
            <>
              <div className={styles.profileSection}>
                <div className={styles.left}>
                  <img src={profilePicture} alt="Profilová fotka" className={styles.profileImage} />
                  <div className={styles.profileDetails}>
                    <div className={styles.name}>
                      <h2>{user?.name || 'Neznámý uživatel'}</h2>
                    </div>
                    <div className={styles.role}>
                      <RoleInfo id={user?.role.id || 3} displayType="both" />
                    </div>
                  </div>
                </div>
                <div className={styles.right}>
                  <div className={styles.jobTitle}>
                    <JobTitle
                      id={user?.job_title.id || 3}
                      returnType="both"
                      className="custom-icon-class"
                    />
                  </div>
                  <div>
                    {user?.supervisor?.name ? (
                      <div className={styles.superVisor}>
                        <FontAwesomeIcon icon={faUserShield} />
                        {user?.supervisor.name}
                      </div>
                    ) : (
                      <span></span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.settingsSection}>
                <h2>Nastavení</h2>

                <form className={styles.form} onSubmit={handleSubmit}>
                  <div className={styles.inputsContainer}>
                    <InputGroup
                      id="name"
                      label="Jméno"
                      type="text"
                      icon={faUser}
                      value={formData.name}
                      onChange={handleInputChange}
                    />

                    <InputGroup
                      id="email"
                      label="Email"
                      type="email"
                      icon={faEnvelope}
                      value={formData.email}
                      onChange={handleInputChange}
                    />

                    <InputGroup
                      id="job_title_id"
                      label="Role"
                      isSelect
                      icon={faUser}
                      value={jobTitles
                        .map((job) => ({ value: job.id.toString(), label: job.name }))
                        .find((option) => option.value === formData.job_title_id?.toString())}
                      selectOptions={jobTitles.map((job) => ({
                        value: job.id.toString(),
                        label: job.name,
                      }))}
                      onSelectChange={(selectedOption) =>
                        handleInputChange({
                          target: {
                            name: 'job_title_id',
                            value: selectedOption?.value || '',
                          },
                        } as React.ChangeEvent<HTMLInputElement>)
                      }
                    />

                    {user?.role.id === 1 && (
                      <InputGroup
                        id="supervisor_id"
                        label="Nadřízený"
                        isSelect
                        icon={faUserShield}
                        value={supervisors
                          .map((supervisor) => ({
                            value: supervisor.id.toString(),
                            label: supervisor.name,
                          }))
                          .find((option) => option.value === formData.supervisor_id?.toString())}
                        selectOptions={supervisors.map((supervisor) => ({
                          value: supervisor.id.toString(),
                          label: supervisor.name,
                        }))}
                        onSelectChange={(selectedOption) =>
                          handleInputChange({
                            target: {
                              name: 'supervisor_id',
                              value: selectedOption?.value || '',
                            },
                          } as React.ChangeEvent<HTMLInputElement>)
                        }
                      />
                    )}

                    {user?.role.id === 1 && (
                      <InputGroup
                        id="role_id"
                        label="Práva"
                        isSelect
                        icon={faKey}
                        value={roles
                          ?.map((role) => ({ value: role.id.toString(), label: role.name }))
                          .find((option) => option.value === formData.role_id?.toString())}
                        selectOptions={roles?.map((role) => ({
                          value: role.id.toString(),
                          label: role.name,
                        }))}
                        onSelectChange={(selectedOption) =>
                          handleInputChange({
                            target: { name: 'role_id', value: selectedOption?.value || '' },
                          } as React.ChangeEvent<HTMLInputElement>)
                        }
                      />
                    )}

                    {(user?.role.id === 1 || user?.role.id === 2) && (
                      <div className={styles.checkboxSection}>
                        <label className={styles.hoverTooltip}>
                          <input
                            type="checkbox"
                            checked={formData.show_all_tasks}
                            onChange={(e) =>
                              handleInputChange({
                                target: {
                                  name: 'show_all_tasks',
                                  value: e.target.checked,
                                } as any,
                              } as React.ChangeEvent<HTMLInputElement>)
                            }
                          />
                          Zobrazit všechny úkoly
                          <FontAwesomeIcon icon={faQuestionCircle} className={styles.infoIcon} />
                          <span className={styles.tooltipText}>
                            U vytvoření/editace výkazů bude ve výchozím stavu nabízet vše z Raynetu.
                          </span>
                        </label>

                        <label>
                          <input
                            type="checkbox"
                            checked={!formData.auto_approved}
                            onChange={handleAutoApprovedChange}
                          />
                          Vyžaduje kontrolu
                        </label>
                      </div>
                    )}
                  </div>

                  <div className={styles.resetColumnsSection}>
                    <label className={styles.hoverTooltip}>
                      <Button
                        type="button"
                        onClick={resetColumns}
                        className={styles.resetColumnsButton}
                      >
                        <FontAwesomeIcon icon={faRotateLeft} style={{ marginLeft: '0.5rem' }} />
                        Resetovat sloupce tabulek
                      </Button>
                      <FontAwesomeIcon icon={faQuestionCircle} className={styles.infoIcon} />
                      <span className={styles.tooltipText}>
                        Pořadí sloupců tabulek se dají měnit pomocí drag & drop. Tímto je vrátíte do
                        defaultního stavu.
                      </span>
                    </label>
                  </div>

                  <div className={styles.passwordChangeSection}>
                    <div className={styles.accordion}>
                      <div
                        className={`${styles.accordionHeader} ${
                          isPasswordSectionOpen ? 'open' : ''
                        }`}
                        onClick={() => setIsPasswordSectionOpen((prev) => !prev)}
                      >
                        <div className={styles.title}>
                          <h3>Změna hesla</h3>
                        </div>
                        <FontAwesomeIcon
                          icon={isPasswordSectionOpen ? faChevronUp : faChevronDown}
                        />
                      </div>

                      <Collapse
                        isOpened={isPasswordSectionOpen}
                        theme={{
                          collapse: styles.reactCollapse,
                        }}
                      >
                        <div className={styles.passwordChangeContent}>
                          <InputGroup
                            id="oldPassword"
                            label="Staré heslo"
                            type="password"
                            icon={faLock}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                          />

                          <InputGroup
                            id="newPassword"
                            label="Nové heslo"
                            type="password"
                            icon={faLock}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />

                          <InputGroup
                            id="confirmPassword"
                            label="Potvrďte nové heslo"
                            type="password"
                            icon={faLock}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      </Collapse>
                    </div>
                  </div>

                  <div className={styles.microsoftButtons}>
                    {user?.ms_id ? (
                      <Button
                        type="button"
                        onClick={handleDisconnectMsAccount}
                        className={styles.disconnectButton}
                      >
                        Odpojit Microsoft účet <FontAwesomeIcon icon={faUnlink} />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleMicrosoftConnect}
                        className={styles.connectButton}
                      >
                        Připojit Microsoft účet <FontAwesomeIcon icon={faMicrosoft} />
                      </Button>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className={styles.submitButton}
                    disabled={!isDirty && !newPassword && !confirmPassword}
                  >
                    Uložit změny <FontAwesomeIcon icon={faFloppyDisk} />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
