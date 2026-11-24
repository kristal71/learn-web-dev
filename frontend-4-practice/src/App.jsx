import { useState, useEffect, useRef } from "react";
import { fetchToday, fetchSlots } from "./api.js";

// Вспомогательные данные для календаря
const MONTHS_NOMINATIVE = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"
];

const DAYS_OF_WEEK = [
  "Воскресенье", "Понедельник", "Вторник", "Среда",
  "Четверг", "Пятница", "Суббота"
];

// Сравнение двух дат
function compareDates(d1, d2) {
  const date1 = new Date(d1.year, d1.month, d1.day);
  const date2 = new Date(d2.year, d2.month, d2.day);
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
}

// Проверка: дата не раньше «сегодня»
function isDateSelectable(day, month, year, today) {
  if (!today) return false;
  return compareDates({ day, month, year }, today) >= 0;
}

// Построение сетки календаря
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const startDayOfWeek = firstDay.getDay();
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Пн = 0
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = offset - 1; i >= 0; i--) {
    cells.push({
      day: prevMonthLastDay - i,
      month: month - 1,
      year,
      otherMonth: true,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      month,
      year,
      otherMonth: false,
    });
  }

  const totalCells = Math.ceil(cells.length / 7) * 7;
  let nextDay = 1;
  while (cells.length < totalCells) {
    cells.push({
      day: nextDay,
      month: month + 1,
      year,
      otherMonth: true,
    });
    nextDay++;
  }

  return cells;
}

