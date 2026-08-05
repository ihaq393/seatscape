import { db } from "@/lib/db";
import { ok } from "@/lib/api-helpers";
import { getSettings, getSettingBool } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/customization — public, no auth. Returns editable homepage content + public settings.
export async function GET() {
  let c = await db.customization.findFirst();
  if (!c) {
    c = await db.customization.create({ data: {} });
  }
  const settings = await getSettings();
  return ok({
    heroTitle: c.heroTitle,
    heroSubtitle: c.heroSubtitle,
    heroBadge: c.heroBadge,
    loginLabel: c.loginLabel,
    accentColor: c.accentColor,
    officeOpenTime: c.officeOpenTime,
    officeCloseTime: c.officeCloseTime,
    brandName: c.brandName,
    // Public flags (no sensitive data exposed)
    showBookingTimes: await getSettingBool("SHOW_BOOKING_TIMES_PUBLIC"),
    autoSelectTime: await getSettingBool("AUTO_SELECT_BOOKING_TIME"),
    signupEnabled: await getSettingBool("SIGNUP_ENABLED"),
    defaultCheckIn: settings.DEFAULT_CHECK_IN,
    defaultCheckOut: settings.DEFAULT_CHECK_OUT,
  });
}
