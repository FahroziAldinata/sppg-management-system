import React from 'react';

export function Card({
  children,
  className = '',
  style = {},
  hover = true,
  ...props
}) {
  return (
    <div
      className={`
        ui-card
        ${hover ? 'ui-card--lift' : ''}
        ${className}
      `}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}