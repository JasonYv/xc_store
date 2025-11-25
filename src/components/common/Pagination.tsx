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

  // 生成页码数组，最多显示 7 个页码按钮
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // 如果总页数小于等于最大显示数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总是显示第一页
      pages.push(1);

      if (current <= 4) {
        // 当前页在前面时
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        // 当前页在后面时
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间时
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t rounded-b-lg">
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

        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-gray-500">
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onChange(page as number)}
              className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                current === page
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
              }`}
            >
              {page}
            </button>
          );
        })}

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