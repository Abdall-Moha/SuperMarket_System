function Pagination({ page, pageSize, total, onPageChange, label }) {
  const pageCount = total <= 0 ? 1 : Math.ceil(total / pageSize);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (total === 0) {
    return null;
  }

  const pages = [];

  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) {
      pages.push(i);
    }
  } else {
    pages.push(page);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-slate-200">
      <p className="text-sm text-slate-500">
        Showing {start}–{end} of {total} {label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={function () {
            onPageChange(page - 1);
          }}
          className="min-h-11 rounded-md border border-slate-200 px-3 py-2 text-sm text-[#07111F] disabled:opacity-40"
        >
          Previous
        </button>
        {pageCount > 7 ? (
          <span className="text-sm text-slate-500">
            Page {page} of {pageCount}
          </span>
        ) : (
          pages.map(function (number) {
            return (
              <button
                key={number}
                type="button"
                onClick={function () {
                  onPageChange(number);
                }}
                className={
                  number === page
                    ? "min-h-11 min-w-11 rounded-md bg-[#1B4F72] px-3 py-2 text-sm text-white"
                    : "min-h-11 min-w-11 rounded-md border border-slate-200 px-3 py-2 text-sm text-[#07111F]"
                }
              >
                {number}
              </button>
            );
          })
        )}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={function () {
            onPageChange(page + 1);
          }}
          className="min-h-11 rounded-md border border-slate-200 px-3 py-2 text-sm text-[#07111F] disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Pagination;
