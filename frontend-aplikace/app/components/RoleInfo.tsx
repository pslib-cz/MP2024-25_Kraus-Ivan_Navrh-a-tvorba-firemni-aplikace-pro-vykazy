import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRoles } from '@/providers/RoleProvider';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

interface RoleInfoProps {
  id: number;
  displayType: 'name' | 'icon' | 'both';
}

const RoleInfo: React.FC<RoleInfoProps> = ({ id, displayType }) => {
  const { roles, loading, error } = useRoles();

  if (loading) {
    return <span>Načítám role...</span>;
  }

  if (error) {
    return <span>Chyba při načítání rolí: {error}</span>;
  }

  const role = roles.find((role) => role.id === id);

  if (!role) {
    return <span>Neznámá role</span>;
  }

  if (displayType === 'icon') {
    return <FontAwesomeIcon icon={role.icon as IconDefinition} />;
  }

  if (displayType === 'name') {
    return <span>{role.name}</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {role.icon && <FontAwesomeIcon icon={role.icon as IconDefinition} />}
      {role.name && <span>{role.name}</span>}
    </div>
  );
};

export default RoleInfo;
