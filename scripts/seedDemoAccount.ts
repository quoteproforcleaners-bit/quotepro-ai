/**
 * Sprint 18 — Pristine Home Cleaning Demo Seed
 * Run: npx ts-node scripts/seedDemoAccount.ts [--force]
 */

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function uuid(): string {
  return crypto.randomUUID();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3600_000);
}

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60_000);
}

function setTime(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Ensure a date falls on Mon–Sat (skip Sunday)
function nextWeekday(date: Date): Date {
  const d = new Date(date);
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

function jitter(base: number, range = 15): number {
  return base + Math.floor(Math.random() * range * 2) - range;
}

const TEAM_NAMES = ["Maria Santos", "Destiny Williams", "Rosa Gutierrez", "Jasmine Taylor"];
function pickTeamMember(employeeIds: string[]): string[] {
  const r = Math.random();
  if (r < 0.40) return [employeeIds[0]]; // Maria 40%
  if (r < 0.65) return [employeeIds[1]]; // Destiny 25%
  if (r < 0.90) return [employeeIds[2]]; // Rosa 25%
  return [employeeIds[3]];               // Jasmine 10%
}

const JOB_NOTES = [
  "Key under mat — lock deadbolt on way out",
  "Dog crated in laundry room",
  "Focus extra time on master bath",
  "Client will be home — she works from home on Fridays",
  "Add baseboards to this visit — been 3 months",
  "New area rug in living room — use attachment only",
  "Alarm code: 4821 — arm on exit",
  "Cat in bedroom — keep door closed",
  "Use unscented products only",
  "Back door unlocked — text when done",
  "Focus on kitchen — hosted a party last weekend",
  "Kids home from school at 3pm",
  "Side gate code: 2244",
  "Ring doorbell on arrival",
  "Tip left on kitchen counter",
];

async function main() {
  const forceReseed = process.argv.includes("--force");

  console.log("🌱 Sprint 18 — Pristine Home Cleaning Demo Seed");
  console.log("─────────────────────────────────────────────────");

  const client = await pool.connect();

  try {
    // ── Check for existing seed ──────────────────────────────
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      ["demo@pristinehomecleaning.com"]
    );

    let userId: string;
    let businessId: string;

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      const existingBiz = await client.query(
        "SELECT id FROM businesses WHERE owner_user_id = $1",
        [userId]
      );
      businessId = existingBiz.rows[0]?.id;

      if (!forceReseed) {
        const custCount = await client.query(
          "SELECT COUNT(*) FROM customers WHERE business_id = $1",
          [businessId]
        );
        if (parseInt(custCount.rows[0].count) > 10) {
          console.log("⚠️  Demo account already seeded. Use --force to reseed.");
          return;
        }
      } else {
        console.log("🔄 --force flag detected — wiping existing demo data...");
        await client.query("DELETE FROM campaigns WHERE business_id = $1", [businessId]);
        await client.query("DELETE FROM review_requests WHERE business_id = $1", [businessId]);
        await client.query("DELETE FROM growth_tasks WHERE business_id = $1", [businessId]);
        await client.query("DELETE FROM jobs WHERE business_id = $1", [businessId]);
        await client.query("DELETE FROM quotes WHERE business_id = $1", [businessId]);
        await client.query("DELETE FROM employees WHERE business_id = $1", [businessId]);
        await client.query("DELETE FROM customers WHERE business_id = $1", [businessId]);
        await client.query("DELETE FROM growth_automation_settings WHERE business_id = $1", [businessId]);
        await client.query("DELETE FROM sales_strategy_settings WHERE business_id = $1", [businessId]);
        await client.query("DELETE FROM pricing_settings WHERE business_id = $1", [businessId]);
        console.log("   ✓ Existing data cleared");
      }
    } else {
      // ── Create user ──────────────────────────────────────────
      console.log("👤 Creating demo user...");
      const passwordHash = await bcrypt.hash("PristineDemo2026!", 12);
      userId = uuid();
      await client.query(
        `INSERT INTO users (id, email, name, password_hash, auth_provider, subscription_tier,
          subscription_expires_at, subscription_started_at, subscription_platform,
          terms_accepted_at, ai_consent_accepted_at, consent_version, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'email','pro', $5, $6,'web', NOW(), NOW(),'1.0', NOW(), NOW())`,
        [
          userId,
          "demo@pristinehomecleaning.com",
          "Ashley Donovan",
          passwordHash,
          daysFromNow(365),
          monthsAgo(8),
        ]
      );
    }

    // Ensure Pro subscription is active
    await client.query(
      `UPDATE users SET subscription_tier='pro', subscription_expires_at=$1,
       stripe_subscription_status='active', subscription_started_at=$2
       WHERE id=$3`,
      [daysFromNow(365), monthsAgo(8), userId]
    );
    console.log(`   ✓ User ID: ${userId}`);

    // ── Create / update business ─────────────────────────────
    const existingBiz2 = await client.query(
      "SELECT id FROM businesses WHERE owner_user_id = $1",
      [userId]
    );

    if (existingBiz2.rows.length === 0) {
      businessId = uuid();
      const slug = "pristine-home-cleaning-" + businessId.slice(0, 8);
      await client.query(
        `INSERT INTO businesses (id, owner_user_id, company_name, email, phone, address,
          sender_name, primary_color, onboarding_complete, public_quote_slug, public_quote_enabled,
          created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,true,NOW(),NOW())`,
        [
          businessId, userId,
          "Pristine Home Cleaning",
          "ashley@pristinehomecleaning.com",
          "(610) 555-0142",
          "247 Lancaster Ave, Wayne, PA 19087",
          "Ashley",
          "#1E40AF",
          slug,
        ]
      );
    } else {
      businessId = existingBiz2.rows[0].id;
      await client.query(
        `UPDATE businesses SET company_name=$1, email=$2, phone=$3, address=$4,
          sender_name=$5, primary_color=$6, onboarding_complete=true, updated_at=NOW()
         WHERE id=$7`,
        [
          "Pristine Home Cleaning",
          "ashley@pristinehomecleaning.com",
          "(610) 555-0142",
          "247 Lancaster Ave, Wayne, PA 19087",
          "Ashley",
          "#1E40AF",
          businessId,
        ]
      );
    }
    console.log(`   ✓ Business ID: ${businessId}`);

    // ── Pricing settings ─────────────────────────────────────
    const pricingSettings = {
      hourlyRate: 52,
      minimumTicket: 120,
      taxRate: 0,
      frequencyDiscounts: { weekly: 20, biweekly: 15, monthly: 10 },
      serviceTypes: [
        { id: "standard", name: "Standard Clean", multiplier: 1.00, isDefault: true },
        { id: "deep", name: "Deep Clean", multiplier: 1.85 },
        { id: "moveinout", name: "Move In/Move Out", multiplier: 2.20 },
        { id: "postconstruct", name: "Post Construction", multiplier: 2.80 },
        { id: "airbnb", name: "Airbnb Turnover", multiplier: 0.75 },
      ],
      addOns: [
        { key: "insideFridge", label: "Inside Fridge", price: 35 },
        { key: "insideOven", label: "Inside Oven", price: 35 },
        { key: "insideCabinets", label: "Inside Cabinets", price: 50 },
        { key: "interiorWindows", label: "Interior Windows", price: 45 },
        { key: "blindsDetail", label: "Blinds Detail", price: 30 },
        { key: "baseboardsDetail", label: "Baseboards Detail", price: 40 },
        { key: "laundryFoldOnly", label: "Laundry & Fold", price: 30 },
        { key: "dishes", label: "Dishes", price: 25 },
        { key: "organizationTidy", label: "Organization & Tidy", price: 60 },
      ],
      pricePerSqft: 0.085,
      pricePerBedroom: 15,
      pricePerBathroom: 18,
    };

    await client.query(
      `INSERT INTO pricing_settings (id, business_id, settings, created_at, updated_at)
       VALUES ($1,$2,$3,NOW(),NOW())
       ON CONFLICT (business_id) DO UPDATE SET settings=$3, updated_at=NOW()`,
      [uuid(), businessId, JSON.stringify(pricingSettings)]
    ).catch(() =>
      client.query(
        `DELETE FROM pricing_settings WHERE business_id=$1`,
        [businessId]
      ).then(() =>
        client.query(
          `INSERT INTO pricing_settings (id, business_id, settings, created_at, updated_at)
           VALUES ($1,$2,$3,NOW(),NOW())`,
          [uuid(), businessId, JSON.stringify(pricingSettings)]
        )
      )
    );
    console.log("   ✓ Pricing settings configured");

    // ── Employees ─────────────────────────────────────────────
    console.log("👥 Creating team members...");
    const empIds: Record<string, string> = {};
    const employees = [
      { key: "ashley", name: "Ashley Donovan", role: "Owner/Operator", phone: "(610) 555-0142", email: "ashley@pristinehomecleaning.com", status: "active", monthsAgo: 8, color: "#1E40AF" },
      { key: "maria",  name: "Maria Santos",   role: "Lead Cleaner",   phone: "(610) 555-0198", email: "maria@pristinehomecleaning.com",  status: "active", monthsAgo: 7, notes: "Most experienced cleaner, handles deep cleans and move-outs", color: "#7C3AED" },
      { key: "destiny",name: "Destiny Williams",role: "Cleaner",       phone: "(610) 555-0231", status: "active", monthsAgo: 5, color: "#059669" },
      { key: "rosa",   name: "Rosa Gutierrez", role: "Cleaner",        phone: "(610) 555-0274", status: "active", monthsAgo: 4, notes: "Speaks Spanish, great with pets", color: "#D97706" },
      { key: "jasmine",name: "Jasmine Taylor", role: "Cleaner",        phone: "(610) 555-0312", status: "active", monthsAgo: 2, notes: "Still in training period", color: "#EC4899" },
      { key: "brittany",name:"Brittany Chen",  role: "Cleaner",        phone: "(610) 555-0356", status: "inactive", monthsAgo: 6, notes: "Left for full-time position elsewhere", color: "#6B7280" },
    ];

    for (const emp of employees) {
      const id = uuid();
      empIds[emp.key] = id;
      await client.query(
        `INSERT INTO employees (id, business_id, name, phone, email, role, status, notes, color, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
        [id, businessId, emp.name, emp.phone, emp.email || "", emp.role, emp.status,
         emp.notes || "", emp.color, monthsAgo(emp.monthsAgo)]
      );
    }
    console.log(`   ✓ ${employees.length} team members created`);

    // Team member IDs array (exclude Ashley for job assignment, exclude Brittany inactive)
    const activeEmpIds = [empIds.maria, empIds.destiny, empIds.rosa, empIds.jasmine];

    // ── Customers ─────────────────────────────────────────────
    console.log("👥 Creating customers...");

    interface CustomerDef {
      key: string;
      firstName: string;
      lastName: string;
      address: string;
      phone: string;
      email?: string;
      tags: string[];
      notes?: string;
      avgTicket: number;
      status: string;
      isVip?: boolean;
      frequency?: "biweekly" | "monthly" | "weekly" | "one-time";
      lastJobDate?: Date;
      createdMonthsAgo?: number;
    }

    const customerDefs: CustomerDef[] = [
      // BIWEEKLY (1-18)
      { key:"c1",  firstName:"Sarah",      lastName:"Mitchell",  address:"504 Chestnut Hill Rd, Villanova PA 19085",       phone:"(610) 555-1001", email:"smitchell@gmail.com",       tags:["VIP","Biweekly"],     notes:"Has 2 dogs. Key under mat. Prefers mornings. Tip always $20.",              avgTicket:185, status:"active", isVip:true,  frequency:"biweekly", createdMonthsAgo:8 },
      { key:"c2",  firstName:"James",      lastName:"Hoffman",   address:"38 Berkley Rd, Devon PA 19333",                  phone:"(610) 555-1002", email:"jhoffman@comcast.net",       tags:["Biweekly","Referral"],notes:"3 kids, very messy. Add 30 min to scheduled time. Pays by Venmo.",          avgTicket:225, status:"active", frequency:"biweekly", createdMonthsAgo:7 },
      { key:"c3",  firstName:"Patricia",   lastName:"Nguyen",    address:"892 County Line Rd, Bryn Mawr PA 19010",          phone:"(610) 555-1003", email:"pnguyen@yahoo.com",          tags:["Biweekly","VIP"],     notes:"Retired. Always home during clean. Loves to chat. Very particular about baseboards.", avgTicket:165, status:"active", isVip:true, frequency:"biweekly", createdMonthsAgo:8 },
      { key:"c4",  firstName:"Robert",     lastName:"Chen",      address:"15 Fox Hollow Lane, Malvern PA 19355",            phone:"(610) 555-1004", email:"rchen@gmail.com",            tags:["Biweekly"],           notes:"Both WFH. Clean home office too. Has a cat — Rosa prefers this one.",        avgTicket:210, status:"active", frequency:"biweekly", createdMonthsAgo:7 },
      { key:"c5",  firstName:"Amanda",     lastName:"Kowalski",  address:"271 Montgomery Ave, Haverford PA 19041",          phone:"(610) 555-1005", email:"akowalski@outlook.com",      tags:["Biweekly","Referral"],notes:"Referred by Sarah Mitchell. Allergic to strong scents — use unscented products only.", avgTicket:175, status:"active", frequency:"biweekly", createdMonthsAgo:6 },
      { key:"c6",  firstName:"Thomas",     lastName:"Burke",     address:"44 Sugartown Rd, Berwyn PA 19312",                phone:"(610) 555-1006", email:"tburke@gmail.com",           tags:["Biweekly"],           avgTicket:240, status:"active", frequency:"biweekly", createdMonthsAgo:7 },
      { key:"c7",  firstName:"Jennifer",   lastName:"Walsh",     address:"617 Old Eagle School Rd, Wayne PA 19087",        phone:"(610) 555-1007", email:"jwalsh@gmail.com",           tags:["Biweekly","VIP"],     notes:"Executive. Very neat home. Tip always $30. Send reminder day before.",       avgTicket:195, status:"active", isVip:true, frequency:"biweekly", createdMonthsAgo:8 },
      { key:"c8",  firstName:"Michael",    lastName:"Thompson",  address:"83 Waterloo Rd, Devon PA 19333",                 phone:"(610) 555-1008", email:"mthompson@comcast.net",      tags:["Biweekly"],           avgTicket:220, status:"active", frequency:"biweekly", createdMonthsAgo:6 },
      { key:"c9",  firstName:"Kathleen",   lastName:"Donahue",   address:"355 Conestoga Rd, Berwyn PA 19312",              phone:"(610) 555-1009", email:"kdonahue@gmail.com",         tags:["Biweekly"],           notes:"Elderly, very appreciative. Lives alone. Always has coffee ready.",          avgTicket:155, status:"active", frequency:"biweekly", createdMonthsAgo:8 },
      { key:"c10", firstName:"David",      lastName:"Patel",     address:"129 Darby Creek Rd, Newtown Square PA 19073",    phone:"(610) 555-1010", email:"dpatel@gmail.com",           tags:["Biweekly","Referral"],avgTicket:200, status:"active", frequency:"biweekly", createdMonthsAgo:5 },
      { key:"c11", firstName:"Susan",      lastName:"Caldwell",  address:"488 Old Lancaster Rd, Haverford PA 19041",       phone:"(610) 555-1011", email:"scaldwell@yahoo.com",        tags:["Biweekly"],           notes:"2 cats. Extra time for pet hair.",                                           avgTicket:180, status:"active", frequency:"biweekly", createdMonthsAgo:7 },
      { key:"c12", firstName:"Brian",      lastName:"Murphy",    address:"72 Beaumont Rd, Devon PA 19333",                 phone:"(610) 555-1012", email:"bmurphy@gmail.com",          tags:["Biweekly"],           avgTicket:215, status:"active", frequency:"biweekly", createdMonthsAgo:6 },
      { key:"c13", firstName:"Lisa",       lastName:"Greenbaum", address:"941 Penllyn Pike, Blue Bell PA 19422",           phone:"(610) 555-1013", email:"lgreenbaum@gmail.com",       tags:["Biweekly","VIP"],     notes:"Interior designer. Very high standards. Always inspects after. Worth keeping happy.", avgTicket:260, status:"active", isVip:true, frequency:"biweekly", createdMonthsAgo:7 },
      { key:"c14", firstName:"Christopher",lastName:"Hayes",     address:"204 Sproul Rd, Villanova PA 19085",              phone:"(610) 555-1014", email:"chayes@comcast.net",         tags:["Biweekly"],           avgTicket:170, status:"active", frequency:"biweekly", createdMonthsAgo:5 },
      { key:"c15", firstName:"Nancy",      lastName:"DiSantis",  address:"567 Boot Rd, Downingtown PA 19335",              phone:"(610) 555-1015", email:"ndisantis@outlook.com",      tags:["Biweekly"],           avgTicket:190, status:"active", frequency:"biweekly", createdMonthsAgo:6 },
      { key:"c16", firstName:"Rachel",     lastName:"Kim",       address:"33 Louella Ave, Wayne PA 19087",                 phone:"(610) 555-1016", email:"rkim@gmail.com",             tags:["Biweekly","Referral"],avgTicket:165, status:"active", frequency:"biweekly", createdMonthsAgo:5 },
      { key:"c17", firstName:"Steven",     lastName:"Whitman",   address:"718 Swedesford Rd, Berwyn PA 19312",             phone:"(610) 555-1017", email:"swhitman@gmail.com",         tags:["Biweekly"],           avgTicket:235, status:"active", frequency:"biweekly", createdMonthsAgo:7 },
      { key:"c18", firstName:"Diane",      lastName:"Obrien",    address:"156 Summit Ave, Malvern PA 19355",               phone:"(610) 555-1018", email:"dobrien@yahoo.com",          tags:["Biweekly"],           notes:"Recently divorced, new to managing home alone. Very loyal client.",          avgTicket:175, status:"active", frequency:"biweekly", createdMonthsAgo:4 },
      // MONTHLY (19-30)
      { key:"c19", firstName:"Andrew",     lastName:"Foster",    address:"892 Upper Gulph Rd, Wayne PA 19087",             phone:"(610) 555-1019", email:"afoster@gmail.com",          tags:["Monthly"],            avgTicket:280, status:"active", frequency:"monthly", createdMonthsAgo:7 },
      { key:"c20", firstName:"Karen",      lastName:"Silverman", address:"245 W Lancaster Ave, Paoli PA 19301",            phone:"(610) 555-1020", email:"ksilverman@comcast.net",     tags:["Monthly"],            avgTicket:225, status:"active", frequency:"monthly", createdMonthsAgo:6 },
      { key:"c21", firstName:"Mark",       lastName:"Antonelli", address:"57 Hathaway Lane, Villanova PA 19085",           phone:"(610) 555-1021", email:"mantonelli@gmail.com",       tags:["Monthly"],            avgTicket:310, status:"active", frequency:"monthly", createdMonthsAgo:7 },
      { key:"c22", firstName:"Dorothy",    lastName:"Fernandez", address:"380 Meeting House Rd, Berwyn PA 19312",          phone:"(610) 555-1022",                                     tags:["Monthly","Elderly"],  avgTicket:160, status:"active", frequency:"monthly", createdMonthsAgo:8 },
      { key:"c23", firstName:"Ryan",       lastName:"Park",      address:"614 Tredyffrin Rd, Strafford PA 19087",          phone:"(610) 555-1023", email:"rpark@gmail.com",            tags:["Monthly"],            avgTicket:255, status:"active", frequency:"monthly", createdMonthsAgo:5 },
      { key:"c24", firstName:"Gloria",     lastName:"Washington",address:"129 Sproul Rd, Bryn Mawr PA 19010",              phone:"(610) 555-1024",                                     tags:["Monthly"],            avgTicket:185, status:"active", frequency:"monthly", createdMonthsAgo:6 },
      { key:"c25", firstName:"Timothy",    lastName:"Long",      address:"47 Woodland Ave, Wayne PA 19087",                phone:"(610) 555-1025", email:"tlong@outlook.com",          tags:["Monthly"],            avgTicket:290, status:"active", frequency:"monthly", createdMonthsAgo:7 },
      { key:"c26", firstName:"Melissa",    lastName:"Oconnor",   address:"783 Conestoga Rd, Berwyn PA 19312",              phone:"(610) 555-1026", email:"moconnor@gmail.com",         tags:["Monthly","Referral"], avgTicket:210, status:"active", frequency:"monthly", createdMonthsAgo:5 },
      { key:"c27", firstName:"Harold",     lastName:"Fischer",   address:"22 Robin Hood Rd, Wayne PA 19087",               phone:"(610) 555-1027",                                     tags:["Monthly","Elderly"],  avgTicket:175, status:"active", frequency:"monthly", createdMonthsAgo:7 },
      { key:"c28", firstName:"Alicia",     lastName:"Monroe",    address:"491 Old Gulph Rd, Villanova PA 19085",           phone:"(610) 555-1028", email:"amonroe@gmail.com",          tags:["Monthly"],            avgTicket:220, status:"active", frequency:"monthly", createdMonthsAgo:4 },
      { key:"c29", firstName:"George",     lastName:"Hartwell",  address:"316 Catfish Lane, Malvern PA 19355",             phone:"(610) 555-1029",                                     tags:["Monthly"],            avgTicket:265, status:"active", frequency:"monthly", createdMonthsAgo:6 },
      { key:"c30", firstName:"Irene",      lastName:"Castellano",address:"58 Academy Rd, Glenside PA 19038",               phone:"(610) 555-1030", email:"icastellano@yahoo.com",      tags:["Monthly"],            avgTicket:195, status:"active", frequency:"monthly", createdMonthsAgo:5 },
      // ONE-TIME (31-40)
      { key:"c31", firstName:"Kevin",      lastName:"Branigan",  address:"847 Lancaster Ave, Berwyn PA 19312",             phone:"(610) 555-1031", email:"kbranigan@gmail.com",        tags:["One-Time","MoveOut"], avgTicket:520, status:"inactive",frequency:"one-time", lastJobDate:daysAgo(90),  createdMonthsAgo:3 },
      { key:"c32", firstName:"Samantha",   lastName:"Cruz",      address:"234 Forest Rd, Narberth PA 19072",               phone:"(610) 555-1032", email:"scruz@gmail.com",            tags:["One-Time"],           notes:"Said she'd call back for regular service but hasn't yet. Good candidate for reactivation.", avgTicket:285, status:"inactive",frequency:"one-time", lastJobDate:daysAgo(120), createdMonthsAgo:4 },
      { key:"c33", firstName:"Daniel",     lastName:"Fitzpatrick",address:"19 Mill Rd, Exton PA 19341",                    phone:"(610) 555-1033", email:"dfitzpatrick@gmail.com",     tags:["One-Time","PostConstruct"],avgTicket:650, status:"inactive",frequency:"one-time", lastJobDate:daysAgo(60),  createdMonthsAgo:2 },
      { key:"c34", firstName:"Emma",       lastName:"Johansson", address:"445 W Wayne Ave, Wayne PA 19087",               phone:"(610) 555-1034", email:"ejohansson@gmail.com",       tags:["One-Time"],           avgTicket:285, status:"inactive",frequency:"one-time", lastJobDate:daysAgo(150), createdMonthsAgo:5 },
      { key:"c35", firstName:"Phillip",    lastName:"Garrett",   address:"273 Gulph Mills Rd, King of Prussia PA 19406",   phone:"(610) 555-1035",                                     tags:["One-Time","MoveOut"], avgTicket:580, status:"inactive",frequency:"one-time", lastJobDate:daysAgo(180), createdMonthsAgo:6 },
      { key:"c36", firstName:"Monica",     lastName:"Reyes",     address:"67 S Wayne Ave, Wayne PA 19087",                 phone:"(610) 555-1036", email:"mreyes@gmail.com",           tags:["One-Time","Lead"],    notes:"Came in via Lead Link. Quote sent, no response yet.",                        avgTicket:165, status:"lead",    frequency:"one-time", createdMonthsAgo:0 },
      { key:"c37", firstName:"Charles",    lastName:"Park",      address:"334 Glenhardie Rd, Wayne PA 19087",              phone:"(610) 555-1037", email:"cpark@gmail.com",            tags:["One-Time"],           notes:"Dormant — good reactivation candidate",                                     avgTicket:195, status:"inactive",frequency:"one-time", lastJobDate:daysAgo(210), createdMonthsAgo:7 },
      { key:"c38", firstName:"Heather",    lastName:"Simmons",   address:"781 Lancaster Ave, Malvern PA 19355",            phone:"(610) 555-1038", email:"hsimmons@gmail.com",         tags:["Lead"],               notes:"Requested quote via website. Waiting on response.",                         avgTicket:285, status:"lead",    frequency:"one-time", createdMonthsAgo:0 },
      { key:"c39", firstName:"Anthony",    lastName:"Greco",     address:"156 Paoli Pike, Paoli PA 19301",                 phone:"(610) 555-1039",                                     tags:["One-Time"],           avgTicket:195, status:"inactive",frequency:"one-time", lastJobDate:daysAgo(120), createdMonthsAgo:4 },
      { key:"c40", firstName:"Catherine",  lastName:"Duffy",     address:"892 Cathcart Rd, Blue Bell PA 19422",            phone:"(610) 555-1040", email:"cduffy@outlook.com",         tags:["One-Time","Referral"],notes:"Referred by Jennifer Walsh. Did one deep clean, never rebooked.",            avgTicket:275, status:"inactive",frequency:"one-time", lastJobDate:daysAgo(90),  createdMonthsAgo:3 },
      // COMMERCIAL (41-47)
      { key:"c41", firstName:"Greenfield", lastName:"Pediatrics",address:"425 Lancaster Ave, Wayne PA 19087",              phone:"(610) 555-1041", email:"office@greenfield-peds.com", tags:["Commercial","Weekly","VIP"],  notes:"Medical office. Weekly clean. Must use hospital-grade products. Early morning only — before 7am.", avgTicket:385, status:"active", isVip:true, frequency:"weekly", createdMonthsAgo:7 },
      { key:"c42", firstName:"Main Line",  lastName:"Yoga Studio",address:"88 W Lancaster Ave, Paoli PA 19301",           phone:"(610) 555-1042", email:"info@mainlineyoga.com",      tags:["Commercial","Weekly"],        notes:"Clean hardwood floors with specific product only. After 8pm preferred.",             avgTicket:275, status:"active", frequency:"weekly", createdMonthsAgo:6 },
      { key:"c43", firstName:"Strafford",  lastName:"Realty Group",address:"214 E Lancaster Ave, Paoli PA 19301",         phone:"(610) 555-1043", email:"facilities@straffordrealty.com",tags:["Commercial","Biweekly"],   notes:"Office cleaning. 3 suites. Has own cleaning supplies.",                             avgTicket:320, status:"active", frequency:"biweekly", createdMonthsAgo:5 },
      { key:"c44", firstName:"Devon",      lastName:"Dental Associates",address:"571 Lancaster Ave, Devon PA 19333",       phone:"(610) 555-1044",                                     tags:["Commercial","Weekly"],        avgTicket:420, status:"active", frequency:"weekly", createdMonthsAgo:6 },
      { key:"c45", firstName:"Berwyn",     lastName:"Athletic Club",address:"33 Waterloo Rd, Berwyn PA 19312",             phone:"(610) 555-1045", email:"manager@berwynathleticclub.com",tags:["Commercial","Weekly"],     notes:"Locker rooms + lobby. 2 cleaners required.",                                       avgTicket:510, status:"active", frequency:"weekly", createdMonthsAgo:7 },
      { key:"c46", firstName:"The Covered Bridge",lastName:"Inn",address:"124 Bridge Rd, Phoenixville PA 19460",          phone:"(610) 555-1046", email:"host@coveredbridgeinn.com",  tags:["Commercial","Airbnb","OnDemand"],notes:"Airbnb host. Calls for turnover cleans 1-3 days before checkout. Flexible but urgent.", avgTicket:195, status:"active", frequency:"one-time", createdMonthsAgo:4 },
      { key:"c47", firstName:"Valley Forge",lastName:"Chiropractic",address:"892 DeKalb Pike, Blue Bell PA 19422",        phone:"(610) 555-1047", email:"admin@vfchiro.com",           tags:["Commercial","Monthly"],       avgTicket:340, status:"active", frequency:"monthly", createdMonthsAgo:5 },
    ];

    const custIds: Record<string, string> = {};
    for (const c of customerDefs) {
      const id = uuid();
      custIds[c.key] = id;
      const createdAt = monthsAgo(c.createdMonthsAgo ?? 4);
      await client.query(
        `INSERT INTO customers (id, business_id, first_name, last_name, phone, email, address, notes, tags, status, is_vip, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)`,
        [id, businessId, c.firstName, c.lastName, c.phone || "", c.email || "", c.address || "",
         c.notes || "", JSON.stringify(c.tags), c.status, c.isVip || false, createdAt]
      );
    }
    console.log(`   ✓ ${customerDefs.length} customers created`);

    // ── Quotes ─────────────────────────────────────────────────
    console.log("📋 Creating quotes...");
    const quoteIds: Record<string, string> = {};

    // Helper: create a quote
    async function createQuote(params: {
      key?: string;
      customerId: string;
      status: string;
      total: number;
      frequency?: string;
      beds?: number;
      baths?: number;
      sqft?: number;
      cleaningType?: string;
      notes?: string;
      createdAt?: Date;
      sentAt?: Date;
      acceptedAt?: Date;
      declinedAt?: Date;
    }) {
      const id = uuid();
      if (params.key) quoteIds[params.key] = id;
      const tot = jitter(params.total, 12);
      const createdAt = params.createdAt || daysAgo(30);
      const sentAt = params.sentAt || (params.status !== "draft" ? new Date(createdAt.getTime() + 3600_000) : null);
      const acceptedAt = params.status === "accepted" ? new Date((sentAt || createdAt).getTime() + 86400_000 * 2) : null;
      const declinedAt = params.status === "declined" ? new Date((sentAt || createdAt).getTime() + 86400_000 * 3) : null;
      const expiresAt  = params.status === "expired"  ? daysAgo(5) : (params.status === "sent" ? daysFromNow(14) : null);
      await client.query(
        `INSERT INTO quotes (id, business_id, customer_id, property_beds, property_baths, property_sqft,
           frequency_selected, total, subtotal, tax, status, sent_at, accepted_at, declined_at, expires_at,
           public_token, ai_notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,$12,$13,$14,$15,$16,$17,$17)`,
        [id, businessId, params.customerId, params.beds || 3, params.baths || 2, params.sqft || 1400,
         params.frequency || "one-time", tot, tot, params.status,
         sentAt, acceptedAt, declinedAt, expiresAt,
         crypto.randomBytes(16).toString("hex"),
         params.notes || null, createdAt]
      );
      return id;
    }

    // Initial accepted quotes for all recurring customers (1-30)
    const biweeklyKeys = ["c1","c2","c3","c4","c5","c6","c7","c8","c9","c10","c11","c12","c13","c14","c15","c16","c17","c18"];
    const monthlyKeys  = ["c19","c20","c21","c22","c23","c24","c25","c26","c27","c28","c29","c30"];

    for (const key of biweeklyKeys) {
      const c = customerDefs.find(x => x.key === key)!;
      await createQuote({ key: `q_${key}`, customerId: custIds[key], status: "accepted", total: c.avgTicket, frequency: "biweekly", createdAt: monthsAgo(c.createdMonthsAgo ?? 6) });
    }
    for (const key of monthlyKeys) {
      const c = customerDefs.find(x => x.key === key)!;
      await createQuote({ key: `q_${key}`, customerId: custIds[key], status: "accepted", total: c.avgTicket, frequency: "monthly", createdAt: monthsAgo(c.createdMonthsAgo ?? 5) });
    }

    // One-time customers
    await createQuote({ key:"q_c31", customerId:custIds.c31, status:"accepted", total:520, frequency:"one-time", createdAt:daysAgo(95),  beds:4, baths:2.5 });
    await createQuote({ key:"q_c32", customerId:custIds.c32, status:"accepted", total:285, frequency:"one-time", createdAt:daysAgo(125), beds:3, baths:2 });
    // Daniel Fitzpatrick — big move out
    await createQuote({ key:"q_c33", customerId:custIds.c33, status:"accepted", total:650, frequency:"one-time", createdAt:daysAgo(65),  beds:5, baths:3, notes:"Big job — post-reno move out" });
    await createQuote({ key:"q_c34", customerId:custIds.c34, status:"accepted", total:285, frequency:"one-time", createdAt:daysAgo(155), beds:3, baths:2 });
    await createQuote({ key:"q_c35", customerId:custIds.c35, status:"accepted", total:580, frequency:"one-time", createdAt:daysAgo(185), beds:4, baths:3 });
    // Monica Reyes — sent 5 days ago
    await createQuote({ key:"q_c36", customerId:custIds.c36, status:"sent",     total:165, frequency:"one-time", createdAt:daysAgo(6),   sentAt:daysAgo(5),  beds:3, baths:2,   notes:"Came in via Lead Link" });
    await createQuote({ key:"q_c37", customerId:custIds.c37, status:"accepted", total:195, frequency:"one-time", createdAt:daysAgo(215) });
    // Heather Simmons — sent 8 days ago
    await createQuote({ key:"q_c38", customerId:custIds.c38, status:"sent",     total:285, frequency:"one-time", createdAt:daysAgo(9),   sentAt:daysAgo(8),  beds:3, baths:2.5 });
    // Anthony Greco — declined
    await createQuote({ key:"q_c39", customerId:custIds.c39, status:"declined", total:195, frequency:"one-time", createdAt:daysAgo(125), notes:"Said price was too high. Went with a competitor." });
    // Catherine Duffy — sent 3 days ago (pitch biweekly)
    await createQuote({ key:"q_c40", customerId:custIds.c40, status:"sent",     total:175, frequency:"biweekly", createdAt:daysAgo(4),   sentAt:daysAgo(3),  beds:3, baths:2,   notes:"Follow up — she did one deep clean, pitch biweekly recurring" });

    // Commercial quotes
    await createQuote({ key:"q_c41", customerId:custIds.c41, status:"accepted", total:385, frequency:"weekly",    createdAt:monthsAgo(7), beds:0, baths:4, sqft:3200 });
    await createQuote({ key:"q_c42", customerId:custIds.c42, status:"accepted", total:275, frequency:"weekly",    createdAt:monthsAgo(6), beds:0, baths:2, sqft:2800 });
    await createQuote({ key:"q_c43", customerId:custIds.c43, status:"accepted", total:320, frequency:"biweekly",  createdAt:monthsAgo(5) });
    await createQuote({ key:"q_c44", customerId:custIds.c44, status:"accepted", total:420, frequency:"weekly",    createdAt:monthsAgo(6) });
    // Berwyn Athletic Club — large sent quote 2 days ago
    await createQuote({ key:"q_c45", customerId:custIds.c45, status:"sent",     total:510, frequency:"weekly",    createdAt:daysAgo(3),   sentAt:daysAgo(2),  beds:0, baths:8, sqft:8000, notes:"Upgrade from monthly to weekly — big win if we close this" });
    // Also an accepted one for history
    await createQuote({ key:"q_c45b",customerId:custIds.c45, status:"accepted", total:510, frequency:"monthly",   createdAt:monthsAgo(7) });
    await createQuote({ key:"q_c46", customerId:custIds.c46, status:"accepted", total:195, frequency:"one-time",  createdAt:monthsAgo(4) });
    await createQuote({ key:"q_c47", customerId:custIds.c47, status:"accepted", total:340, frequency:"monthly",   createdAt:monthsAgo(5) });

    // Additional sent/expired/draft quotes to hit the 89 target
    const extraSentCusts = ["c1","c3","c7","c13","c19","c21"];
    for (const key of extraSentCusts) {
      const c = customerDefs.find(x => x.key === key)!;
      await createQuote({ customerId:custIds[key], status:"sent", total:c.avgTicket * 1.85, frequency:"one-time", createdAt:daysAgo(7), sentAt:daysAgo(6), notes:"Annual deep clean upgrade" });
    }
    const expiredCusts = ["c2","c4","c8","c11","c20","c23","c25","c29","c43"];
    for (const key of expiredCusts) {
      const c = customerDefs.find(x => x.key === key)!;
      await createQuote({ customerId:custIds[key], status:"expired", total:c.avgTicket, frequency:"one-time", createdAt:daysAgo(60), sentAt:daysAgo(59) });
    }
    const draftCusts = ["c5","c9","c14","c16","c24","c28"];
    for (const key of draftCusts) {
      const c = customerDefs.find(x => x.key === key)!;
      await createQuote({ customerId:custIds[key], status:"draft", total:c.avgTicket, frequency:"biweekly", createdAt:daysAgo(3) });
    }
    const declinedExtra = ["c15","c17","c26","c30","c39","c34"];
    for (const key of declinedExtra) {
      const c = customerDefs.find(x => x.key === key)!;
      await createQuote({ customerId:custIds[key], status:"declined", total:c.avgTicket * 2.2, frequency:"one-time", createdAt:daysAgo(100), notes:"Price sensitivity — move out estimate" });
    }
    console.log(`   ✓ Quotes created`);

    // ── Jobs ────────────────────────────────────────────────────
    console.log("🏠 Creating jobs...");
    let jobCount = 0;

    async function createJob(params: {
      customerId: string;
      quoteId?: string;
      jobType?: string;
      status: string;
      startDatetime: Date;
      endDatetime?: Date;
      recurrence?: string;
      address: string;
      total: number;
      assigneeIds?: string[];
      internalNotes?: string;
      completedAt?: Date;
      satisfactionRating?: number;
      ratingComment?: string;
      detailedStatus?: string;
      startedAt?: Date;
    }) {
      const id = uuid();
      const end = params.endDatetime || new Date(params.startDatetime.getTime() + 2.5 * 3600_000);
      const noteIdx = Math.floor(Math.random() * JOB_NOTES.length);
      const note = params.internalNotes || JOB_NOTES[noteIdx];
      const teamMembers = params.assigneeIds
        ? params.assigneeIds.map(empId => ({ id: empId }))
        : pickTeamMember(activeEmpIds).map(empId => ({ id: empId }));

      await client.query(
        `INSERT INTO jobs (id, business_id, customer_id, quote_id, job_type, status, start_datetime, end_datetime,
           recurrence, internal_notes, address, total, team_members, satisfaction_rating, rating_comment,
           completed_at, detailed_status, started_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)`,
        [id, businessId, params.customerId, params.quoteId || null,
         params.jobType || "standard", params.status,
         params.startDatetime, end,
         params.recurrence || "one-time", note, params.address,
         jitter(params.total, 10),
         JSON.stringify(teamMembers),
         params.satisfactionRating || null, params.ratingComment || null,
         params.completedAt || (params.status === "completed" ? end : null),
         params.detailedStatus || "",
         params.startedAt || null,
         params.startDatetime]
      );
      jobCount++;
      return id;
    }

    const completedJobIds: Record<string, string> = {};

    // Today's jobs
    const todayStart = setTime(new Date(), 9, 0);
    const jenniferJobId = await createJob({
      customerId: custIds.c7,
      quoteId: quoteIds["q_c7"],
      jobType: "standard",
      status: "in_progress",
      detailedStatus: "service_started",
      startDatetime: todayStart,
      address: "617 Old Eagle School Rd, Wayne PA 19087",
      total: 195,
      assigneeIds: [empIds.maria],
      internalNotes: "Executive. Very neat home. Tip always $30.",
      startedAt: todayStart,
    });
    completedJobIds.jennifer = jenniferJobId;

    // Patricia Nguyen — completed 10 minutes ago
    const patriciaDone = minutesAgo(10);
    const patriciaJobId = await createJob({
      customerId: custIds.c3,
      quoteId: quoteIds["q_c3"],
      jobType: "standard",
      status: "completed",
      startDatetime: new Date(patriciaDone.getTime() - 2.5 * 3600_000),
      completedAt: patriciaDone,
      address: "892 County Line Rd, Bryn Mawr PA 19010",
      total: 165,
      assigneeIds: [empIds.rosa],
      internalNotes: "Very particular about baseboards. Always home.",
      satisfactionRating: 5,
      ratingComment: "Rosa was wonderful as always!",
    });
    completedJobIds.patricia = patriciaJobId;

    // Tomorrow's jobs
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    await createJob({ customerId:custIds.c1,  status:"scheduled", startDatetime:setTime(tomorrow,10,0), address:"504 Chestnut Hill Rd, Villanova PA 19085", total:185, assigneeIds:[empIds.maria], recurrence:"biweekly" });
    await createJob({ customerId:custIds.c41, status:"scheduled", startDatetime:setTime(tomorrow,6,30), address:"425 Lancaster Ave, Wayne PA 19087", total:385, assigneeIds:[empIds.maria, empIds.rosa], recurrence:"weekly", internalNotes:"Medical office — must use hospital-grade products. Before 7am." });
    await createJob({ customerId:custIds.c4,  status:"scheduled", startDatetime:setTime(tomorrow,13,0), address:"15 Fox Hollow Lane, Malvern PA 19355", total:210, assigneeIds:[empIds.destiny], recurrence:"biweekly" });

    // Generate historical jobs for biweekly recurring customers (customers 1-18, ~16 jobs each)
    for (const key of biweeklyKeys) {
      const c = customerDefs.find(x => x.key === key)!;
      const monthsBack = c.createdMonthsAgo || 6;
      const numJobs = Math.min(monthsBack * 2, 16);
      for (let i = numJobs; i >= 1; i--) {
        const daysBack = i * 14 + Math.floor(Math.random() * 2);
        const jobDate = nextWeekday(daysAgo(daysBack));
        const hour = 8 + Math.floor(Math.random() * 5);
        await createJob({
          customerId: custIds[key],
          quoteId: quoteIds[`q_${key}`],
          status: "completed",
          startDatetime: setTime(jobDate, hour),
          address: c.address,
          total: c.avgTicket,
          recurrence: "biweekly",
          completedAt: new Date(setTime(jobDate, hour).getTime() + 2.5 * 3600_000),
        });
      }
    }

    // Generate historical jobs for monthly customers (customers 19-30, ~8 jobs each)
    for (const key of monthlyKeys) {
      const c = customerDefs.find(x => x.key === key)!;
      const monthsBack = c.createdMonthsAgo || 5;
      const numJobs = Math.min(monthsBack, 8);
      for (let i = numJobs; i >= 1; i--) {
        const daysBack = i * 30 + Math.floor(Math.random() * 3);
        const jobDate = nextWeekday(daysAgo(daysBack));
        const hour = 9 + Math.floor(Math.random() * 5);
        await createJob({
          customerId: custIds[key],
          quoteId: quoteIds[`q_${key}`],
          status: "completed",
          startDatetime: setTime(jobDate, hour),
          address: c.address,
          total: c.avgTicket,
          recurrence: "monthly",
          completedAt: new Date(setTime(jobDate, hour).getTime() + 3 * 3600_000),
        });
      }
    }

    // Commercial weekly clients — jobs
    const weeklyCommercial = [
      { key:"c41", addr:"425 Lancaster Ave, Wayne PA 19087",          total:385, empId:empIds.ashley },
      { key:"c42", addr:"88 W Lancaster Ave, Paoli PA 19301",          total:275, empId:empIds.maria },
      { key:"c44", addr:"571 Lancaster Ave, Devon PA 19333",           total:420, empId:empIds.destiny },
      { key:"c45", addr:"33 Waterloo Rd, Berwyn PA 19312",             total:510, empId:empIds.ashley },
    ];
    for (const wc of weeklyCommercial) {
      for (let i = 28; i >= 1; i--) {
        const daysBack = i * 7;
        const jobDate = nextWeekday(daysAgo(daysBack));
        await createJob({
          customerId: custIds[wc.key],
          status: "completed",
          startDatetime: setTime(jobDate, 7),
          address: wc.addr,
          total: wc.total,
          recurrence: "weekly",
          assigneeIds: [wc.empId],
          completedAt: new Date(setTime(jobDate, 7).getTime() + 2 * 3600_000),
        });
      }
    }

    // Biweekly commercial (c43)
    for (let i = 16; i >= 1; i--) {
      const jobDate = nextWeekday(daysAgo(i * 14));
      await createJob({ customerId:custIds.c43, status:"completed", startDatetime:setTime(jobDate,8), address:"214 E Lancaster Ave, Paoli PA 19301", total:320, recurrence:"biweekly", completedAt:new Date(setTime(jobDate,8).getTime() + 2 * 3600_000) });
    }

    // One-time past jobs for inactive customers
    const oneTimeJobs: [string, string, number, Date][] = [
      ["c31","847 Lancaster Ave, Berwyn PA 19312",    520, daysAgo(90)],
      ["c32","234 Forest Rd, Narberth PA 19072",      285, daysAgo(120)],
      ["c33","19 Mill Rd, Exton PA 19341",            650, daysAgo(60)],
      ["c34","445 W Wayne Ave, Wayne PA 19087",       285, daysAgo(150)],
      ["c35","273 Gulph Mills Rd, King of Prussia",   580, daysAgo(180)],
      ["c37","334 Glenhardie Rd, Wayne PA 19087",     195, daysAgo(210)],
      ["c39","156 Paoli Pike, Paoli PA 19301",        195, daysAgo(120)],
      ["c40","892 Cathcart Rd, Blue Bell PA 19422",   275, daysAgo(90)],
      ["c46","124 Bridge Rd, Phoenixville PA 19460",  195, daysAgo(45)],
    ];
    for (const [key, addr, total, date] of oneTimeJobs) {
      const jobDate = nextWeekday(date);
      const completedJobId = await createJob({ customerId:custIds[key], status:"completed", startDatetime:setTime(jobDate,10), address:addr, total, completedAt:new Date(setTime(jobDate,10).getTime() + 3 * 3600_000) });
      completedJobIds[key] = completedJobId;
    }

    // Monthly c47
    for (let i = 5; i >= 1; i--) {
      const jobDate = nextWeekday(daysAgo(i * 30));
      await createJob({ customerId:custIds.c47, status:"completed", startDatetime:setTime(jobDate,9), address:"892 DeKalb Pike, Blue Bell PA 19422", total:340, recurrence:"monthly", completedAt:new Date(setTime(jobDate,9).getTime() + 2.5 * 3600_000) });
    }

    // Future scheduled jobs for next 4 weeks (active recurring customers)
    const upcomingBiweekly = ["c1","c2","c4","c5","c6","c7","c8","c10","c11","c12","c13","c15","c16","c17","c18"];
    for (const key of upcomingBiweekly) {
      const c = customerDefs.find(x => x.key === key)!;
      for (const daysOut of [14, 28]) {
        const jobDate = nextWeekday(daysFromNow(daysOut));
        await createJob({ customerId:custIds[key], status:"scheduled", startDatetime:setTime(jobDate, 9 + Math.floor(Math.random()*4)), address:c.address, total:c.avgTicket, recurrence:"biweekly" });
      }
    }
    for (const key of ["c19","c21","c23","c25","c26","c28","c29","c30"]) {
      const c = customerDefs.find(x => x.key === key)!;
      const jobDate = nextWeekday(daysFromNow(15 + Math.floor(Math.random()*10)));
      await createJob({ customerId:custIds[key], status:"scheduled", startDatetime:setTime(jobDate, 10), address:c.address, total:c.avgTicket, recurrence:"monthly" });
    }

    console.log(`   ✓ ${jobCount} jobs created`);

    // ── Growth Tasks ────────────────────────────────────────────
    console.log("✅ Creating growth tasks...");

    async function createTask(params: {
      customerId?: string;
      quoteId?: string;
      jobId?: string;
      type: string;
      status: string;
      dueAt: Date;
      priority: number;
      estimatedValue: number;
      message?: string;
      metadata?: Record<string, unknown>;
    }) {
      await client.query(
        `INSERT INTO growth_tasks (id, business_id, customer_id, quote_id, job_id, type, status,
           due_at, priority, estimated_value, message, metadata, escalation_stage, max_escalation,
           created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1,4,NOW(),NOW())`,
        [uuid(), businessId, params.customerId || null, params.quoteId || null, params.jobId || null,
         params.type, params.status, params.dueAt, params.priority, params.estimatedValue,
         params.message || null, JSON.stringify(params.metadata || {})]
      );
    }

    const today = new Date();

    // OVERDUE (7 tasks)
    await createTask({ customerId:custIds.c36, quoteId:quoteIds.q_c36, type:"quote_follow_up",   status:"pending", dueAt:daysAgo(3),  priority:92, estimatedValue:165, message:"Follow up on quote — no response after 5 days", metadata:{ customerName:"Monica Reyes" } });
    await createTask({ customerId:custIds.c38, quoteId:quoteIds.q_c38, type:"quote_follow_up",   status:"pending", dueAt:daysAgo(5),  priority:88, estimatedValue:285, message:"Follow up on deep clean quote — 8 days with no reply", metadata:{ customerName:"Heather Simmons" } });
    await createTask({ customerId:custIds.c3,  jobId:patriciaJobId,    type:"review_request",    status:"pending", dueAt:daysAgo(2),  priority:85, estimatedValue:0,   message:"Request review from Patricia Nguyen — just completed job", metadata:{ customerName:"Patricia Nguyen" } });
    await createTask({ customerId:custIds.c40, quoteId:quoteIds.q_c40, type:"rebook_nudge",      status:"pending", dueAt:daysAgo(1),  priority:78, estimatedValue:175, message:"Pitch biweekly recurring — Catherine did one deep clean 3 months ago", metadata:{ customerName:"Catherine Duffy" } });
    await createTask({ customerId:custIds.c32,                          type:"reactivation",      status:"pending", dueAt:daysAgo(4),  priority:72, estimatedValue:285, message:"Reactivation — Samantha Cruz has been dormant for 4 months", metadata:{ customerName:"Samantha Cruz" } });
    await createTask({ customerId:custIds.c37,                          type:"reactivation",      status:"pending", dueAt:daysAgo(6),  priority:65, estimatedValue:195, message:"Win-back attempt — Charles & Vivian Park, 7 months dormant", metadata:{ customerName:"Charles Park" } });
    await createTask({ customerId:custIds.c1,                           type:"upsell",            status:"pending", dueAt:daysAgo(1),  priority:70, estimatedValue:320, message:"Upsell deep clean — Sarah has been a client for 8 months with no deep clean", metadata:{ customerName:"Sarah Mitchell" } });

    // DUE TODAY (5 tasks)
    await createTask({ customerId:custIds.c45, quoteId:quoteIds.q_c45, type:"quote_follow_up",   status:"pending", dueAt:setTime(today,10), priority:95, estimatedValue:510, message:"Priority follow-up — Berwyn Athletic Club weekly upgrade, $510/visit", metadata:{ customerName:"Berwyn Athletic Club" } });
    await createTask({ customerId:custIds.c7,  jobId:jenniferJobId,    type:"review_request",    status:"pending", dueAt:setTime(today,17), priority:82, estimatedValue:0,   message:"Request review from Jennifer Walsh after today's job", metadata:{ customerName:"Jennifer Walsh" } });
    await createTask({ customerId:custIds.c34,                          type:"rebook_nudge",      status:"pending", dueAt:setTime(today,9),  priority:75, estimatedValue:285, message:"Rebook nudge — Emma Johansson, 5 months dormant", metadata:{ customerName:"Emma Johansson" } });
    await createTask({ customerId:custIds.c2,                           type:"referral_ask",      status:"pending", dueAt:setTime(today,11), priority:68, estimatedValue:200, message:"Referral ask — James & Lauren Hoffman, great relationship, high potential", metadata:{ customerName:"James Hoffman" } });
    await createTask({ customerId:custIds.c13,                          type:"upsell",            status:"pending", dueAt:setTime(today,14), priority:72, estimatedValue:150, message:"Upsell add-ons for Lisa Greenbaum — high-value VIP, no add-ons ever", metadata:{ customerName:"Lisa Greenbaum" } });

    // UPCOMING (11 tasks)
    const upcomingTaskDefs = [
      { cKey:"c9",  type:"review_request", daysOut:1,  priority:78, val:0,   msg:"Review request — Kathleen Donahue",             name:"Kathleen Donahue" },
      { cKey:"c6",  type:"rebook_nudge",   daysOut:2,  priority:72, val:240, msg:"Rebook nudge — Thomas Burke, due for quarterly deep clean", name:"Thomas Burke" },
      { cKey:"c20", type:"reactivation",   daysOut:2,  priority:65, val:225, msg:"Reactivation — Karen Silverman, 2 months inactive",  name:"Karen Silverman" },
      { cKey:"c11", type:"upsell",         daysOut:3,  priority:70, val:130, msg:"Upsell inside oven + fridge — Susan Caldwell anniversary", name:"Susan Caldwell" },
      { cKey:"c17", type:"referral_ask",   daysOut:3,  priority:62, val:175, msg:"Referral ask — Steven Whitman, satisfied long-term client", name:"Steven Whitman" },
      { cKey:"c24", type:"rebook_nudge",   daysOut:4,  priority:68, val:185, msg:"Monthly nudge — Gloria Washington due soon",       name:"Gloria Washington" },
      { cKey:"c15", type:"review_request", daysOut:5,  priority:75, val:0,   msg:"Review request — Nancy DiSantis",                  name:"Nancy DiSantis" },
      { cKey:"c29", type:"upsell",         daysOut:5,  priority:65, val:290, msg:"Upsell deep clean — George Hartwell, 6 months with no upgrade", name:"George Hartwell" },
      { cKey:"c21", type:"referral_ask",   daysOut:6,  priority:60, val:200, msg:"Referral ask — Mark Antonelli, high income household", name:"Mark Antonelli" },
      { cKey:"c44", type:"rebook_nudge",   daysOut:7,  priority:73, val:420, msg:"Commercial follow-up — Devon Dental, discuss contract renewal", name:"Devon Dental" },
      { cKey:"c8",  type:"review_request", daysOut:7,  priority:70, val:0,   msg:"Review request — Michael Thompson",                name:"Michael Thompson" },
    ];
    for (const t of upcomingTaskDefs) {
      await createTask({ customerId:custIds[t.cKey], type:t.type, status:"pending", dueAt:daysFromNow(t.daysOut), priority:t.priority, estimatedValue:t.val, message:t.msg, metadata:{ customerName:t.name } });
    }
    console.log(`   ✓ 23 growth tasks created`);

    // ── Review Requests ─────────────────────────────────────────
    console.log("⭐ Creating reviews...");

    const reviews = [
      { cKey:"c1",  jobKey:"c1",  rating:5, text:"Ashley and her team are amazing! My house is spotless every time. Maria is incredibly thorough.", weeksAgo:6 },
      { cKey:"c3",  jobKey:"c3",  rating:5, text:"Rosa always does a beautiful job. I've been using Pristine for 7 months and wouldn't switch for anything.", weeksAgo:3 },
      { cKey:"c7",  jobKey:null,  rating:5, text:"Reliable, professional, and my home always looks perfect. Worth every penny.", weeksAgo:5 },
      { cKey:"c2",  jobKey:null,  rating:4, text:"Great service overall. Would give 5 stars but we had one reschedule. Always communicative.", weeksAgo:4 },
      { cKey:"c6",  jobKey:null,  rating:5, text:"Best cleaning service on the Main Line. Highly recommend!", weeksAgo:2 },
      { cKey:"c13", jobKey:null,  rating:5, text:"As someone in the interior design industry, I have very high standards. Pristine Home Cleaning meets all of them.", weeksAgo:3 },
      { cKey:"c41", jobKey:null,  rating:5, text:"Our medical office requires exceptional cleanliness. Pristine delivers every week without fail.", weeksAgo:4 },
      { cKey:"c33", jobKey:"c33", rating:4, text:"Great job on a huge post-construction mess. Took longer than expected but results were excellent.", weeksAgo:8 },
    ];

    for (const r of reviews) {
      const createdAt = new Date(Date.now() - r.weeksAgo * 7 * 24 * 3600_000);
      await client.query(
        `INSERT INTO review_requests (id, business_id, customer_id, job_id, status, rating, feedback_text,
           review_clicked, referral_sent, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'completed',$5,$6,true,false,$7,$7)`,
        [uuid(), businessId, custIds[r.cKey], r.jobKey ? completedJobIds[r.jobKey] || null : null,
         r.rating, r.text, createdAt]
      );
    }
    console.log(`   ✓ ${reviews.length} reviews created`);

    // ── Campaigns ───────────────────────────────────────────────
    console.log("📣 Creating campaigns...");
    const dormantIds = [custIds.c31, custIds.c32, custIds.c34, custIds.c35, custIds.c37, custIds.c39, custIds.c40, custIds.c46];
    const lostIds = [custIds.c36, custIds.c38, custIds.c39, custIds.c40, custIds.c34];

    await client.query(
      `INSERT INTO campaigns (id, business_id, name, segment, channel, status, task_count, completed_count,
         message_subject, message_content, customer_ids, created_at, updated_at)
       VALUES ($1,$2,$3,'dormant','sms','sent',8,8,$4,$5,$6,$7,$7)`,
      [uuid(), businessId, "Spring Re-Engagement 2026",
       "We miss you — spring is a great time for a fresh start",
       "Hi [Name], it's been a while since we've had the pleasure of cleaning your home. Spring is here and we'd love to get you back on the schedule. As a returning client, mention this message for $25 off your next clean. — Ashley at Pristine Home Cleaning",
       JSON.stringify(dormantIds), daysAgo(21)]
    );

    await client.query(
      `INSERT INTO campaigns (id, business_id, name, segment, channel, status, task_count, completed_count,
         message_subject, message_content, customer_ids, created_at, updated_at)
       VALUES ($1,$2,$3,'lost','sms','sent',5,5,$4,$5,$6,$7,$7)`,
      [uuid(), businessId, "Lost Quote Recovery — March",
       "Still interested in a cleaning quote?",
       "Hi [Name], we noticed your quote is still open. We'd love to help — can we answer any questions or offer a special first-clean rate? Reply anytime. — Ashley",
       JSON.stringify(lostIds), daysAgo(7)]
    );

    await client.query(
      `INSERT INTO campaigns (id, business_id, name, segment, channel, status, message_subject, created_at, updated_at)
       VALUES ($1,$2,'Summer Deep Clean Promo','dormant','sms','draft','Summer is coming — time for a deep clean?',NOW(),NOW())`,
      [uuid(), businessId]
    );

    await client.query(
      `INSERT INTO campaigns (id, business_id, name, segment, channel, status, message_subject, customer_ids, created_at, updated_at)
       VALUES ($1,$2,'Win-Back — Long Dormant','custom','sms','draft','We want to win you back',$3,NOW(),NOW())`,
      [uuid(), businessId, JSON.stringify([custIds.c34, custIds.c35, custIds.c37])]
    );
    console.log(`   ✓ 4 campaigns created`);

    // ── Growth Automation Settings ──────────────────────────────
    await client.query(
      `INSERT INTO growth_automation_settings (id, business_id, marketing_mode_enabled,
         abandoned_quote_recovery, weekly_reactivation, review_request_workflow,
         referral_ask_workflow, rebook_nudges, upsell_triggers,
         quiet_hours_start, quiet_hours_end, max_sends_per_day, max_follow_ups_per_quote,
         created_at, updated_at)
       VALUES ($1,$2,true,true,true,true,true,true,true,'21:00','08:00',5,4,NOW(),NOW())
       ON CONFLICT (business_id) DO UPDATE SET
         marketing_mode_enabled=true, abandoned_quote_recovery=true,
         weekly_reactivation=true, review_request_workflow=true,
         referral_ask_workflow=true, rebook_nudges=true, upsell_triggers=true,
         quiet_hours_start='21:00', quiet_hours_end='08:00',
         max_sends_per_day=5, max_follow_ups_per_quote=4, updated_at=NOW()`,
      [uuid(), businessId]
    ).catch(() =>
      client.query(`UPDATE growth_automation_settings SET marketing_mode_enabled=true, abandoned_quote_recovery=true, weekly_reactivation=true, review_request_workflow=true, referral_ask_workflow=true, rebook_nudges=true, upsell_triggers=true, quiet_hours_start='21:00', quiet_hours_end='08:00', max_sends_per_day=5, max_follow_ups_per_quote=4, updated_at=NOW() WHERE business_id=$1`, [businessId])
    );

    // ── Sales Strategy ──────────────────────────────────────────
    await client.query(
      `INSERT INTO sales_strategy_settings (id, business_id, selected_profile, escalation_enabled, created_at, updated_at)
       VALUES ($1,$2,'professional',true,NOW(),NOW())
       ON CONFLICT (business_id) DO UPDATE SET selected_profile='professional', escalation_enabled=true, updated_at=NOW()`,
      [uuid(), businessId]
    ).catch(() =>
      client.query(`UPDATE sales_strategy_settings SET selected_profile='professional', escalation_enabled=true, updated_at=NOW() WHERE business_id=$1`, [businessId])
    );

    // ── Final Counts ────────────────────────────────────────────
    const counts = await Promise.all([
      client.query("SELECT COUNT(*) FROM customers WHERE business_id=$1", [businessId]),
      client.query("SELECT COUNT(*), COALESCE(SUM(total),0) AS total FROM quotes WHERE business_id=$1", [businessId]),
      client.query("SELECT COUNT(*) FROM jobs WHERE business_id=$1", [businessId]),
      client.query("SELECT COUNT(*) FROM employees WHERE business_id=$1", [businessId]),
      client.query("SELECT COUNT(*) FROM growth_tasks WHERE business_id=$1", [businessId]),
      client.query("SELECT COUNT(*) FROM review_requests WHERE business_id=$1", [businessId]),
      client.query("SELECT COUNT(*) FROM campaigns WHERE business_id=$1", [businessId]),
    ]);

    console.log("\n─────────────────────────────────────────────────");
    console.log("✅ Demo account seeded successfully!\n");
    console.log(`  Login:    demo@pristinehomecleaning.com`);
    console.log(`  Password: PristineDemo2026!`);
    console.log(`  Plan:     Pro (active)\n`);
    console.log(`  ✅ ${counts[0].rows[0].count} customers created`);
    console.log(`  ✅ ${counts[1].rows[0].count} quotes created ($${Math.round(counts[1].rows[0].total).toLocaleString()} total value)`);
    console.log(`  ✅ ${counts[2].rows[0].count} jobs created`);
    console.log(`  ✅ ${counts[3].rows[0].count} team members created`);
    console.log(`  ✅ ${counts[4].rows[0].count} growth tasks created`);
    console.log(`  ✅ ${counts[5].rows[0].count} reviews created`);
    console.log(`  ✅ ${counts[6].rows[0].count} campaigns created`);
    console.log(`  ✅ Demo account ready`);
    console.log("─────────────────────────────────────────────────");

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("❌ Seed failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
