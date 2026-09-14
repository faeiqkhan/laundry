interface PaginationProps {
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function pageWindow(page: number, totalPages: number): number[] {
  const windowSize = 5;
  const pages: number[] = [];
  let start = Math.max(0, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages - 1, start + windowSize - 1);
  start = Math.max(0, end - windowSize + 1);
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  return pages;
}

export default function Pagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="pagination-bar">
        <span className="pagination-info">{totalElements} results</span>
      </div>
    );
  }

  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(totalElements, (page + 1) * pageSize);

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        {from}–{to} of {totalElements}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        {pageWindow(page, totalPages).map((p) => (
          <button
            key={p}
            type="button"
            className={`btn btn-sm ${p === page ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onPageChange(p)}
          >
            {p + 1}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}