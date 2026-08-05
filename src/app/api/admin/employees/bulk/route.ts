import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AVATAR_COLORS, ROLES } from "@/lib/constants";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

interface BulkRow {
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
  jobTitle?: string;
}

// GET /api/admin/employees/bulk — download Excel template with bold headers
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "ADMIN" && current.user.role !== "DEVELOPER") return forbidden();

  const headers = ["employeeId", "name", "email", "phone", "password", "role", "jobTitle"];
  const sampleRows: BulkRow[] = [
    { employeeId: "EDU-3001", name: "John Doe", email: "john.doe@edunet.org", phone: "+919811003001", password: "TempPass@123", role: "EMPLOYEE", jobTitle: "Program Manager" },
    { employeeId: "EDU-3002", name: "Jane Smith", email: "jane.smith@edunet.org", phone: "+919811003002", password: "TempPass@123", role: "DEVELOPER", jobTitle: "IT Coordinator" },
  ];

  const wb = XLSX.utils.book_new();
  const data = [headers, ...sampleRows.map((r) => [r.employeeId, r.name, r.email, r.phone, r.password, r.role, r.jobTitle])];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 22 }];
  // Bold header row (white text on teal background)
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0F766E" } }, alignment: { horizontal: "center" } };
    }
  }
  ws["!rows"] = [{ hpt: 24 }];
  XLSX.utils.book_append_sheet(wb, ws, "Employees");

  // Instructions sheet
  const instrWs = XLSX.utils.aoa_to_sheet([
    ["Field", "Required", "Description", "Example"],
    ["employeeId", "Yes", "Unique employee identifier", "EDU-3001"],
    ["name", "Yes", "Full name", "John Doe"],
    ["email", "Yes", "Official Edunet email (must be unique)", "john.doe@edunet.org"],
    ["phone", "No", "Phone with country code", "+919811003001"],
    ["password", "Yes", "Temporary password (min 8 chars)", "TempPass@123"],
    ["role", "No", "EMPLOYEE / DEVELOPER / ADMIN", "EMPLOYEE"],
    ["jobTitle", "No", "Job title", "Program Manager"],
  ]);
  instrWs["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 50 }, { wch: 28 }];
  for (let c = 0; c < 4; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (instrWs[addr]) instrWs[addr].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0F766E" } } };
  }
  XLSX.utils.book_append_sheet(wb, instrWs, "Instructions");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellStyles: true });
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=edunet-employees-template.xlsx",
    },
  });
}

// POST /api/admin/employees/bulk — upload Excel or CSV
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "ADMIN" && current.user.role !== "DEVELOPER") return forbidden();
  const { user } = current;

  const body = await parseBody<{ rows?: BulkRow[]; csv?: string; file?: string }>(request);
  let rows = body?.rows ?? [];

  if (body?.file) {
    try {
      const bytes = Buffer.from(body.file, "base64");
      const wb = XLSX.read(bytes, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      rows = json.map((r) => normalizeRow(r));
    } catch (e: any) {
      return err("Could not parse Excel file: " + e.message, 422, "PARSE_ERROR");
    }
  } else if (body?.csv && rows.length === 0) {
    rows = parseCsv(body.csv);
  }
  if (!rows.length) return err("No rows found in the uploaded file", 422, "VALIDATION");

  const results: { row: number; employeeId: string; status: "created" | "skipped" | "error"; message?: string }[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2;
    if (!r.employeeId || !r.name || !r.email || !r.password) {
      results.push({ row: rowNum, employeeId: r.employeeId || "(missing)", status: "error", message: "Missing required fields (employeeId, name, email, password)" });
      continue;
    }
    try {
      const existing = await db.user.findFirst({
        where: { OR: [{ employeeId: r.employeeId.toUpperCase() }, { email: r.email.toLowerCase() }] },
      });
      if (existing) {
        results.push({ row: rowNum, employeeId: r.employeeId, status: "skipped", message: "Employee ID or email already exists" });
        skipped++;
        continue;
      }
      await db.user.create({
        data: {
          employeeId: r.employeeId.toUpperCase(),
          name: r.name,
          email: r.email.toLowerCase(),
          phone: r.phone || null,
          passwordHash: hashPassword(r.password),
          role: (r.role as keyof typeof ROLES) || "EMPLOYEE",
          jobTitle: r.jobTitle || "Employee",
          avatarColor: colorFor(r.employeeId),
        },
      });
      results.push({ row: rowNum, employeeId: r.employeeId, status: "created" });
      created++;
    } catch (e: any) {
      results.push({ row: rowNum, employeeId: r.employeeId, status: "error", message: e.message || "Unknown error" });
    }
  }

  await audit({ userId: user.id, action: "EMPLOYEES_BULK_UPLOAD", entity: "User", details: { total: rows.length, created, skipped } });
  return ok({ total: rows.length, created, skipped, results });
}

function normalizeRow(r: Record<string, unknown>): BulkRow {
  const get = (k: string) => String(r[k] ?? r[k.toLowerCase()] ?? r[k.replace(/_/g, "").toLowerCase()] ?? "").trim();
  return {
    employeeId: get("employeeId") || get("employeeid"),
    name: get("name"),
    email: get("email"),
    phone: get("phone"),
    password: get("password"),
    role: get("role") || "EMPLOYEE",
    jobTitle: get("jobTitle") || get("jobtitle") || undefined,
  };
}

function parseCsv(csv: string): BulkRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: BulkRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] || "").trim(); });
    rows.push({
      employeeId: row.employeeid || row.employee_id || "",
      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",
      password: row.password || "",
      role: row.role || "EMPLOYEE",
      jobTitle: row.jobtitle || row.job_title || undefined,
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else current += ch;
  }
  cells.push(current);
  return cells;
}
