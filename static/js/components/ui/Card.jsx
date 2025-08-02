import React from 'react';

const Card = ({ children, className = '', onClick }) => {
  const baseClasses = "bg-base-100 shadow-lg rounded-lg overflow-hidden";
  const clickableClasses = onClick ? "cursor-pointer hover:shadow-xl transition-shadow duration-200" : "";

  return (
    <div className={`${baseClasses} ${clickableClasses} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;