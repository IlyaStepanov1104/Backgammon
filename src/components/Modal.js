'use client';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'sm:max-w-lg'
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 opacity-75" 
          onClick={onClose}
          aria-hidden="true"
        ></div>

        {/* Центрирующий элемент для вертикального выравнивания */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal */}
        <div className={`inline-flex align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${maxWidth} sm:w-full relative z-50 p-4 sm:p-6 flex-col gap-4`}>
          {/* Header */}
          {title && (
            <div className="bg-white">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
            </div>
          )}

          {/* Content */}
          <div className={`bg-white`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="sm:flex sm:flex-row-reverse gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
