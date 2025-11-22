interface PaginationProps {
  total: number;
  pageSize: number;
  current: number;
  onChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function Pagination({ total, pageSize, current, onChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const pageSizeOptions = [10, 20, 50];

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
      <div className="flex items-center">
        <span className="text-sm text-gray-700">
          每页显示
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="ml-2 px-2 py-1 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size} className="text-gray-900">
              {size}
            </option>
          ))}
        </select>
        <span className="ml-4 text-sm text-gray-700">
          共 {total} 条
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          className={`px-3 py-1 text-sm border rounded-md transition-colors ${
            current === 1
              ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
          }`}
        >
          上一页
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`px-3 py-1 text-sm border rounded-md transition-colors ${
              current === page
                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onChange(current + 1)}
          disabled={current === totalPages}
          className={`px-3 py-1 text-sm border rounded-md transition-colors ${
            current === totalPages
              ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
          }`}
        >
          下一页
        </button>
      </div>
    </div>
  );
} 