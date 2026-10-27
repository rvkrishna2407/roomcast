import type { InputHTMLAttributes } from 'react';

interface InputboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

export default function Inputbox({ label, id, ...inputProps }: InputboxProps) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...inputProps} />
    </>
  );
}
