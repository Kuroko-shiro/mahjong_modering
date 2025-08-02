import React from 'react';

const Select = ({ className = '', children, ...props }) => {
  const baseStyles = "block w-full pl-3 pr-10 py-2 text-base border-neutral/30 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-base-100 disabled:opacity-70 disabled:bg-neutral/10";

  return React.createElement('select', {
    className: `${baseStyles} ${className}`,
    ...props
  }, children);
};

export default Select;