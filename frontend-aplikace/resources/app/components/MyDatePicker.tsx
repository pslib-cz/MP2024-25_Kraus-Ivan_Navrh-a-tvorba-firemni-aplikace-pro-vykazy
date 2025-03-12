import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { cs } from 'date-fns/locale';
import { format, parse, isValid } from 'date-fns';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from '@/components/MyDatePicker.module.scss';
import 'react-datepicker/dist/react-datepicker.css';

// Registrace české lokalizace pro knihovnu react-datepicker
registerLocale('cs', cs);

// Interface pro MyDatePicker komponentu
interface MyDatePickerProps {
  selectedDate: Date | string | null;
  onDateChange: (date: Date | null) => void;
  dateFormat?: string;
  placeholderText?: string;
  required?: boolean;
  maxDate?: Date;
  enableDragAndDrop?: boolean;
}

// Pokusné parsování data z různých formátů
const parseDate = (
  input: string | Date | null,
  formatString: string = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
) => {
  if (input instanceof Date) {
    return input;
  }

  if (typeof input === 'string') {
    const parsedDate = parse(input, formatString, new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }

    const alternativeParsedDate = parse(input, 'dd.MM.yyyy', new Date());
    if (isValid(alternativeParsedDate)) {
      return alternativeParsedDate;
    }
  }

  return null;
};

const MyDatePicker: React.FC<MyDatePickerProps> = ({
  selectedDate,
  onDateChange,
  dateFormat = 'dd. MM. yyyy',
  placeholderText = 'Vybrat datum',
  required = false,
  maxDate = undefined,
  enableDragAndDrop = false,
}) => {


  const parsedDate = parseDate(selectedDate);

  // Drag and drop handler pro začátek přetahování
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (parsedDate) {
      e.dataTransfer.setData('text/plain', parsedDate.toISOString());
    }
  };

  // Drag and drop handler pro upuštění
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedDateString = e.dataTransfer.getData('text/plain');
    if (!droppedDateString) return;
    try {
      const droppedDate = new Date(droppedDateString);
      if (isValid(droppedDate)) {
        onDateChange(droppedDate);
      }
    } catch (err) {
      console.error('Neplatný formát data:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div
      className={styles.datePickerWrapper}
      draggable={!!(enableDragAndDrop && parsedDate)}
      onDragStart={enableDragAndDrop ? handleDragStart : undefined}
      onDrop={enableDragAndDrop ? handleDrop : undefined}
      onDragOver={enableDragAndDrop ? handleDragOver : undefined}
    >
      <DatePicker
        selected={parsedDate}
        onChange={(date) => onDateChange(date)}
        locale="cs"
        maxDate={maxDate}
        isClearable
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className={styles.customHeader}>
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              className={styles.navButton}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <span>{format(date, 'LLLL yyyy', { locale: cs })}</span>
            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              className={styles.navButton}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}
        className={styles.customDatepickerInput}
        popperClassName={styles.customDatepickerPopper}
        dateFormat={dateFormat}
        placeholderText={placeholderText}
        required={required}
        popperPlacement="bottom-start"
      />
    </div>
  );
};

export default MyDatePicker;
