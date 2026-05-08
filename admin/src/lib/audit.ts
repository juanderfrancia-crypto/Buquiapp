import { createClient } from './supabase';

export async function logAdminAction(
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>
) {
  try {
    const supabase = createClient();
    await supabase.rpc('log_admin_action', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_details: details ?? {},
    });
  } catch {
    // El log no debe interrumpir la operación principal
  }
}
