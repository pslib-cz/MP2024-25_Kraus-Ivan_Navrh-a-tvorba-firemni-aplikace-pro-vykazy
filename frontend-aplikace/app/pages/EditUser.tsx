import React, { useEffect, useState } from 'react';
import Menu from '../components/Menu';
import InputGroup from '@/components/InputGroup';
import Button from '@/components/Button';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import {
  faEnvelope,
  faKey,
  faUser,
  faUserShield,
  faQuestionCircle,
  faSave,
  faPen,
} from '@fortawesome/free-solid-svg-icons';
import styles from '@/pages/EditUser.module.scss';
import { useUsersContext, User } from '@/providers/UserProvider';
import { useRoles } from '@/providers/RoleProvider';
import { useJobTitles } from '@/providers/JobTitleProvider';
import { useMessage } from '@/providers/MessageProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import profile_picture_placeholder from '@/assets/images/profile_picture_placeholder.webp';

function gatherAllSubordinates(userId: number, allUsers: User[]): number[] {
  const subordinates: number[] = [];
  const queue = [userId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;

    for (const usr of allUsers) {
      if (usr.supervisor?.id === current) {
        subordinates.push(usr.id);
        queue.push(usr.id);
      }
    }
  }
  return subordinates;
}

const EditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { fetchUserById, updateUser, fetchUsers, users, fetchSupervisors } = useUsersContext();

  const { roles, loading: rolesLoading, error: rolesError } = useRoles();
  const { jobTitles, loading: jobTitlesLoading, error: jobTitlesError } = useJobTitles();
  const { showMessage } = useMessage();
  const { user: currentUser } = useAuthContext();

  const [localUser, setLocalUser] = useState<User | null>(null);

  const [allSupervisors, setAllSupervisors] = useState<User[]>([]);

  const [originalData, setOriginalData] = useState({
    name: '',
    email: '',
    role_id: '',
    supervisor_id: '',
    job_title_id: '',
    auto_approved: '0',
    avatar: '',
  });
  const [formData, setFormData] = useState(originalData);

  const [supervisors, setSupervisors] = useState<{ value: string; label: string }[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!id) {
          showMessage('Uživatel nebyl nalezen.', 'error');
          return navigate('/all-users');
        }

        setIsLoading(true);

        const user = await fetchUserById(Number(id));
        setLocalUser(user);

        await fetchUsers(1, 9999);

        const sup = await fetchSupervisors();
        setAllSupervisors(sup);

        const userData = {
          name: user.name,
          email: user.email,
          role_id: user.role.id.toString(),
          supervisor_id: user.supervisor?.id?.toString() || '',
          job_title_id: user.job_title?.id?.toString() || '',
          auto_approved: user.auto_approved ? '1' : '0',
          avatar: user.avatar ? `data:image/jpeg;base64,${user.avatar}` : '',
        };
        setOriginalData(userData);
        setFormData(userData);
      } catch (error) {
        console.error('Chyba při načítání uživatele:', error);
        showMessage('Chyba při načítání uživatele.', 'error');
        navigate('/all-users');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, fetchUserById, fetchUsers, fetchSupervisors, navigate, showMessage]);

  useEffect(() => {
    if (localUser && users.length > 0 && allSupervisors.length > 0) {
      const userId = localUser.id;

      const subordinates = gatherAllSubordinates(userId, users);

      const disallowedIds = new Set<number>([userId, ...subordinates]);

      const filtered = [
        { value: '', label: 'Bez nadřízeného' },
        ...allSupervisors
          .filter((sup) => !disallowedIds.has(sup.id))
          .map((sup) => ({
            value: sup.id.toString(),
            label: sup.name,
          })),
      ];

      setSupervisors(filtered);
    }
  }, [localUser, users, allSupervisors]);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const updatedFields = Object.entries(formData).reduce((acc, [key, value]) => {
      const originalValue = originalData[key as keyof typeof originalData];
      if (value !== originalValue) {
        if (['role_id', 'supervisor_id', 'job_title_id'].includes(key)) {
          acc[key] = parseInt(value) || null;
        } else if (key === 'auto_approved') {
          acc[key] = value === '1';
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(updatedFields).length === 0) {
      showMessage('Žádné změny nebyly provedeny.', 'info');
      return;
    }

    try {
      await updateUser(Number(id), updatedFields);
      const userName = formData.name || originalData.name;
      showMessage(`Uživatel ${userName} byl úspěšně upraven.`, 'success');
    } catch (err) {
      console.error(err);
      showMessage('Chyba při aktualizaci uživatele.', 'error');
    }
  };

  if (rolesError || jobTitlesError) {
    showMessage('Chyba při načítání rolí/pozic!', 'error');
    return null;
  }

  return (
    <div className={styles.layoutContainer}>
      <Menu activeItem="/edit-user" />
      <div className={styles.contentContainer}>
        <Header
          icon={faPen}
          title="Editace uživatele"
          backButton={{ link: '/all-users', showOn: 'both' }}
        />
        <div className={styles.content}>
          {isLoading || rolesLoading || jobTitlesLoading ? (
            <Loader isContentOnly />
          ) : (
            <>
              <div className={styles.userTitle}>
                <img
                  src={formData.avatar || profile_picture_placeholder}
                  alt="Profilová fotka"
                  className={styles.profileImage}
                />
                <h2>
                  <span className={styles.userName}>{originalData.name}</span>
                </h2>
              </div>

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
                  id="role_id"
                  label="Práva"
                  icon={faKey}
                  isSelect
                  selectOptions={roles
                    .filter((role) => {
                      return !(currentUser?.role.id === 2 && role.id === 1);
                    })
                    .map((role) => ({
                      value: role.id.toString(),
                      label: role.name,
                    }))}
                  value={formData.role_id}
                  onSelectChange={(option) => handleInputChange('role_id', option?.value || '')}
                />

                <InputGroup
                  id="supervisor_id"
                  label="Nadřízený"
                  icon={faUserShield}
                  isSelect
                  selectOptions={supervisors}
                  value={formData.supervisor_id}
                  onSelectChange={(option) =>
                    handleInputChange('supervisor_id', option?.value || '')
                  }
                />

                <InputGroup
                  id="job_title_id"
                  label="Pozice"
                  icon={faUser}
                  isSelect
                  selectOptions={jobTitles.map((job) => ({
                    value: job.id.toString(),
                    label: job.name,
                  }))}
                  value={formData.job_title_id}
                  onSelectChange={(option) =>
                    handleInputChange('job_title_id', option?.value || '')
                  }
                />

                <InputGroup
                  id="auto_approved"
                  label="Kontrola"
                  icon={faQuestionCircle}
                  isSelect
                  selectOptions={[
                    { value: '1', label: 'Nevyžaduje kontrolu' },
                    { value: '0', label: 'Vyžaduje kontrolu' },
                  ]}
                  value={formData.auto_approved}
                  onSelectChange={(option) =>
                    handleInputChange('auto_approved', option?.value || '0')
                  }
                />

                <div className={styles.buttonContainer}>
                  <Button type="submit">
                    Uložit změny <FontAwesomeIcon icon={faSave} />
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

export default EditUser;
