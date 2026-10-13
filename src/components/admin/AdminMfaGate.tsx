import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboardSkeleton } from '@/components/skeletons/PageSkeletons';
import { ADMIN_MFA_PATH, hasAdminMfaSession } from '@/lib/adminMfa';

/**
 * Páginas do painel só abrem depois do código de verificação. Sem ele, leva
 * para a tela do código (o banco recusaria tudo de qualquer forma).
 */
const AdminMfaGate = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hasAdminMfaSession().then((ok) => {
      if (cancelled) return;
      if (ok) setVerified(true);
      else navigate(ADMIN_MFA_PATH, { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!verified) return <AdminDashboardSkeleton />;
  return <>{children}</>;
};

export default AdminMfaGate;
