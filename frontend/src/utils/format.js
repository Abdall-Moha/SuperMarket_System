export function formatMoney(value) {
  return (
    "$" +
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function recordedByName(record) {
  if (record && record.createdBy && record.createdBy.name) {
    return record.createdBy.name;
  }

  return "—";
}

export function recordedById(record) {
  if (!record || !record.createdBy) {
    return "";
  }

  if (typeof record.createdBy === "object") {
    return String(record.createdBy._id || record.createdBy.id || "");
  }

  return String(record.createdBy);
}

export function uniqueRecordedBy(records) {
  const seen = {};
  const list = [];

  for (let i = 0; i < records.length; i++) {
    const id = recordedById(records[i]);
    const name = recordedByName(records[i]);

    if (!id || name === "—" || seen[id]) {
      continue;
    }

    seen[id] = true;
    list.push({
      id: id,
      name: name,
    });
  }

  return list;
}

export function paymentMethodLabel(method) {
  if (method === "cash") {
    return "Cash";
  }

  if (method === "evc") {
    return "EVC";
  }

  if (method === "edahab") {
    return "Edahab";
  }

  if (method === "bank") {
    return "Bank";
  }

  if (method === "credit") {
    return "Credit";
  }

  return method || "—";
}

export function saleProfit(sale) {
  let total = 0;
  const items = sale.items || [];

  for (let i = 0; i < items.length; i++) {
    total = total + (items[i].profit || 0);
  }

  return total;
}

export const PAGE_SIZE = 10;
