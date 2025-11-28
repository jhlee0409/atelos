'use client';

import React from 'react';

interface LandingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

const LandingButton: React.FC<LandingButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles =
    'px-6 py-3 font-bold transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

  const variants = {
    primary:
      'bg-red-900 hover:bg-red-800 text-white shadow-[0_0_15px_rgba(127,29,29,0.5)] border border-red-700',
    secondary:
      'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600',
    outline:
      'bg-transparent border border-zinc-500 text-zinc-300 hover:border-zinc-300 hover:text-white hover:bg-zinc-900/50',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default LandingButton;
