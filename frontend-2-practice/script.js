const SERVER_DATA = {
  today: { day: 17, month: 9, year: 2026 },
  slotsEven: [
    { time: "09:00", available: true, isLight: false },
    { time: "10:30", available: true, isLight: true },
    { time: "12:00", available: true, isLight: false },
    { time: "13:30", available: true, isLight: true },
    { time: "15:00", available: true, isLight: false },
    { time: "16:30", available: true, isLight: true },
    { time: "18:00", available: true, isLight: false },
    { time: "19:30", available: true, isLight: true },
  ],
  slotsOdd: [
    { time: "09:00", available: true, isLight: false },
    { time: "10:30", available: true, isLight: true },
    { time: "12:00", available: true, isLight: false },
    { time: "13:30", available: true, isLight: false },
    { time: "15:00", available: true, isLight: false },
    { time: "16:30", available: true, isLight: true },
    { time: "18:00", available: true, isLight: false },
    { time: "19:30", available: true, isLight: true },
  ],
};

const MONTHS_NOMINATIVE = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const DAYS_OF_WEEK = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

const BOOKING_STATE = {
  currentMonth: 9,
  currentYear: 2026,
  selectedDay: 21,
  selectedMonth: 9,
  selectedYear: 2026,
  selectedTime: "13:30",
};

function compareDates(date1, date2) {
  const d1 = new Date(date1.year, date1.month, date1.day);
  const d2 = new Date(date2.year, date2.month, date2.day);
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

function isDateSelectable(day, month, year) {
  const today = SERVER_DATA.today;
  return compareDates({ day, month, year }, today) >= 0;
}

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const startDayOfWeek = firstDay.getDay();
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = offset - 1; i >= 0; i--) {
    cells.push({
      day: prevMonthLastDay - i,
      month: month - 1,
      year: year,
      otherMonth: true,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      month: month,
      year: year,
      otherMonth: false,
    });
  }

  const totalCells = Math.ceil(cells.length / 7) * 7;
  let nextDay = 1;
  while (cells.length < totalCells) {
    cells.push({
      day: nextDay,
      month: month + 1,
      year: year,
      otherMonth: true,
    });
    nextDay++;
  }

  return cells;
}

function getSlotsForDay(day) {
  return day % 2 === 0 ? SERVER_DATA.slotsEven : SERVER_DATA.slotsOdd;
}

function renderCalendar() {
  const monthTitle = document.querySelector(".calendar-card__month");
  const daysContainer = document.querySelector(".calendar-days");

  const year = BOOKING_STATE.currentYear;
  const month = BOOKING_STATE.currentMonth;

  monthTitle.textContent = `${MONTHS_NOMINATIVE[month]} ${year}`;

  const cells = buildCalendarGrid(year, month);
  let html = "";

  cells.forEach((cell) => {
    let classes = "day-circle";
    let disabledAttr = "";

    const isCurrentViewMonth = !cell.otherMonth;
    const isSelectable = isCurrentViewMonth && isDateSelectable(cell.day, month, year);

    if (!isSelectable) {
      classes += " day-circle--disabled";
      disabledAttr = "disabled";
    }

    const isSelected =
      isCurrentViewMonth &&
      cell.day === BOOKING_STATE.selectedDay &&
      month === BOOKING_STATE.selectedMonth &&
      year === BOOKING_STATE.selectedYear;

    if (isSelected) {
      classes += " day-circle--selected";
    }

    html += `<button type="button" class="${classes}" data-day="${cell.day}" ${disabledAttr}>${cell.day}</button>`;
  });

  daysContainer.innerHTML = html;

  const selectableDayButtons = daysContainer.querySelectorAll(".day-circle:not([disabled])");
  selectableDayButtons.forEach((btn) => {
    btn.addEventListener("click", onDayClick);
  });
}

