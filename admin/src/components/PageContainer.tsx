interface Breadcrumb {
  label: string;
  href: string;
}

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

export default function PageContainer({
  children,
  title,
  subtitle,
  description,
  breadcrumbs,
  actions,
  className = "",
}: PageContainerProps) {
  // Use description as fallback for subtitle if subtitle isn't provided
  const displaySubtitle = subtitle || description;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-1 sm:space-x-3">
            {breadcrumbs.map((breadcrumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="h-3 w-3 flex-shrink-0 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="m5.555 17.776 4-16 .894.448-4 16-.894-.448z" />
                  </svg>
                )}
                <a
                  href={breadcrumb.href}
                  className={`ml-1 text-sm font-medium sm:ml-3 ${
                    index === breadcrumbs.length - 1
                      ? "text-gray-500 cursor-default"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                  aria-current={
                    index === breadcrumbs.length - 1 ? "page" : undefined
                  }
                >
                  {breadcrumb.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Page Header */}
      {(title || displaySubtitle || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {title && (
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            )}
            {displaySubtitle && (
              <p className="mt-1 text-sm text-gray-500">{displaySubtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}

      {/* Page Content */}
      {children}
    </div>
  );
}
