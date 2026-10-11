import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { AuditLogPanel } from '@/components/admin/AuditLogPanel';

describe('Auditoria do painel', () => {
  it('mostra aprovação, repasse e mudanças em empresa com os detalhes', async () => {
    fakeDb.rpcHandlers = {
      get_admin_audit_log: () => ({
        data: [
          { id: '1', admin_id: 'a', admin_name: 'Admin', action: 'approve_psychologist', target_type: 'psychologist', target_id: 'p', target_name: 'Dra. Ana', details: {}, created_at: '2026-10-11T12:00:00Z' },
          { id: '2', admin_id: 'a', admin_name: 'Admin', action: 'confirm_payout', target_type: 'psychologist', target_id: 'p', target_name: 'Dra. Ana', details: { amount: 180, pix_e2e_id: 'E123' }, created_at: '2026-10-11T12:01:00Z' },
          { id: '3', admin_id: 'a', admin_name: 'Admin', action: 'update_organization', target_type: 'organization', target_id: 'o', target_name: 'Empresa', details: { seats: { de: 5, para: 10 } }, created_at: '2026-10-11T12:02:00Z' },
        ],
        error: null,
      }),
    };
    render(<AuditLogPanel />);
    expect((await screen.findAllByText('Aprovou psicólogo')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Confirmou repasse').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alterou empresa').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/seats: 5 → 10/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/E2E: E123/).length).toBeGreaterThan(0);
  });
});
