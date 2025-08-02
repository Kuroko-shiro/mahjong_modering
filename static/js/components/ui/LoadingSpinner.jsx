import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '', message }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-[6px]',
  };

  return React.createElement('div', { className: `flex flex-col items-center justify-center ${className}` },
    React.createElement('div', {
      className: `${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`,
      role: "status",
      'aria-live': "polite",
      'aria-label': message || "Loading..."
    }),
    message && React.createElement('p', { className: "mt-2 text-sm text-neutral" }, message)
  );
};

export default LoadingSpinner;