export function matchesDateFilter(dateValue, dateFilter, customStart, customEnd) {
  if (!dateFilter || dateFilter === "all") {
    return true;
  }

  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);

  if (isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  if (dateFilter === "today") {
    return date >= startOfToday && date < startOfTomorrow;
  }

  if (dateFilter === "yesterday") {
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    return date >= startOfYesterday && date < startOfToday;
  }

  if (dateFilter === "week") {
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    return date >= startOfWeek;
  }

  if (dateFilter === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= startOfMonth;
  }

  if (dateFilter === "custom") {
    if (!customStart && !customEnd) {
      return true;
    }

    const start = customStart ? new Date(customStart + "T00:00:00") : null;
    const end = customEnd
      ? new Date(customEnd + "T23:59:59.999")
      : customStart
        ? new Date(customStart + "T23:59:59.999")
        : null;

    if (start && date < start) {
      return false;
    }

    if (end && date > end) {
      return false;
    }

    return true;
  }

  return true;
}

export function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(total, pageSize) {
  if (total <= 0) {
    return 1;
  }

  return Math.ceil(total / pageSize);
}
