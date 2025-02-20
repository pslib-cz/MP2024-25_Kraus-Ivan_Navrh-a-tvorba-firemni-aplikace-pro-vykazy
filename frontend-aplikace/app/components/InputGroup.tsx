import React, { FC, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import Select, { SingleValue } from 'react-select';
import classNames from 'classnames';
import styles from './InputGroup.module.scss';

type InputOrTextareaChangeEvent =
  | React.ChangeEvent<HTMLInputElement>
  | React.ChangeEvent<HTMLTextAreaElement>;

interface Option {
  value: string;
  label: string;
}

interface GroupedOption {
  label: string;
  options: Option[];
}

type InputValueType = string | number | undefined | Option;

type InputTextareaSelectChangeEvent =
  | React.ChangeEvent<HTMLInputElement>
  | React.ChangeEvent<HTMLTextAreaElement>
  | React.ChangeEvent<HTMLSelectElement>;

interface InputGroupProps {
  id: string;
  label?: string;
  icon?: IconDefinition;
  type?: 'text' | 'email' | 'password' | 'search' | 'number';
  value?: InputValueType;
  placeholder?: string;
  onChange?: (e: InputTextareaSelectChangeEvent) => void;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
  isSelect?: boolean;
  selectOptions?: GroupedOption[] | Option[];
  onSelectChange?: (selectedOption: SingleValue<Option>) => void;
  size?: 'small' | 'default';
  searchInput?: boolean;
  disabled?: boolean;
  suggestions?: string[];
  isTextarea?: boolean;
  rows?: number;
  isLoading?: boolean;
  loadingText?: string;
}

const InputGroup: FC<InputGroupProps> = ({
  id,
  label = '',
  icon,
  type = 'text',
  value,
  placeholder = '',
  onChange,
  required = false,
  readOnly = false,
  className = '',
  isSelect = false,
  selectOptions = [],
  onSelectChange,
  size = 'default',
  searchInput = false,
  disabled = false,
  suggestions,
  isTextarea = false,
  rows = 3,
  isLoading = false,
  loadingText = 'Načítám data...',
}) => {
  const [inputValue, setInputValue] = useState<string | number>(
    typeof value === 'object'
      ? (value as Option)?.value
      : typeof value === 'string' || typeof value === 'number'
      ? value
      : '',
  );

  useEffect(() => {
    if (typeof value === 'object' && value !== null) {
      setInputValue((value as Option)?.value || '');
    } else {
      setInputValue(value ?? '');
    }
  }, [value]);

  const wrapperClass = classNames(
    styles.inputGroup,
    className,
    { [styles.small]: size === 'small' },
    { [styles.searchInput]: searchInput },
  );

  const inputClass = classNames(styles.input, {
    [styles.small]: size === 'small',
    [styles.searchInput]: searchInput,
  });

  const handleInputChange = (e: InputOrTextareaChangeEvent) => {
    if (e.target instanceof HTMLInputElement) {
      const newValue = type === 'number' ? parseFloat(e.target.value) || '' : e.target.value;
      setInputValue(newValue);
      onChange?.(e);
    } else {
      setInputValue(e.target.value);
      onChange?.(e);
    }
  };

  const clearInput = () => {
    setInputValue('');
    onChange?.({
      target: { value: '' },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const safeSelectOptions = Array.isArray(selectOptions) ? selectOptions : [];
  const firstOption = safeSelectOptions[0];
  const isGrouped =
    Array.isArray(safeSelectOptions) &&
    safeSelectOptions.length > 0 &&
    firstOption != null &&
    typeof firstOption === 'object' &&
    !Array.isArray(firstOption) &&
    Object.prototype.hasOwnProperty.call(firstOption, 'options');

  let groupedOptions: GroupedOption[] = [];
  let flatOptions: Option[] = [];

  if (isGrouped) {
    groupedOptions = (safeSelectOptions as GroupedOption[]).map((g) => ({
      label: g.label,
      options: g.options || [],
    }));
    flatOptions = groupedOptions.flatMap((g) => g.options);
  } else {
    flatOptions = safeSelectOptions as Option[];
  }

  const currentValue = (() => {
    if (!value) return null;
    const valKey = typeof value === 'object' && true ? (value as Option).value : value;
    return flatOptions.find((o) => o.value === valKey) || null;
  })();

  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {icon && !searchInput && <FontAwesomeIcon icon={icon} />}
          {label}
        </label>
      )}

      {isTextarea ? (
        <textarea
          id={id}
          name={id}
          rows={rows}
          value={inputValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          required={required}
          readOnly={readOnly}
          disabled={disabled}
          className={inputClass}
        />
      ) : isSelect ? (
        <Select
          id={id}
          name={id}
          options={isGrouped ? groupedOptions : flatOptions}
          onChange={(selectedOption) => {
            onSelectChange?.(selectedOption || null);
          }}
          value={currentValue}
          isLoading={isLoading}
          isDisabled={disabled}
          loadingMessage={() => loadingText}
          placeholder={isLoading ? loadingText : placeholder}
          className={`react-select-container ${size === 'small' ? 'small' : ''}`}
          classNamePrefix="react-select"
          noOptionsMessage={() => 'Žádné možnosti'}
          formatGroupLabel={(group) =>
            group?.label ? <div className="react-select-group">{group.label}</div> : null
          }
        />
      ) : (
        <div className={styles.inputWrapper}>
          <input
            id={id}
            name={id}
            type={searchInput ? 'search' : type}
            list={suggestions ? `${id}-datalist` : undefined}
            value={inputValue}
            placeholder={placeholder}
            onChange={handleInputChange}
            required={required}
            readOnly={readOnly}
            disabled={disabled}
            className={inputClass}
          />
          {suggestions && (
            <datalist id={`${id}-datalist`}>
              {suggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          )}
          {searchInput && (
            <FontAwesomeIcon
              icon={inputValue ? faTimes : faSearch}
              onClick={inputValue ? clearInput : undefined}
              className={classNames(styles.icon, {
                [styles.clearIcon]: !!inputValue,
                [styles.searchIcon]: !inputValue,
              })}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default InputGroup;
