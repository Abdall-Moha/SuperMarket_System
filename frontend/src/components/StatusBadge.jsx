function StatusBadge({ status }) {
  const value = (status || "").toLowerCase();
  let classes = "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600";
  let label = status || "—";

  if (value === "paid") {
    classes = "inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700";
    label = "Paid";
  }

  if (value === "partial") {
    classes = "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700";
    label = "Partial";
  }

  if (value === "unpaid") {
    classes = "inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700";
    label = "Unpaid";
  }

  if (value === "customer") {
    classes = "inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800";
    label = "Customer";
  }

  if (value === "supplier") {
    classes = "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700";
    label = "Supplier";
  }

  return <span className={classes}>{label}</span>;
}

export default StatusBadge;
