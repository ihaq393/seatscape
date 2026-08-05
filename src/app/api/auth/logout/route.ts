import { clearSessionCookie, getSession } from "@/lib/auth";
import { ok } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (session) {
    await audit({ userId: session.uid, action: AUDIT_ACTIONS.USER_LOGIN, entity: "User", entityId: session.uid, details: { event: "logout" } });
  }
  await clearSessionCookie();
  return ok({ success: true });
}
