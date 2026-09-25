import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * The push token registered from THIS device, remembered locally so the
 * toggle can reflect it and so logout can deactivate it — otherwise the next
 * person to log in on a shared device would keep receiving the previous
 * user's SOS alerts.
 */
const STORAGE_KEY = 'soliv-push-token';

export const getStoredPushToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredPushToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the toggle just won't remember.
  }
};

export const saveActivePushToken = async (token: string, deviceInfo: { [key: string]: Json }) => {
  // Via RPC, not a plain upsert: the token identifies the device, and on a
  // device handed to someone else it still belongs to the previous user —
  // RLS would block the new user from taking it over.
  const { error } = await supabase.rpc('register_push_token', { p_token: token, p_device_info: deviceInfo });
  if (error) throw error;
  setStoredPushToken(token);
  return true;
};

/** Marks this device's token inactive. Safe to call when there is none. */
export const deactivateStoredPushToken = async () => {
  const token = getStoredPushToken();
  if (!token) return;
  try {
    await supabase.from('fcm_tokens').update({ is_active: false }).eq('token', token);
  } catch (error) {
    console.error('Error deactivating push token:', error);
  } finally {
    setStoredPushToken(null);
  }
};