function renderTimeSlots() {
  const slotsGrid = document.querySelector(".slots-grid");
  const slots = getSlotsForDay(BOOKING_STATE.selectedDay);

  if (!slots || slots.length === 0) {
    slotsGrid.innerHTML = '<div class="slots-empty-message">На этот день свободных слотов нет</div>';
    return;
  }

  let html = "";
  slots.forEach((slot) => {
    let classes = "slot-button";
    if (slot.isLight) {
      classes += " slot-button--inactive";
    }
    if (slot.time === BOOKING_STATE.selectedTime) {
      classes += " slot-button--selected";
    }

    html += `<button type="button" class="${classes}" data-time="${slot.time}">${slot.time}</button>`;
  });

  slotsGrid.innerHTML = html;

  const slotButtons = slotsGrid.querySelectorAll(".slot-button");
  slotButtons.forEach((btn) => {
    btn.addEventListener("click", onTimeSlotClick);
  });
}

function updateDateHeader() {
  const dateTextEl = document.querySelector(".slots-card__date-text");
  const day = BOOKING_STATE.selectedDay;
  const month = BOOKING_STATE.selectedMonth;
  const year = BOOKING_STATE.selectedYear;

  const dateObj = new Date(year, month, day);
  const dayName = DAYS_OF_WEEK[dateObj.getDay()];
  const monthName = MONTHS_GENITIVE[month];

  if (BOOKING_STATE.selectedTime) {
    dateTextEl.textContent = `${dayName}, ${day} ${monthName} • ${BOOKING_STATE.selectedTime}`;
  } else {
    dateTextEl.textContent = `${dayName}, ${day} ${monthName}`;
  }
}

function onDayClick(event) {
  const clickedDay = parseInt(event.currentTarget.dataset.day, 10);

  BOOKING_STATE.selectedDay = clickedDay;
  BOOKING_STATE.selectedMonth = BOOKING_STATE.currentMonth;
  BOOKING_STATE.selectedYear = BOOKING_STATE.currentYear;
  BOOKING_STATE.selectedTime = null;

  renderCalendar();
  renderTimeSlots();
  updateDateHeader();
}

function onTimeSlotClick(event) {
  const selectedTime = event.currentTarget.dataset.time;
  BOOKING_STATE.selectedTime = selectedTime;

  renderTimeSlots();
  updateDateHeader();
}

function setupMonthNavigation() {
  const prevBtn = document.querySelector(".calendar-prev");
  const nextBtn = document.querySelector(".calendar-next");

  prevBtn.addEventListener("click", () => {
    BOOKING_STATE.currentMonth -= 1;
    if (BOOKING_STATE.currentMonth < 0) {
      BOOKING_STATE.currentMonth = 11;
      BOOKING_STATE.currentYear -= 1;
    }
    renderCalendar();
  });

  nextBtn.addEventListener("click", () => {
    BOOKING_STATE.currentMonth += 1;
    if (BOOKING_STATE.currentMonth > 11) {
      BOOKING_STATE.currentMonth = 0;
      BOOKING_STATE.currentYear += 1;
    }
    renderCalendar();
  });
}

function setupActions() {
  const backBtn = document.querySelector(".btn--back");
  const nextBtn = document.querySelector(".btn--next");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!BOOKING_STATE.selectedTime) {
        alert("Пожалуйста, выберите подходящее время для записи.");
        return;
      }

      const bookingInfo = {
        day: BOOKING_STATE.selectedDay,
        month: BOOKING_STATE.selectedMonth,
        year: BOOKING_STATE.selectedYear,
        time: BOOKING_STATE.selectedTime,
      };

      try {
        localStorage.setItem("selectedBookingDateTime", JSON.stringify(bookingInfo));
      } catch (e) {}

      alert(`Вы выбрали: ${BOOKING_STATE.selectedDay} ${MONTHS_GENITIVE[BOOKING_STATE.selectedMonth]} ${BOOKING_STATE.selectedYear} в ${BOOKING_STATE.selectedTime}`);
    });
  }
}

function init() {
  renderCalendar();
  renderTimeSlots();
  updateDateHeader();
  setupMonthNavigation();
  setupActions();
}

document.addEventListener("DOMContentLoaded", init);