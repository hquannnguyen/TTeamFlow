import { ReactNode } from 'react';
import logo from '../../../assets/logo.png';

interface AuthCardProps {
  heading: string;
  subheading: string;
  children: ReactNode;
}

export function AuthCard({ heading, subheading, children }: AuthCardProps) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <img
            src={logo}
            alt="TTeamFlow logo"
            className="auth-logo-img"
          />
        </div>

        <h1 className="auth-heading">{heading}</h1>
        <p className="auth-sub">{subheading}</p>

        {children}
      </div>
    </div>
  );
}