export default function App() {
  // 1. Состояние для «сегодня» (Шаг 1: загрузка при старте)
  const [today, setToday] = useState(null);
  const [isTodayLoading, setIsTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState(null);

  // Календарный просмотр (какой месяц/год сейчас открыт)
  const [currentMonth, setCurrentMonth] = useState(0);
  const [currentYear, setCurrentYear] = useState(2026);

  // Выбранная пользователем дата
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  // 2. Состояние для слотов (Шаг 2: загрузка при клике на день)
  const [slots, setSlots] = useState([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Ref для защиты от гонок ответов сервера (race conditions)
  const activeRequestDateRef = useRef(null);

  // ШАГ 1: Загружаем «сегодня» при открытии страницы
  useEffect(() => {
    let ignore = false;
    setIsTodayLoading(true);
    setTodayError(null);

    fetchToday()
      .then((data) => {
        if (!ignore) {
          setToday(data);
          setCurrentMonth(data.month);
          setCurrentYear(data.year);

          // Сразу выбираем сегодняшний день
          setSelectedDay(data.day);
          setSelectedMonth(data.month);
          setSelectedYear(data.year);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setTodayError(err.message || "Не удалось загрузить данные");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsTodayLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // ШАГ 2: Загружаем слоты при изменении выбранного дня
  useEffect(() => {
    if (selectedDay === null || selectedMonth === null || selectedYear === null) {
      return;
    }

    const requestedDate = {
      day: selectedDay,
      month: selectedMonth,
      year: selectedYear,
    };
    activeRequestDateRef.current = requestedDate;

    let ignore = false;
    setIsSlotsLoading(true);
    setSlotsError(null);
    setSelectedTime(null); // сбрасываем выбранное время при смене даты

    fetchSlots(requestedDate)
      .then((data) => {
        // Защита от гонок: проверяем, что ответ именно от последней выбранной даты
        const current = activeRequestDateRef.current;
        const isSameDate =
          current &&
          current.day === data.date.day &&
          current.month === data.date.month &&
          current.year === data.date.year;

        if (!ignore && isSameDate) {
          setSlots(data.slots || []);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setSlotsError(err.message || "Не удалось загрузить слоты");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsSlotsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedDay, selectedMonth, selectedYear]);

  // Переключение месяцев
  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  }

  // Клик по числу в календаре
  function handleSelectDay(day) {
    if (
      day === selectedDay &&
      currentMonth === selectedMonth &&
      currentYear === selectedYear
    ) {
      return; // тот же день повторно не запрашиваем
    }
    setSelectedDay(day);
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  }

  // Клик по времени
  function handleSelectTime(time) {
    setSelectedTime(time);
  }

  // Кнопка «Далее»
  function handleNextClick() {
    if (!selectedTime) {
      alert("Пожалуйста, выберите подходящее время для записи.");
      return;
    }
    alert(
      `Вы выбрали: ${selectedDay} ${MONTHS_GENITIVE[selectedMonth]} ${selectedYear} в ${selectedTime}`
    );
  }

  const cells = buildCalendarGrid(currentYear, currentMonth);
  const dateObj =
    selectedDay !== null
      ? new Date(selectedYear, selectedMonth, selectedDay)
      : null;
  const dayName = dateObj ? DAYS_OF_WEEK[dateObj.getDay()] : "";
  const monthName = selectedMonth !== null ? MONTHS_GENITIVE[selectedMonth] : "";

  return (
    <div className="page">
      <header className="header">
        <div className="container header__inner">
          <a href="#" className="brand">
            <span className="brand__name">ЛИСТВА</span>
            <span className="brand__desc">САЛОН КРАСОТЫ</span>
          </a>
          <nav className="nav">
            <a href="#" className="nav__link">Услуги</a>
            <a href="#" className="nav__link">Мастера</a>
            <a href="#" className="nav__link">Отзывы</a>
          </nav>
          <a href="tel:+74951204020" className="header__phone">
            +7 (495) 120-40-20
          </a>
        </div>
      </header>

      <section className="stepper-section">
        <div className="container">
          <div className="stepper">
            <div className="step step--done">
              <div className="step__top">
                <span className="step__circle">1</span>
                <span className="step__line"></span>
              </div>
              <span className="step__label">Мастер</span>
            </div>

            <div className="step step--done">
              <div className="step__top">
                <span className="step__circle">2</span>
                <span className="step__line"></span>
              </div>
              <span className="step__label">Услуга</span>
            </div>

            <div className="step step--active">
              <div className="step__top">
                <span className="step__circle">3</span>
                <span className="step__line"></span>
              </div>
              <span className="step__label">Дата и время</span>
            </div>

            <div className="step">
              <div className="step__top">
                <span className="step__circle">4</span>
                <span className="step__line"></span>
              </div>
              <span className="step__label">Контакты</span>
            </div>

            <div className="step step--last">
              <div className="step__top">
                <span className="step__circle">5</span>
              </div>
              <span className="step__label">Подтверждение</span>
            </div>
          </div>
        </div>
      </section>

      <main className="main">
        <div className="container">
          <div className="heading-group">
            <span className="heading-group__step">ШАГ 3 ИЗ 5</span>
            <h1 className="heading-group__title">Выберите дату и время</h1>
            <p className="heading-group__subtitle">
              Выберите удобный день и свободное время для визита
            </p>
          </div>

          {/* СЦЕНАРИЙ 1: Загрузка страницы («Загрузка…») */}
          {isTodayLoading ? (
            <div className="state-message">
              <div className="spinner"></div>
              <p>Загрузка…</p>
            </div>
          ) : todayError ? (
            /* СЦЕНАРИЙ 3: Ошибка сервера при старте */
            <div className="state-message state-message--error">
              <p className="state-message__title">Ошибка загрузки</p>
              <p>{todayError}</p>
              <button
                type="button"
                className="btn btn--next"
                style={{ marginTop: "16px" }}
                onClick={() => window.location.reload()}
              >
                Повторить
              </button>
            </div>
          ) : (
            <>
              <div className="cards-layout">
                {/* Левая карточка — Календарь */}
                <section className="card calendar-card">
                  <div className="calendar-card__header">
                    <button
                      type="button"
                      className="btn-arrow calendar-prev"
                      onClick={handlePrevMonth}
                      aria-label="Предыдущий месяц"
                    >
                      &lt;
                    </button>
                    <h2 className="calendar-card__month">
                      {MONTHS_NOMINATIVE[currentMonth]} {currentYear}
                    </h2>
                    <button
                      type="button"
                      className="btn-arrow calendar-next"
                      onClick={handleNextMonth}
                      aria-label="Следующий месяц"
                    >
                      &gt;
                    </button>
                  </div>

                  <div className="calendar-weekdays">
                    <span>ПН</span>
                    <span>ВТ</span>
                    <span>СР</span>
                    <span>ЧТ</span>
                    <span>ПТ</span>
                    <span>СБ</span>
                    <span>ВС</span>
                  </div>

                  <div className="calendar-days">
                    {cells.map((cell, index) => {
                      const isCurrentViewMonth = !cell.otherMonth;
                      const isSelectable =
                        isCurrentViewMonth &&
                        isDateSelectable(cell.day, currentMonth, currentYear, today);
                      const isSelected =
                        isCurrentViewMonth &&
                        cell.day === selectedDay &&
                        currentMonth === selectedMonth &&
                        currentYear === selectedYear;

                      let className = "day-circle";
                      if (!isSelectable) className += " day-circle--disabled";
                      if (isSelected) className += " day-circle--selected";

                      return (
                        <button
                          key={`${cell.day}-${index}`}
                          type="button"
                          className={className}
                          disabled={!isSelectable}
                          onClick={() => handleSelectDay(cell.day)}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Правая карточка — Слоты времени */}
                <section className="card slots-card">
                  <h2 className="slots-card__title">Свободное время</h2>
                  <div className="slots-card__date">
                    <svg
                      className="slots-card__icon"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="slots-card__date-text">
                      {selectedDay
                        ? `${dayName}, ${selectedDay} ${monthName}${
                            selectedTime ? ` • ${selectedTime}` : ""
                          }`
                        : "Выберите дату"}
                    </span>
                  </div>

                  {/* СЦЕНАРИЙ 2: Индикатор загрузки слотов */}
                  {isSlotsLoading ? (
                    <div className="slots-empty-message">Загрузка слотов…</div>
                  ) : slotsError ? (
                    /* СЦЕНАРИЙ 3: Ошибка слотов */
                    <div className="slots-empty-message slots-error-message">
                      <p>{slotsError}</p>
                    </div>
                  ) : slots && slots.length > 0 ? (
                    <div className="slots-grid">
                      {slots.map((slot) => {
                        const isAvailable = slot.available !== false;
                        let className = "slot-button";
                        if (!isAvailable) className += " slot-button--inactive";
                        if (slot.time === selectedTime)
                          className += " slot-button--selected";

                        return (
                          <button
                            key={slot.time}
                            type="button"
                            className={className}
                            disabled={!isAvailable}
                            onClick={() => handleSelectTime(slot.time)}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="slots-empty-message">
                      На этот день свободных слотов нет
                    </div>
                  )}
                </section>
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="btn btn--back"
                  onClick={() => window.history.back()}
                >
                  &larr; Назад
                </button>
                <button
                  type="button"
                  className="btn btn--next"
                  onClick={handleNextClick}
                >
                  Далее
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer__columns">
            <div className="footer__col">
              <span className="footer__logo">ЛИСТВА</span>
              <p className="footer__text">
                Дружелюбный салон, где мы помогаем ухаживать за волосами и кожей с
                заботой и вниманием к каждому клиенту.
              </p>
            </div>

            <div className="footer__col">
              <h3 className="footer__title">КОНТАКТЫ</h3>
              <div className="footer__entry">
                <svg
                  className="footer__icon"
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Укажите адрес салона</span>
              </div>
              <div className="footer__entry">
                <svg
                  className="footer__icon"
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <a href="tel:+74951204020" className="footer__phone">
                  +7 (495) 120-40-20
                </a>
              </div>
            </div>

            <div className="footer__col">
              <h3 className="footer__title">РЕЖИМ РАБОТЫ</h3>
              <p className="footer__schedule">Пн–Пт: 9:00 – 21:00</p>
              <p className="footer__schedule">Сб–Вс: 10:00 – 19:00</p>
            </div>
          </div>

          <div className="footer__bottom">
            <span>&copy; 2026. Все права защищены.</span>
            <a href="#" className="footer__policy">
              Политика конфиденциальности
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}