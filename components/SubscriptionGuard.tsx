import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { canAccessFeature } from '../services/subscriptionAccessService';
import { AccessDenied } from './AccessDenied';

interface SubscriptionGuardProps {
  user: UserProfile | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectToPricing?: boolean;
  onNavigateToPricing?: () => void;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  user,
  children,
  fallback,
  redirectToPricing = true,
  onNavigateToPricing,
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setChecking(false);
        return;
      }

      setChecking(true);
      const access = await canAccessFeature(user);
      setHasAccess(access);
      setChecking(false);
    };

    checkAccess();
  }, [user]);

  // Show loading state while checking
  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Checking access...</p>
        </div>
      </div>
    );
  }

  // If access denied, show fallback or AccessDenied component
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (redirectToPricing) {
      return <AccessDenied onNavigateToPricing={onNavigateToPricing} />;
    }

    return <AccessDenied onNavigateToPricing={onNavigateToPricing} />;
  }

  // User has access, render children
  return <>{children}</>;
};

