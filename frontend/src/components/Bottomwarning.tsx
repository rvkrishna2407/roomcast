import { Link } from 'react-router-dom';

interface BottomwarningProps {
  label: string;
  buttonText: string;
  to: string;
}

export default function Bottomwarning({
  label,
  buttonText,
  to,
}: BottomwarningProps) {
  return (
    <p className="auth-switch">
      {label} <Link className="text-button" to={to}>{buttonText}</Link>
    </p>
  );
}
