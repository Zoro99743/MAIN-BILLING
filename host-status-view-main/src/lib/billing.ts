// Billing engine — per-person rule.
// Every person has their own joinedAt (and optional leftAt). For each person:
//   • first 60 minutes of THEIR presence is billed at their `firstHourRate`
//   • every minute beyond that is billed at the session's `subsequentRate`
// All amounts are pro-rated to the minute (fair, exact).
//
// If a session has no `persons` array (legacy data), we synthesise one from
// `adults` + `kids` + `pricing.memberRates` so old sessions still bill correctly.

import type { Bill, BillLine, Person, Session } from "./types";
import { MENU_ITEMS } from "./types";

const MS_PER_MIN = 60_000;
const round = (n: number) => Math.round(n * 100) / 100;

export function ensurePersons(s: Session): Person[] {
  if (s.persons && s.persons.length) return s.persons;
  const persons: Person[] = [];
  const rates = s.pricing.memberRates ?? [];
  for (let i = 0; i < s.adults; i++) {
    persons.push({
      id: `p-${i}`,
      label: String.fromCharCode(65 + i),
      kind: "adult",
      joinedAt: s.startedAt,
      firstHourRate: rates[i] ?? s.pricing.adultRate,
    });
  }
  for (let j = 0; j < s.kids; j++) {
    const i = s.adults + j;
    persons.push({
      id: `p-${i}`,
      label: String.fromCharCode(65 + i),
      kind: "kid",
      joinedAt: s.startedAt,
      firstHourRate: rates[i] ?? s.pricing.kidRate,
    });
  }
  return persons;
}

export interface PersonCharge {
  person: Person;
  presentMin: number;
  firstHourMin: number;
  extraMin: number;
  firstHourAmt: number;
  extraAmt: number;
  total: number;
}

export function chargeForPerson(p: Person, sessionEnd: number, subsequentRate: number): PersonCharge {
  const end = Math.min(p.leftAt ?? sessionEnd, sessionEnd);
  const presentMs = Math.max(0, end - p.joinedAt);
  const presentMin = presentMs / MS_PER_MIN;
  const firstHourMin = Math.min(60, presentMin);
  const extraMin = Math.max(0, presentMin - 60);
  const firstHourAmt = round((firstHourMin / 60) * p.firstHourRate);
  const extraAmt = round((extraMin / 60) * subsequentRate);
  return {
    person: p,
    presentMin,
    firstHourMin,
    extraMin,
    firstHourAmt,
    extraAmt,
    total: round(firstHourAmt + extraAmt),
  };
}

export function computeBill(s: Session, endedAt: number = Date.now()): Bill {
  const persons = ensurePersons(s);
  const sessionEnd = Math.min(endedAt, s.endedAt ?? endedAt);
  const subsequent = s.pricing.subsequentRate ?? 99;

  const lines: BillLine[] = [];
  const charges = persons.map((p) => chargeForPerson(p, sessionEnd, subsequent));

  for (const c of charges) {
    if (c.presentMin <= 0) continue;
    const totalHrs = round(c.presentMin / 60);
    // One line per person — easy to read on receipt.
    const desc =
      c.extraMin > 0
        ? `Person ${c.person.label} (1h@₹${c.person.firstHourRate} + ${(c.extraMin / 60).toFixed(2)}h@₹${subsequent})`
        : `Person ${c.person.label}`;
    lines.push({
      label: desc,
      qty: totalHrs,
      rate: c.extraMin > 0 ? subsequent : c.person.firstHourRate,
      amount: c.total,
    });
  }

  if (s.menuOrders) {
    for (const [itemId, qty] of Object.entries(s.menuOrders)) {
      if (!qty || qty <= 0) continue;
      const item = MENU_ITEMS.find((m) => m.id === itemId);
      if (!item) continue;
      lines.push({
        label: item.label,
        qty,
        rate: item.price,
        amount: round(qty * item.price),
      });
    }
  }

  const subtotal = round(lines.reduce((a, l) => a + l.amount, 0));
  const totalMin = Math.max(0, (sessionEnd - s.startedAt) / MS_PER_MIN);

  return {
    sessionId: s.id,
    customerName: s.customerName,
    customerMobile: s.customerMobile,
    tables: s.tableIds,
    startedAt: s.startedAt,
    endedAt: sessionEnd,
    durationMin: round(totalMin),
    lines,
    subtotal,
    total: subtotal,
  };
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// helper exported for UI summaries
export function summarisePersons(s: Session, now: number = Date.now()) {
  const persons = ensurePersons(s);
  const subsequent = s.pricing.subsequentRate ?? 99;
  return persons.map((p) => ({
    ...chargeForPerson(p, Math.min(now, s.endedAt ?? now), subsequent),
    active: !p.leftAt,
  }));
}
