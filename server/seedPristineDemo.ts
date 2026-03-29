/**
 * Pristine Home Cleaning — Full Demo Data Seed
 * Called at server startup. Idempotent — skips if already seeded.
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "./db";

const log = console.log;

function uuid(): string { return crypto.randomUUID(); }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n: number): Date { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function monthsAgo(n: number): Date { const d = new Date(); d.setMonth(d.getMonth() - n); return d; }
function minutesAgo(n: number): Date { return new Date(Date.now() - n * 60_000); }
function setTime(date: Date, hour: number, minute = 0): Date { const d = new Date(date); d.setHours(hour, minute, 0, 0); return d; }
function nextWeekday(date: Date): Date { const d = new Date(date); while (d.getDay() === 0) d.setDate(d.getDate() + 1); return d; }
function jitter(base: number, range = 12): number { return base + Math.floor(Math.random() * range * 2) - range; }

function pickTeamMember(ids: string[]): string[] {
  const r = Math.random();
  if (r < 0.40) return [ids[0]];
  if (r < 0.65) return [ids[1]];
  if (r < 0.90) return [ids[2]];
  return [ids[3]];
}

const JOB_NOTES = [
  "Key under mat — lock deadbolt on way out",
  "Dog crated in laundry room",
  "Focus extra time on master bath",
  "Client will be home — works from home on Fridays",
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

export async function seedPristineHomeDemo(): Promise<void> {
  const client = await pool.connect();
  try {
    const EMAIL = "demo@pristinehomecleaning.com";
    const PASSWORD = "PristineDemo2026!";

    // ── User ──────────────────────────────────────────────────
    const existingUser = await client.query(
      "SELECT id FROM users WHERE LOWER(email) = $1", [EMAIL]
    );
    let userId: string;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      await client.query(
        `UPDATE users SET subscription_tier='pro', subscription_expires_at=NOW()+INTERVAL '1 year',
         stripe_subscription_status='active', name='Ashley Donovan' WHERE id=$1`, [userId]
      );
    } else {
      const hash = await bcrypt.hash(PASSWORD, 12);
      userId = uuid();
      await client.query(
        `INSERT INTO users (id,email,password_hash,name,auth_provider,subscription_tier,
           subscription_expires_at,stripe_subscription_status,created_at,updated_at)
         VALUES ($1,$2,$3,'Ashley Donovan','email','pro',NOW()+INTERVAL '1 year','active',NOW(),NOW())`,
        [userId, EMAIL, hash]
      );
    }

    // ── Business ─────────────────────────────────────────────
    let businessId: string;
    const existingBiz = await client.query(
      "SELECT id FROM businesses WHERE owner_user_id=$1 LIMIT 1", [userId]
    );
    if (existingBiz.rows.length > 0) {
      businessId = existingBiz.rows[0].id;
      await client.query(
        `UPDATE businesses SET company_name='Pristine Home Cleaning',
         email='ashley@pristinehomecleaning.com', phone='(610) 555-0142',
         address='247 Lancaster Ave, Wayne, PA 19087', sender_name='Ashley',
         primary_color='#1E40AF', onboarding_complete=true, updated_at=NOW()
         WHERE id=$1`, [businessId]
      );
    } else {
      businessId = uuid();
      const slug = `pristine-home-cleaning-${businessId.slice(0,8)}`;
      await client.query(
        `INSERT INTO businesses (id,owner_user_id,company_name,email,phone,address,sender_name,
           sender_title,booking_link,email_signature,sms_signature,primary_color,
           onboarding_complete,public_quote_slug,public_quote_enabled,created_at,updated_at)
         VALUES ($1,$2,'Pristine Home Cleaning','ashley@pristinehomecleaning.com',
           '(610) 555-0142','247 Lancaster Ave, Wayne, PA 19087','Ashley',
           'Owner','','','','#1E40AF',true,$3,true,NOW(),NOW())`,
        [businessId, userId, slug]
      );
    }

    // Guard: if already seeded with full data, skip
    const custCount = await client.query(
      "SELECT COUNT(*) FROM customers WHERE business_id=$1", [businessId]
    );
    if (parseInt(custCount.rows[0].count) > 10) {
      log(`[pristine-demo] Already seeded (${custCount.rows[0].count} customers). Skipping full data seed.`);
      return;
    }

    log("[pristine-demo] Seeding full demo dataset...");

    // ── Pricing settings ──────────────────────────────────────
    const pricingSettings = {
      hourlyRate: 52, minimumTicket: 120, taxRate: 0,
      frequencyDiscounts: { weekly: 20, biweekly: 15, monthly: 10 },
      serviceTypes: [
        { id:"standard",    name:"Standard Clean",    multiplier:1.00, isDefault:true },
        { id:"deep",        name:"Deep Clean",         multiplier:1.85 },
        { id:"moveinout",   name:"Move In/Move Out",   multiplier:2.20 },
        { id:"postconstruct",name:"Post Construction", multiplier:2.80 },
        { id:"airbnb",      name:"Airbnb Turnover",    multiplier:0.75 },
      ],
      addOns: [
        { key:"insideFridge",     label:"Inside Fridge",       price:35 },
        { key:"insideOven",       label:"Inside Oven",         price:35 },
        { key:"insideCabinets",   label:"Inside Cabinets",     price:50 },
        { key:"interiorWindows",  label:"Interior Windows",    price:45 },
        { key:"blindsDetail",     label:"Blinds Detail",       price:30 },
        { key:"baseboardsDetail", label:"Baseboards Detail",   price:40 },
        { key:"laundryFoldOnly",  label:"Laundry & Fold",      price:30 },
        { key:"dishes",           label:"Dishes",              price:25 },
        { key:"organizationTidy", label:"Organization & Tidy", price:60 },
      ],
      pricePerSqft:0.085, pricePerBedroom:15, pricePerBathroom:18,
    };
    await client.query("DELETE FROM pricing_settings WHERE business_id=$1", [businessId]);
    await client.query(
      `INSERT INTO pricing_settings (id,business_id,settings,created_at,updated_at)
       VALUES ($1,$2,$3,NOW(),NOW())`,
      [uuid(), businessId, JSON.stringify(pricingSettings)]
    );

    // ── Employees ─────────────────────────────────────────────
    const empDefs = [
      { key:"ashley",  name:"Ashley Donovan",  role:"Owner/Operator", phone:"(610) 555-0142", email:"ashley@pristinehomecleaning.com", status:"active",   color:"#1E40AF", mo:8, notes:"" },
      { key:"maria",   name:"Maria Santos",    role:"Lead Cleaner",   phone:"(610) 555-0198", email:"maria@pristinehomecleaning.com",  status:"active",   color:"#7C3AED", mo:7, notes:"Most experienced cleaner, handles deep cleans and move-outs" },
      { key:"destiny", name:"Destiny Williams",role:"Cleaner",        phone:"(610) 555-0231", email:"",                                status:"active",   color:"#059669", mo:5, notes:"" },
      { key:"rosa",    name:"Rosa Gutierrez",  role:"Cleaner",        phone:"(610) 555-0274", email:"",                                status:"active",   color:"#D97706", mo:4, notes:"Speaks Spanish, great with pets" },
      { key:"jasmine", name:"Jasmine Taylor",  role:"Cleaner",        phone:"(610) 555-0312", email:"",                                status:"active",   color:"#EC4899", mo:2, notes:"Still in training period" },
      { key:"brittany",name:"Brittany Chen",   role:"Cleaner",        phone:"(610) 555-0356", email:"",                                status:"inactive", color:"#6B7280", mo:6, notes:"Left for full-time position elsewhere" },
    ];
    const empIds: Record<string,string> = {};
    for (const e of empDefs) {
      empIds[e.key] = uuid();
      await client.query(
        `INSERT INTO employees (id,business_id,name,phone,email,role,status,notes,color,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
        [empIds[e.key], businessId, e.name, e.phone, e.email, e.role, e.status, e.notes, e.color, monthsAgo(e.mo)]
      );
    }
    const activeEmpIds = [empIds.maria, empIds.destiny, empIds.rosa, empIds.jasmine];

    // ── Customers ─────────────────────────────────────────────
    interface C { key:string; fn:string; ln:string; addr:string; ph:string; em?:string; tags:string[]; notes?:string; avg:number; stat:string; vip?:boolean; freq:string; mo?:number; lastDaysAgo?:number; }
    const custDefs: C[] = [
      // BIWEEKLY
      { key:"c1",  fn:"Sarah",      ln:"Mitchell",          addr:"504 Chestnut Hill Rd, Villanova PA 19085",       ph:"(610) 555-1001", em:"smitchell@gmail.com",        tags:["VIP","Biweekly"],         notes:"Has 2 dogs. Key under mat. Prefers mornings. Tip always $20.", avg:185, stat:"active", vip:true, freq:"biweekly", mo:8 },
      { key:"c2",  fn:"James",      ln:"Hoffman",           addr:"38 Berkley Rd, Devon PA 19333",                  ph:"(610) 555-1002", em:"jhoffman@comcast.net",        tags:["Biweekly","Referral"],    notes:"3 kids, very messy. Add 30 min to scheduled time. Pays by Venmo.", avg:225, stat:"active", freq:"biweekly", mo:7 },
      { key:"c3",  fn:"Patricia",   ln:"Nguyen",            addr:"892 County Line Rd, Bryn Mawr PA 19010",         ph:"(610) 555-1003", em:"pnguyen@yahoo.com",           tags:["Biweekly","VIP"],         notes:"Retired. Always home during clean. Very particular about baseboards.", avg:165, stat:"active", vip:true, freq:"biweekly", mo:8 },
      { key:"c4",  fn:"Robert",     ln:"Chen",              addr:"15 Fox Hollow Lane, Malvern PA 19355",           ph:"(610) 555-1004", em:"rchen@gmail.com",             tags:["Biweekly"],               notes:"Both WFH. Clean home office too. Has a cat.",                 avg:210, stat:"active", freq:"biweekly", mo:7 },
      { key:"c5",  fn:"Amanda",     ln:"Kowalski",          addr:"271 Montgomery Ave, Haverford PA 19041",         ph:"(610) 555-1005", em:"akowalski@outlook.com",       tags:["Biweekly","Referral"],    notes:"Allergic to strong scents — use unscented products only.",    avg:175, stat:"active", freq:"biweekly", mo:6 },
      { key:"c6",  fn:"Thomas",     ln:"Burke",             addr:"44 Sugartown Rd, Berwyn PA 19312",               ph:"(610) 555-1006", em:"tburke@gmail.com",            tags:["Biweekly"],               avg:240, stat:"active", freq:"biweekly", mo:7 },
      { key:"c7",  fn:"Jennifer",   ln:"Walsh",             addr:"617 Old Eagle School Rd, Wayne PA 19087",       ph:"(610) 555-1007", em:"jwalsh@gmail.com",            tags:["Biweekly","VIP"],         notes:"Executive. Very neat home. Tip always $30. Send reminder day before.", avg:195, stat:"active", vip:true, freq:"biweekly", mo:8 },
      { key:"c8",  fn:"Michael",    ln:"Thompson",          addr:"83 Waterloo Rd, Devon PA 19333",                ph:"(610) 555-1008", em:"mthompson@comcast.net",       tags:["Biweekly"],               avg:220, stat:"active", freq:"biweekly", mo:6 },
      { key:"c9",  fn:"Kathleen",   ln:"Donahue",           addr:"355 Conestoga Rd, Berwyn PA 19312",             ph:"(610) 555-1009", em:"kdonahue@gmail.com",          tags:["Biweekly"],               notes:"Elderly, very appreciative. Lives alone. Always has coffee ready.", avg:155, stat:"active", freq:"biweekly", mo:8 },
      { key:"c10", fn:"David",      ln:"Patel",             addr:"129 Darby Creek Rd, Newtown Square PA 19073",   ph:"(610) 555-1010", em:"dpatel@gmail.com",            tags:["Biweekly","Referral"],    avg:200, stat:"active", freq:"biweekly", mo:5 },
      { key:"c11", fn:"Susan",      ln:"Caldwell",          addr:"488 Old Lancaster Rd, Haverford PA 19041",      ph:"(610) 555-1011", em:"scaldwell@yahoo.com",         tags:["Biweekly"],               notes:"2 cats. Extra time for pet hair.",                            avg:180, stat:"active", freq:"biweekly", mo:7 },
      { key:"c12", fn:"Brian",      ln:"Murphy",            addr:"72 Beaumont Rd, Devon PA 19333",                ph:"(610) 555-1012", em:"bmurphy@gmail.com",           tags:["Biweekly"],               avg:215, stat:"active", freq:"biweekly", mo:6 },
      { key:"c13", fn:"Lisa",       ln:"Greenbaum",         addr:"941 Penllyn Pike, Blue Bell PA 19422",          ph:"(610) 555-1013", em:"lgreenbaum@gmail.com",        tags:["Biweekly","VIP"],         notes:"Interior designer. Very high standards. Always inspects after.", avg:260, stat:"active", vip:true, freq:"biweekly", mo:7 },
      { key:"c14", fn:"Christopher",ln:"Hayes",             addr:"204 Sproul Rd, Villanova PA 19085",             ph:"(610) 555-1014", em:"chayes@comcast.net",          tags:["Biweekly"],               avg:170, stat:"active", freq:"biweekly", mo:5 },
      { key:"c15", fn:"Nancy",      ln:"DiSantis",          addr:"567 Boot Rd, Downingtown PA 19335",             ph:"(610) 555-1015", em:"ndisantis@outlook.com",       tags:["Biweekly"],               avg:190, stat:"active", freq:"biweekly", mo:6 },
      { key:"c16", fn:"Rachel",     ln:"Kim",               addr:"33 Louella Ave, Wayne PA 19087",                ph:"(610) 555-1016", em:"rkim@gmail.com",              tags:["Biweekly","Referral"],    avg:165, stat:"active", freq:"biweekly", mo:5 },
      { key:"c17", fn:"Steven",     ln:"Whitman",           addr:"718 Swedesford Rd, Berwyn PA 19312",            ph:"(610) 555-1017", em:"swhitman@gmail.com",          tags:["Biweekly"],               avg:235, stat:"active", freq:"biweekly", mo:7 },
      { key:"c18", fn:"Diane",      ln:"Obrien",            addr:"156 Summit Ave, Malvern PA 19355",              ph:"(610) 555-1018", em:"dobrien@yahoo.com",           tags:["Biweekly"],               notes:"Recently divorced, new to managing home alone. Very loyal client.", avg:175, stat:"active", freq:"biweekly", mo:4 },
      // MONTHLY
      { key:"c19", fn:"Andrew",     ln:"Foster",            addr:"892 Upper Gulph Rd, Wayne PA 19087",            ph:"(610) 555-1019", em:"afoster@gmail.com",           tags:["Monthly"],                avg:280, stat:"active", freq:"monthly", mo:7 },
      { key:"c20", fn:"Karen",      ln:"Silverman",         addr:"245 W Lancaster Ave, Paoli PA 19301",           ph:"(610) 555-1020", em:"ksilverman@comcast.net",      tags:["Monthly"],                avg:225, stat:"active", freq:"monthly", mo:6 },
      { key:"c21", fn:"Mark",       ln:"Antonelli",         addr:"57 Hathaway Lane, Villanova PA 19085",          ph:"(610) 555-1021", em:"mantonelli@gmail.com",        tags:["Monthly"],                avg:310, stat:"active", freq:"monthly", mo:7 },
      { key:"c22", fn:"Dorothy",    ln:"Fernandez",         addr:"380 Meeting House Rd, Berwyn PA 19312",         ph:"(610) 555-1022",                                   tags:["Monthly","Elderly"],      avg:160, stat:"active", freq:"monthly", mo:8 },
      { key:"c23", fn:"Ryan",       ln:"Park",              addr:"614 Tredyffrin Rd, Strafford PA 19087",         ph:"(610) 555-1023", em:"rpark@gmail.com",             tags:["Monthly"],                avg:255, stat:"active", freq:"monthly", mo:5 },
      { key:"c24", fn:"Gloria",     ln:"Washington",        addr:"129 Sproul Rd, Bryn Mawr PA 19010",            ph:"(610) 555-1024",                                   tags:["Monthly"],                avg:185, stat:"active", freq:"monthly", mo:6 },
      { key:"c25", fn:"Timothy",    ln:"Long",              addr:"47 Woodland Ave, Wayne PA 19087",               ph:"(610) 555-1025", em:"tlong@outlook.com",           tags:["Monthly"],                avg:290, stat:"active", freq:"monthly", mo:7 },
      { key:"c26", fn:"Melissa",    ln:"Oconnor",           addr:"783 Conestoga Rd, Berwyn PA 19312",             ph:"(610) 555-1026", em:"moconnor@gmail.com",          tags:["Monthly","Referral"],     avg:210, stat:"active", freq:"monthly", mo:5 },
      { key:"c27", fn:"Harold",     ln:"Fischer",           addr:"22 Robin Hood Rd, Wayne PA 19087",              ph:"(610) 555-1027",                                   tags:["Monthly","Elderly"],      avg:175, stat:"active", freq:"monthly", mo:7 },
      { key:"c28", fn:"Alicia",     ln:"Monroe",            addr:"491 Old Gulph Rd, Villanova PA 19085",          ph:"(610) 555-1028", em:"amonroe@gmail.com",           tags:["Monthly"],                avg:220, stat:"active", freq:"monthly", mo:4 },
      { key:"c29", fn:"George",     ln:"Hartwell",          addr:"316 Catfish Lane, Malvern PA 19355",            ph:"(610) 555-1029",                                   tags:["Monthly"],                avg:265, stat:"active", freq:"monthly", mo:6 },
      { key:"c30", fn:"Irene",      ln:"Castellano",        addr:"58 Academy Rd, Glenside PA 19038",              ph:"(610) 555-1030", em:"icastellano@yahoo.com",       tags:["Monthly"],                avg:195, stat:"active", freq:"monthly", mo:5 },
      // ONE-TIME / LEADS
      { key:"c31", fn:"Kevin",      ln:"Branigan",          addr:"847 Lancaster Ave, Berwyn PA 19312",            ph:"(610) 555-1031", em:"kbranigan@gmail.com",         tags:["One-Time","MoveOut"],     avg:520, stat:"inactive", freq:"one-time", mo:3, lastDaysAgo:90 },
      { key:"c32", fn:"Samantha",   ln:"Cruz",              addr:"234 Forest Rd, Narberth PA 19072",              ph:"(610) 555-1032", em:"scruz@gmail.com",             tags:["One-Time"],               notes:"Good reactivation candidate.",                                avg:285, stat:"inactive", freq:"one-time", mo:4, lastDaysAgo:120 },
      { key:"c33", fn:"Daniel",     ln:"Fitzpatrick",       addr:"19 Mill Rd, Exton PA 19341",                    ph:"(610) 555-1033", em:"dfitzpatrick@gmail.com",      tags:["One-Time","PostConstruct"],avg:650, stat:"inactive", freq:"one-time", mo:2, lastDaysAgo:60 },
      { key:"c34", fn:"Emma",       ln:"Johansson",         addr:"445 W Wayne Ave, Wayne PA 19087",              ph:"(610) 555-1034", em:"ejohansson@gmail.com",        tags:["One-Time"],               avg:285, stat:"inactive", freq:"one-time", mo:5, lastDaysAgo:150 },
      { key:"c35", fn:"Phillip",    ln:"Garrett",           addr:"273 Gulph Mills Rd, King of Prussia PA 19406",  ph:"(610) 555-1035",                                   tags:["One-Time","MoveOut"],     avg:580, stat:"inactive", freq:"one-time", mo:6, lastDaysAgo:180 },
      { key:"c36", fn:"Monica",     ln:"Reyes",             addr:"67 S Wayne Ave, Wayne PA 19087",                ph:"(610) 555-1036", em:"mreyes@gmail.com",            tags:["One-Time","Lead"],        notes:"Came in via Lead Link. Quote sent, no response yet.",          avg:165, stat:"lead",     freq:"one-time", mo:0 },
      { key:"c37", fn:"Charles",    ln:"Park",              addr:"334 Glenhardie Rd, Wayne PA 19087",             ph:"(610) 555-1037", em:"cpark@gmail.com",             tags:["One-Time"],               notes:"Dormant — good reactivation candidate",                        avg:195, stat:"inactive", freq:"one-time", mo:7, lastDaysAgo:210 },
      { key:"c38", fn:"Heather",    ln:"Simmons",           addr:"781 Lancaster Ave, Malvern PA 19355",           ph:"(610) 555-1038", em:"hsimmons@gmail.com",          tags:["Lead"],                   notes:"Requested quote via website.",                                avg:285, stat:"lead",     freq:"one-time", mo:0 },
      { key:"c39", fn:"Anthony",    ln:"Greco",             addr:"156 Paoli Pike, Paoli PA 19301",                ph:"(610) 555-1039",                                   tags:["One-Time"],               avg:195, stat:"inactive", freq:"one-time", mo:4, lastDaysAgo:120 },
      { key:"c40", fn:"Catherine",  ln:"Duffy",             addr:"892 Cathcart Rd, Blue Bell PA 19422",           ph:"(610) 555-1040", em:"cduffy@outlook.com",          tags:["One-Time","Referral"],    notes:"Referred by Jennifer Walsh. Did one deep clean, never rebooked.", avg:275, stat:"inactive", freq:"one-time", mo:3, lastDaysAgo:90 },
      // COMMERCIAL
      { key:"c41", fn:"Greenfield", ln:"Pediatrics",        addr:"425 Lancaster Ave, Wayne PA 19087",             ph:"(610) 555-1041", em:"office@greenfield-peds.com",  tags:["Commercial","Weekly","VIP"],notes:"Medical office. Weekly. Must use hospital-grade products. Before 7am.", avg:385, stat:"active", vip:true, freq:"weekly", mo:7 },
      { key:"c42", fn:"Main Line",  ln:"Yoga Studio",       addr:"88 W Lancaster Ave, Paoli PA 19301",            ph:"(610) 555-1042", em:"info@mainlineyoga.com",       tags:["Commercial","Weekly"],    notes:"Clean hardwood with specific product only. After 8pm preferred.", avg:275, stat:"active", freq:"weekly", mo:6 },
      { key:"c43", fn:"Strafford",  ln:"Realty Group",      addr:"214 E Lancaster Ave, Paoli PA 19301",           ph:"(610) 555-1043", em:"facilities@straffordrealty.com",tags:["Commercial","Biweekly"], notes:"Office cleaning. 3 suites. Has own cleaning supplies.",       avg:320, stat:"active", freq:"biweekly", mo:5 },
      { key:"c44", fn:"Devon",      ln:"Dental Associates",  addr:"571 Lancaster Ave, Devon PA 19333",             ph:"(610) 555-1044",                                   tags:["Commercial","Weekly"],    avg:420, stat:"active", freq:"weekly", mo:6 },
      { key:"c45", fn:"Berwyn",     ln:"Athletic Club",     addr:"33 Waterloo Rd, Berwyn PA 19312",               ph:"(610) 555-1045", em:"manager@berwynathleticclub.com",tags:["Commercial","Weekly"],  notes:"Locker rooms + lobby. 2 cleaners required.",                  avg:510, stat:"active", freq:"weekly", mo:7 },
      { key:"c46", fn:"The Covered Bridge",ln:"Inn",        addr:"124 Bridge Rd, Phoenixville PA 19460",          ph:"(610) 555-1046", em:"host@coveredbridgeinn.com",   tags:["Commercial","Airbnb"],    notes:"Airbnb host. Calls for turnover cleans 1-3 days in advance.",  avg:195, stat:"active", freq:"one-time", mo:4 },
      { key:"c47", fn:"Valley Forge",ln:"Chiropractic",     addr:"892 DeKalb Pike, Blue Bell PA 19422",           ph:"(610) 555-1047", em:"admin@vfchiro.com",            tags:["Commercial","Monthly"],   avg:340, stat:"active", freq:"monthly", mo:5 },
    ];

    const custIds: Record<string,string> = {};
    for (const c of custDefs) {
      custIds[c.key] = uuid();
      await client.query(
        `INSERT INTO customers (id,business_id,first_name,last_name,phone,email,address,notes,tags,status,is_vip,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)`,
        [custIds[c.key], businessId, c.fn, c.ln, c.ph, c.em||"", c.addr, c.notes||"",
         JSON.stringify(c.tags), c.stat, c.vip||false, monthsAgo(c.mo||4)]
      );
    }
    log(`[pristine-demo] ${custDefs.length} customers seeded`);

    // ── Quotes ────────────────────────────────────────────────
    const quoteIds: Record<string,string> = {};

    async function createQuote(p: {
      key?:string; cid:string; status:string; total:number; freq?:string;
      beds?:number; baths?:number; notes?:string; createdAt?:Date; sentAt?:Date;
    }) {
      const id = uuid();
      if (p.key) quoteIds[p.key] = id;
      const tot = jitter(p.total, 12);
      const ca = p.createdAt || daysAgo(30);
      const sa = p.sentAt || (p.status !== "draft" ? new Date(ca.getTime()+3600_000) : null);
      const aa = p.status==="accepted" ? new Date((sa||ca).getTime()+172800_000) : null;
      const da = p.status==="declined" ? new Date((sa||ca).getTime()+259200_000) : null;
      const ea = p.status==="expired"  ? daysAgo(5) : (p.status==="sent" ? daysFromNow(14) : null);
      await client.query(
        `INSERT INTO quotes (id,business_id,customer_id,property_beds,property_baths,frequency_selected,
           total,subtotal,tax,status,sent_at,accepted_at,declined_at,expires_at,public_token,ai_notes,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11,$12,$13,$14,$15,$16,$16)`,
        [id, businessId, p.cid, p.beds||3, p.baths||2, p.freq||"one-time", tot, tot,
         p.status, sa, aa, da, ea, crypto.randomBytes(16).toString("hex"), p.notes||null, ca]
      );
      return id;
    }

    const biweeklyKeys = ["c1","c2","c3","c4","c5","c6","c7","c8","c9","c10","c11","c12","c13","c14","c15","c16","c17","c18"];
    const monthlyKeys  = ["c19","c20","c21","c22","c23","c24","c25","c26","c27","c28","c29","c30"];

    for (const k of biweeklyKeys) {
      const c = custDefs.find(x=>x.key===k)!;
      await createQuote({ key:`q_${k}`, cid:custIds[k], status:"accepted", total:c.avg, freq:"biweekly", createdAt:monthsAgo(c.mo||6) });
    }
    for (const k of monthlyKeys) {
      const c = custDefs.find(x=>x.key===k)!;
      await createQuote({ key:`q_${k}`, cid:custIds[k], status:"accepted", total:c.avg, freq:"monthly", createdAt:monthsAgo(c.mo||5) });
    }

    await createQuote({ key:"q_c31", cid:custIds.c31, status:"accepted", total:520,  freq:"one-time", createdAt:daysAgo(95),  beds:4, baths:3 });
    await createQuote({ key:"q_c32", cid:custIds.c32, status:"accepted", total:285,  freq:"one-time", createdAt:daysAgo(125) });
    await createQuote({ key:"q_c33", cid:custIds.c33, status:"accepted", total:650,  freq:"one-time", createdAt:daysAgo(65),  beds:5, baths:3, notes:"Big job — post-reno move out" });
    await createQuote({ key:"q_c34", cid:custIds.c34, status:"accepted", total:285,  freq:"one-time", createdAt:daysAgo(155) });
    await createQuote({ key:"q_c35", cid:custIds.c35, status:"accepted", total:580,  freq:"one-time", createdAt:daysAgo(185) });
    await createQuote({ key:"q_c36", cid:custIds.c36, status:"sent",     total:165,  freq:"one-time", createdAt:daysAgo(6),   sentAt:daysAgo(5),  notes:"Came in via Lead Link" });
    await createQuote({ key:"q_c37", cid:custIds.c37, status:"accepted", total:195,  freq:"one-time", createdAt:daysAgo(215) });
    await createQuote({ key:"q_c38", cid:custIds.c38, status:"sent",     total:285,  freq:"one-time", createdAt:daysAgo(9),   sentAt:daysAgo(8) });
    await createQuote({ key:"q_c39", cid:custIds.c39, status:"declined", total:195,  freq:"one-time", createdAt:daysAgo(125), notes:"Said price was too high. Went with a competitor." });
    await createQuote({ key:"q_c40", cid:custIds.c40, status:"sent",     total:175,  freq:"biweekly", createdAt:daysAgo(4),   sentAt:daysAgo(3),  notes:"Follow up — pitch biweekly recurring" });
    await createQuote({ key:"q_c41", cid:custIds.c41, status:"accepted", total:385,  freq:"weekly",   createdAt:monthsAgo(7) });
    await createQuote({ key:"q_c42", cid:custIds.c42, status:"accepted", total:275,  freq:"weekly",   createdAt:monthsAgo(6) });
    await createQuote({ key:"q_c43", cid:custIds.c43, status:"accepted", total:320,  freq:"biweekly", createdAt:monthsAgo(5) });
    await createQuote({ key:"q_c44", cid:custIds.c44, status:"accepted", total:420,  freq:"weekly",   createdAt:monthsAgo(6) });
    await createQuote({ key:"q_c45", cid:custIds.c45, status:"sent",     total:510,  freq:"weekly",   createdAt:daysAgo(3),  sentAt:daysAgo(2),  notes:"Upgrade from monthly to weekly — big win if we close this" });
    await createQuote({               cid:custIds.c45, status:"accepted", total:510,  freq:"monthly",  createdAt:monthsAgo(7) });
    await createQuote({ key:"q_c46", cid:custIds.c46, status:"accepted", total:195,  freq:"one-time", createdAt:monthsAgo(4) });
    await createQuote({ key:"q_c47", cid:custIds.c47, status:"accepted", total:340,  freq:"monthly",  createdAt:monthsAgo(5) });

    // Extra sent/expired/declined/draft to round out totals
    for (const k of ["c1","c3","c7","c13","c19","c21"]) {
      const c = custDefs.find(x=>x.key===k)!;
      await createQuote({ cid:custIds[k], status:"sent",    total:c.avg*1.85, freq:"one-time", createdAt:daysAgo(7),  sentAt:daysAgo(6), notes:"Annual deep clean upgrade" });
    }
    for (const k of ["c2","c4","c8","c11","c20","c23","c25","c29","c43"]) {
      const c = custDefs.find(x=>x.key===k)!;
      await createQuote({ cid:custIds[k], status:"expired", total:c.avg, freq:"one-time", createdAt:daysAgo(60), sentAt:daysAgo(59) });
    }
    for (const k of ["c5","c9","c14","c16","c24","c28"]) {
      const c = custDefs.find(x=>x.key===k)!;
      await createQuote({ cid:custIds[k], status:"draft",   total:c.avg, freq:"biweekly", createdAt:daysAgo(3) });
    }
    for (const k of ["c15","c17","c26","c30","c34"]) {
      const c = custDefs.find(x=>x.key===k)!;
      await createQuote({ cid:custIds[k], status:"declined", total:c.avg*2.2, freq:"one-time", createdAt:daysAgo(100) });
    }
    log(`[pristine-demo] Quotes seeded`);

    // ── Jobs ──────────────────────────────────────────────────
    let jobCount = 0;
    const completedJobIds: Record<string,string> = {};

    async function createJob(p: {
      cid:string; qid?:string; jobType?:string; status:string; start:Date; end?:Date;
      recurrence?:string; addr:string; total:number; empIds?:string[]; notes?:string;
      completedAt?:Date; rating?:number; ratingComment?:string;
      detailedStatus?:string; startedAt?:Date;
    }) {
      const id = uuid();
      const end = p.end || new Date(p.start.getTime() + 2.5*3600_000);
      const note = p.notes || JOB_NOTES[Math.floor(Math.random()*JOB_NOTES.length)];
      const team = (p.empIds || pickTeamMember(activeEmpIds)).map(e=>({id:e}));
      await client.query(
        `INSERT INTO jobs (id,business_id,customer_id,quote_id,job_type,status,start_datetime,end_datetime,
           recurrence,internal_notes,address,total,team_members,satisfaction_rating,rating_comment,
           completed_at,detailed_status,started_at,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)`,
        [id, businessId, p.cid, p.qid||null, p.jobType||"standard", p.status,
         p.start, end, p.recurrence||"one-time", note, p.addr,
         jitter(p.total, 10), JSON.stringify(team),
         p.rating||null, p.ratingComment||null,
         p.completedAt||(p.status==="completed"?end:null),
         p.detailedStatus||"", p.startedAt||null, p.start]
      );
      jobCount++;
      return id;
    }

    // Today's notable jobs
    const today = new Date();
    const jenniferJobId = await createJob({
      cid:custIds.c7, qid:quoteIds.q_c7, status:"in_progress", detailedStatus:"service_started",
      start:setTime(today,9), addr:"617 Old Eagle School Rd, Wayne PA 19087", total:195,
      empIds:[empIds.maria], notes:"Executive. Very neat home. Tip always $30.", startedAt:setTime(today,9),
    });
    completedJobIds.jennifer = jenniferJobId;

    const patriciaDone = minutesAgo(10);
    const patriciaJobId = await createJob({
      cid:custIds.c3, qid:quoteIds.q_c3, status:"completed",
      start:new Date(patriciaDone.getTime()-2.5*3600_000), completedAt:patriciaDone,
      addr:"892 County Line Rd, Bryn Mawr PA 19010", total:165, empIds:[empIds.rosa],
      notes:"Very particular about baseboards.", rating:5, ratingComment:"Rosa was wonderful as always!",
    });
    completedJobIds.patricia = patriciaJobId;

    // Tomorrow's scheduled jobs
    const tmrw = new Date(); tmrw.setDate(tmrw.getDate()+1);
    await createJob({ cid:custIds.c1,  status:"scheduled", start:setTime(tmrw,10), addr:"504 Chestnut Hill Rd, Villanova PA 19085", total:185, empIds:[empIds.maria],   recurrence:"biweekly" });
    await createJob({ cid:custIds.c41, status:"scheduled", start:setTime(tmrw,6,30), addr:"425 Lancaster Ave, Wayne PA 19087",      total:385, empIds:[empIds.maria, empIds.rosa], recurrence:"weekly", notes:"Medical office — hospital-grade products required. Before 7am." });
    await createJob({ cid:custIds.c4,  status:"scheduled", start:setTime(tmrw,13), addr:"15 Fox Hollow Lane, Malvern PA 19355",     total:210, empIds:[empIds.destiny], recurrence:"biweekly" });

    // Historical biweekly jobs
    for (const k of biweeklyKeys) {
      const c = custDefs.find(x=>x.key===k)!;
      const numJobs = Math.min((c.mo||6)*2, 16);
      for (let i=numJobs; i>=1; i--) {
        const jobDate = nextWeekday(daysAgo(i*14 + Math.floor(Math.random()*2)));
        const h = 8+Math.floor(Math.random()*5);
        const start = setTime(jobDate,h);
        await createJob({ cid:custIds[k], qid:quoteIds[`q_${k}`], status:"completed",
          start, completedAt:new Date(start.getTime()+2.5*3600_000),
          addr:c.addr, total:c.avg, recurrence:"biweekly" });
      }
    }

    // Historical monthly jobs
    for (const k of monthlyKeys) {
      const c = custDefs.find(x=>x.key===k)!;
      const numJobs = Math.min(c.mo||5, 8);
      for (let i=numJobs; i>=1; i--) {
        const jobDate = nextWeekday(daysAgo(i*30 + Math.floor(Math.random()*3)));
        const h = 9+Math.floor(Math.random()*5);
        const start = setTime(jobDate,h);
        await createJob({ cid:custIds[k], qid:quoteIds[`q_${k}`], status:"completed",
          start, completedAt:new Date(start.getTime()+3*3600_000),
          addr:c.addr, total:c.avg, recurrence:"monthly" });
      }
    }

    // Commercial weekly jobs
    for (const { k, addr, total, eid } of [
      { k:"c41", addr:"425 Lancaster Ave, Wayne PA 19087",   total:385, eid:empIds.ashley },
      { k:"c42", addr:"88 W Lancaster Ave, Paoli PA 19301",   total:275, eid:empIds.maria },
      { k:"c44", addr:"571 Lancaster Ave, Devon PA 19333",    total:420, eid:empIds.destiny },
      { k:"c45", addr:"33 Waterloo Rd, Berwyn PA 19312",      total:510, eid:empIds.ashley },
    ]) {
      for (let i=28; i>=1; i--) {
        const jobDate = nextWeekday(daysAgo(i*7));
        const start = setTime(jobDate,7);
        await createJob({ cid:custIds[k], status:"completed", start,
          completedAt:new Date(start.getTime()+2*3600_000),
          addr, total, recurrence:"weekly", empIds:[eid] });
      }
    }

    // Commercial biweekly c43
    for (let i=16; i>=1; i--) {
      const jobDate = nextWeekday(daysAgo(i*14));
      const start = setTime(jobDate,8);
      await createJob({ cid:custIds.c43, status:"completed", start,
        completedAt:new Date(start.getTime()+2*3600_000),
        addr:"214 E Lancaster Ave, Paoli PA 19301", total:320, recurrence:"biweekly" });
    }

    // One-time past jobs
    for (const [k, addr, total, daysBack] of [
      ["c31","847 Lancaster Ave, Berwyn PA 19312",    520, 90],
      ["c32","234 Forest Rd, Narberth PA 19072",      285, 120],
      ["c33","19 Mill Rd, Exton PA 19341",            650, 60],
      ["c34","445 W Wayne Ave, Wayne PA 19087",       285, 150],
      ["c35","273 Gulph Mills Rd, King of Prussia",   580, 180],
      ["c37","334 Glenhardie Rd, Wayne PA 19087",     195, 210],
      ["c39","156 Paoli Pike, Paoli PA 19301",        195, 120],
      ["c40","892 Cathcart Rd, Blue Bell PA 19422",   275, 90],
      ["c46","124 Bridge Rd, Phoenixville PA 19460",  195, 45],
    ] as [string,string,number,number][]) {
      const jobDate = nextWeekday(daysAgo(daysBack));
      const start = setTime(jobDate,10);
      const jid = await createJob({ cid:custIds[k], status:"completed", start,
        completedAt:new Date(start.getTime()+3*3600_000), addr, total });
      completedJobIds[k] = jid;
    }

    // Monthly c47
    for (let i=5; i>=1; i--) {
      const jobDate = nextWeekday(daysAgo(i*30));
      const start = setTime(jobDate,9);
      await createJob({ cid:custIds.c47, status:"completed", start,
        completedAt:new Date(start.getTime()+2.5*3600_000),
        addr:"892 DeKalb Pike, Blue Bell PA 19422", total:340, recurrence:"monthly" });
    }

    // Future scheduled jobs (next 4 weeks)
    for (const k of ["c1","c2","c4","c5","c6","c7","c8","c10","c11","c12","c13","c15","c16","c17","c18"]) {
      const c = custDefs.find(x=>x.key===k)!;
      for (const dOut of [14,28]) {
        const jobDate = nextWeekday(daysFromNow(dOut));
        await createJob({ cid:custIds[k], status:"scheduled",
          start:setTime(jobDate, 9+Math.floor(Math.random()*4)),
          addr:c.addr, total:c.avg, recurrence:"biweekly" });
      }
    }
    for (const k of ["c19","c21","c23","c25","c26","c28","c29","c30"]) {
      const c = custDefs.find(x=>x.key===k)!;
      const jobDate = nextWeekday(daysFromNow(15+Math.floor(Math.random()*10)));
      await createJob({ cid:custIds[k], status:"scheduled", start:setTime(jobDate,10), addr:c.addr, total:c.avg, recurrence:"monthly" });
    }

    log(`[pristine-demo] ${jobCount} jobs seeded`);

    // ── Growth Tasks ──────────────────────────────────────────
    async function createTask(p: {
      cid?:string; qid?:string; jid?:string; type:string; status:string;
      dueAt:Date; priority:number; val:number; msg?:string; meta?:Record<string,unknown>;
    }) {
      await client.query(
        `INSERT INTO growth_tasks (id,business_id,customer_id,quote_id,job_id,type,status,
           due_at,priority,estimated_value,message,metadata,escalation_stage,max_escalation,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1,4,NOW(),NOW())`,
        [uuid(), businessId, p.cid||null, p.qid||null, p.jid||null,
         p.type, p.status, p.dueAt, p.priority, p.val,
         p.msg||null, JSON.stringify(p.meta||{})]
      );
    }

    // OVERDUE (7)
    await createTask({ cid:custIds.c36, qid:quoteIds.q_c36, type:"quote_follow_up",   status:"pending", dueAt:daysAgo(3),  priority:92, val:165, msg:"Follow up on quote — no response after 5 days",                  meta:{customerName:"Monica Reyes"} });
    await createTask({ cid:custIds.c38, qid:quoteIds.q_c38, type:"quote_follow_up",   status:"pending", dueAt:daysAgo(5),  priority:88, val:285, msg:"Follow up on deep clean quote — 8 days with no reply",            meta:{customerName:"Heather Simmons"} });
    await createTask({ cid:custIds.c3,  jid:patriciaJobId,  type:"review_request",    status:"pending", dueAt:daysAgo(2),  priority:85, val:0,   msg:"Request review from Patricia Nguyen — just completed job",        meta:{customerName:"Patricia Nguyen"} });
    await createTask({ cid:custIds.c40, qid:quoteIds.q_c40, type:"rebook_nudge",      status:"pending", dueAt:daysAgo(1),  priority:78, val:175, msg:"Pitch biweekly recurring — Catherine did one deep clean 3 months ago", meta:{customerName:"Catherine Duffy"} });
    await createTask({ cid:custIds.c32,                      type:"reactivation",      status:"pending", dueAt:daysAgo(4),  priority:72, val:285, msg:"Reactivation — Samantha Cruz has been dormant for 4 months",       meta:{customerName:"Samantha Cruz"} });
    await createTask({ cid:custIds.c37,                      type:"reactivation",      status:"pending", dueAt:daysAgo(6),  priority:65, val:195, msg:"Win-back — Charles & Vivian Park, 7 months dormant",              meta:{customerName:"Charles Park"} });
    await createTask({ cid:custIds.c1,                       type:"upsell",            status:"pending", dueAt:daysAgo(1),  priority:70, val:320, msg:"Upsell deep clean — Sarah has been a client for 8 months with no deep clean", meta:{customerName:"Sarah Mitchell"} });

    // DUE TODAY (5)
    await createTask({ cid:custIds.c45, qid:quoteIds.q_c45, type:"quote_follow_up",   status:"pending", dueAt:setTime(today,10), priority:95, val:510, msg:"Priority follow-up — Berwyn Athletic Club weekly upgrade", meta:{customerName:"Berwyn Athletic Club"} });
    await createTask({ cid:custIds.c7,  jid:jenniferJobId,  type:"review_request",    status:"pending", dueAt:setTime(today,17), priority:82, val:0,   msg:"Request review from Jennifer Walsh after today's job",   meta:{customerName:"Jennifer Walsh"} });
    await createTask({ cid:custIds.c34,                      type:"rebook_nudge",      status:"pending", dueAt:setTime(today,9),  priority:75, val:285, msg:"Rebook nudge — Emma Johansson, 5 months dormant",        meta:{customerName:"Emma Johansson"} });
    await createTask({ cid:custIds.c2,                       type:"referral_ask",      status:"pending", dueAt:setTime(today,11), priority:68, val:200, msg:"Referral ask — James Hoffman, great relationship",       meta:{customerName:"James Hoffman"} });
    await createTask({ cid:custIds.c13,                      type:"upsell",            status:"pending", dueAt:setTime(today,14), priority:72, val:150, msg:"Upsell add-ons for Lisa Greenbaum — no add-ons ever",    meta:{customerName:"Lisa Greenbaum"} });

    // UPCOMING (11)
    const upcoming = [
      { k:"c9",  type:"review_request", d:1, p:78, v:0,   m:"Review request — Kathleen Donahue",                  name:"Kathleen Donahue" },
      { k:"c6",  type:"rebook_nudge",   d:2, p:72, v:240, m:"Rebook nudge — Thomas Burke, quarterly deep clean",   name:"Thomas Burke" },
      { k:"c20", type:"reactivation",   d:2, p:65, v:225, m:"Reactivation — Karen Silverman",                      name:"Karen Silverman" },
      { k:"c11", type:"upsell",         d:3, p:70, v:130, m:"Upsell inside oven + fridge — Susan Caldwell",        name:"Susan Caldwell" },
      { k:"c17", type:"referral_ask",   d:3, p:62, v:175, m:"Referral ask — Steven Whitman",                       name:"Steven Whitman" },
      { k:"c24", type:"rebook_nudge",   d:4, p:68, v:185, m:"Monthly nudge — Gloria Washington due soon",          name:"Gloria Washington" },
      { k:"c15", type:"review_request", d:5, p:75, v:0,   m:"Review request — Nancy DiSantis",                     name:"Nancy DiSantis" },
      { k:"c29", type:"upsell",         d:5, p:65, v:290, m:"Upsell deep clean — George Hartwell",                 name:"George Hartwell" },
      { k:"c21", type:"referral_ask",   d:6, p:60, v:200, m:"Referral ask — Mark Antonelli",                       name:"Mark Antonelli" },
      { k:"c44", type:"rebook_nudge",   d:7, p:73, v:420, m:"Commercial follow-up — Devon Dental, contract renewal",name:"Devon Dental" },
      { k:"c8",  type:"review_request", d:7, p:70, v:0,   m:"Review request — Michael Thompson",                   name:"Michael Thompson" },
    ];
    for (const t of upcoming) {
      await createTask({ cid:custIds[t.k], type:t.type, status:"pending", dueAt:daysFromNow(t.d), priority:t.p, val:t.v, msg:t.m, meta:{customerName:t.name} });
    }
    log(`[pristine-demo] 23 growth tasks seeded`);

    // ── Review Requests ───────────────────────────────────────
    const reviewDefs = [
      { k:"c1",  jk:null,  r:5, txt:"Ashley and her team are amazing! My house is spotless every time. Maria is incredibly thorough.", wk:6 },
      { k:"c3",  jk:"c3",  r:5, txt:"Rosa always does a beautiful job. I've been using Pristine for 7 months and wouldn't switch for anything.", wk:3 },
      { k:"c7",  jk:null,  r:5, txt:"Reliable, professional, and my home always looks perfect. Worth every penny.", wk:5 },
      { k:"c2",  jk:null,  r:4, txt:"Great service overall. Would give 5 stars but we had one reschedule. Always communicative.", wk:4 },
      { k:"c6",  jk:null,  r:5, txt:"Best cleaning service on the Main Line. Highly recommend!", wk:2 },
      { k:"c13", jk:null,  r:5, txt:"As someone in the interior design industry, I have very high standards. Pristine meets all of them.", wk:3 },
      { k:"c41", jk:null,  r:5, txt:"Our medical office requires exceptional cleanliness. Pristine delivers every week without fail.", wk:4 },
      { k:"c33", jk:"c33", r:4, txt:"Great job on a huge post-construction mess. Took longer than expected but results were excellent.", wk:8 },
    ];
    for (const rv of reviewDefs) {
      const createdAt = new Date(Date.now() - rv.wk*7*24*3600_000);
      await client.query(
        `INSERT INTO review_requests (id,business_id,customer_id,job_id,status,rating,feedback_text,review_clicked,referral_sent,created_at,updated_at)
         VALUES ($1,$2,$3,$4,'completed',$5,$6,true,false,$7,$7)`,
        [uuid(), businessId, custIds[rv.k], rv.jk ? (completedJobIds[rv.jk]||null) : null, rv.r, rv.txt, createdAt]
      );
    }
    log(`[pristine-demo] ${reviewDefs.length} reviews seeded`);

    // ── Campaigns ─────────────────────────────────────────────
    const dormantIds = [custIds.c31,custIds.c32,custIds.c34,custIds.c35,custIds.c37,custIds.c39,custIds.c40,custIds.c46];
    const lostIds    = [custIds.c36,custIds.c38,custIds.c39,custIds.c40,custIds.c34];
    await client.query(
      `INSERT INTO campaigns (id,business_id,name,segment,channel,status,task_count,completed_count,message_subject,message_content,customer_ids,created_at,updated_at)
       VALUES ($1,$2,'Spring Re-Engagement 2026','dormant','sms','sent',8,8,$3,$4,$5,$6,$6)`,
      [uuid(), businessId,
       "We miss you — spring is a great time for a fresh start",
       "Hi [Name], it's been a while since we've had the pleasure of cleaning your home. Spring is here and we'd love to get you back on the schedule. As a returning client, mention this message for $25 off your next clean. — Ashley at Pristine Home Cleaning",
       JSON.stringify(dormantIds), daysAgo(21)]
    );
    await client.query(
      `INSERT INTO campaigns (id,business_id,name,segment,channel,status,task_count,completed_count,message_subject,message_content,customer_ids,created_at,updated_at)
       VALUES ($1,$2,'Lost Quote Recovery — March','lost','sms','sent',5,5,$3,$4,$5,$6,$6)`,
      [uuid(), businessId,
       "Still interested in a cleaning quote?",
       "Hi [Name], we noticed your quote is still open. We'd love to help — can we answer any questions? Reply anytime. — Ashley",
       JSON.stringify(lostIds), daysAgo(7)]
    );
    await client.query(
      `INSERT INTO campaigns (id,business_id,name,segment,channel,status,message_subject,created_at,updated_at)
       VALUES ($1,$2,'Summer Deep Clean Promo','dormant','sms','draft','Summer is coming — time for a deep clean?',NOW(),NOW())`,
      [uuid(), businessId]
    );
    await client.query(
      `INSERT INTO campaigns (id,business_id,name,segment,channel,status,message_subject,customer_ids,created_at,updated_at)
       VALUES ($1,$2,'Win-Back — Long Dormant','custom','sms','draft','We want to win you back',$3,NOW(),NOW())`,
      [uuid(), businessId, JSON.stringify([custIds.c34,custIds.c35,custIds.c37])]
    );
    log(`[pristine-demo] 4 campaigns seeded`);

    // ── Growth Automation & Sales Strategy ────────────────────
    await client.query("DELETE FROM growth_automation_settings WHERE business_id=$1", [businessId]);
    await client.query(
      `INSERT INTO growth_automation_settings (id,business_id,marketing_mode_enabled,
         abandoned_quote_recovery,weekly_reactivation,review_request_workflow,referral_ask_workflow,
         rebook_nudges,upsell_triggers,quiet_hours_start,quiet_hours_end,max_sends_per_day,
         max_follow_ups_per_quote,created_at,updated_at)
       VALUES ($1,$2,true,true,true,true,true,true,true,'21:00','08:00',5,4,NOW(),NOW())`,
      [uuid(), businessId]
    );
    await client.query("DELETE FROM sales_strategy_settings WHERE business_id=$1", [businessId]);
    await client.query(
      `INSERT INTO sales_strategy_settings (id,business_id,selected_profile,escalation_enabled,created_at,updated_at)
       VALUES ($1,$2,'professional',true,NOW(),NOW())`,
      [uuid(), businessId]
    );

    log(`[pristine-demo] ✅ Full demo dataset seeded — 47 customers, ${jobCount} jobs, 23 tasks, 8 reviews, 4 campaigns`);
  } catch (e: any) {
    console.error("[pristine-demo] Seed error:", e.message);
  } finally {
    client.release();
  }
}
