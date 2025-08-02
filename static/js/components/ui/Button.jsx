import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  as: Component = 'button',
  disabled = false,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: 'bg-primary text-primary-content hover:bg-primary-focus focus:ring-primary border border-primary-focus/60 active:bg-primary-focus/90',
    secondary: 'bg-neutral/20 text-base-content hover:bg-neutral/30 focus:ring-neutral',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    ghost: 'bg-transparent text-primary hover:bg-primary/10 focus:ring-primary',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const componentProps = { ...props };
  if (Component === 'button' && !componentProps.type) {
    componentProps.type = 'button';
  }

  return (
    <Component
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...componentProps}
    >
      {leftIcon && <span className={`inline-flex items-center ${children ? 'mr-2 -ml-0.5' : ''} h-5 w-5`}>{leftIcon}</span>}
      {children}
      {rightIcon && <span className={`inline-flex items-center ${children ? 'ml-2 -mr-0.5' : ''} h-5 w-5`}>{rightIcon}</span>}
    </Component>
  );
};

export default Button;