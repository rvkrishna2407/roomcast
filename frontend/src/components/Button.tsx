import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  wide?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  wide = false,
  className = '',
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant}${wide ? ' button-wide' : ''} ${className}`.trim()}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
