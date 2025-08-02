import React from 'react';

const Input = ({ className = '', ...props }) => {
  const baseStyles = "block w-full px-3 py-2 border border-neutral/30 rounded-md shadow-sm placeholder-neutral/50 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-base-100 disabled:opacity-70 disabled:bg-neutral/10";
  
  return (
    <input
      className={`${baseStyles} ${className}`}
      {...props}
    />
  );
};

export default Input;