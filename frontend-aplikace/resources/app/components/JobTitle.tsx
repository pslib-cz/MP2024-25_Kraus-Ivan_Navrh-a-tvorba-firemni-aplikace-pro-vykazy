import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';
import { useJobTitles } from '@/providers/JobTitleProvider';

interface JobTitleProps {
  id?: number | null;
  returnType?: 'icon' | 'name' | 'both';
  className?: string;
}

const JobTitle: React.FC<JobTitleProps> = ({ id, returnType = 'both', className }) => {
  const { jobTitles, loading, error } = useJobTitles();

  if (!id || loading) {
    return <span className={className} />;
  }
  if (error) {
    return <span className={className}>Chyba při načítání job titles: {error}</span>;
  }

  const jobTitle = jobTitles.find((job) => job.id === id);

  if (!jobTitle) {
    return (
      <span className={className}>
        <FontAwesomeIcon icon={faQuestion} /> Neznámá pozice
      </span>
    );
  }
  switch (returnType) {
    case 'icon':
      return <FontAwesomeIcon icon={jobTitle.icon || faQuestion} className={className} />;

    case 'name':
      return <span className={className}>{jobTitle.name}</span>;

    default: // 'both'
      return (
        <div className={className}>
          <FontAwesomeIcon icon={jobTitle.icon || faQuestion} /> {jobTitle.name}
        </div>
      );
  }
};

export default JobTitle;
