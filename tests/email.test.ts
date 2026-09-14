import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { proposalEmail, invoiceEmail, paymentReminderEmail, passwordResetEmail } from "@/lib/email";

describe("proposalEmail", () => {
  test("greets a named contact by name", async () => {
    const { html } = await proposalEmail({
      contactName: "Priya",
      number: "PRO-0007",
      title: "Website rebuild",
      total: "$4,200.00",
      shareUrl: "https://example.com/p/abc123",
    });
    assert.match(html, /Hi Priya,/);
    assert.doesNotMatch(html, /Hello,/);
  });

  test("falls back to a plain greeting with no contact on file", async () => {
    const { html } = await proposalEmail({
      contactName: null,
      number: "PRO-0007",
      title: "Website rebuild",
      total: "$4,200.00",
      shareUrl: "https://example.com/p/abc123",
    });
    assert.match(html, /Hello,/);
  });

  test("subject and body carry the proposal's own number, title and total", async () => {
    const { subject, html } = await proposalEmail({
      contactName: "Priya",
      number: "PRO-0007",
      title: "Website rebuild",
      total: "$4,200.00",
      shareUrl: "https://example.com/p/abc123",
    });
    assert.match(subject, /PRO-0007/);
    assert.match(html, /PRO-0007/);
    assert.match(html, /Website rebuild/);
    assert.match(html, /\$4,200\.00/);
    assert.match(html, /https:\/\/example\.com\/p\/abc123/);
  });
});

describe("invoiceEmail", () => {
  test("states the due date only when one exists", async () => {
    const withDue = await invoiceEmail({
      contactName: "Sam",
      number: "INV-0012",
      title: "Retainer — March",
      amountDue: "$1,500.00",
      dueDate: "31 Mar 2026",
      viewUrl: "https://example.com/invoices/1",
    });
    assert.match(withDue.html, /by <strong>31 Mar 2026<\/strong>/);

    const noDue = await invoiceEmail({
      contactName: "Sam",
      number: "INV-0012",
      title: "Retainer — March",
      amountDue: "$1,500.00",
      dueDate: null,
      viewUrl: "https://example.com/invoices/1",
    });
    assert.doesNotMatch(noDue.html, /by <strong>/);
  });
});

describe("paymentReminderEmail — lateness wording", () => {
  test("a bill not yet due reads as due shortly, not late", async () => {
    const { html } = await paymentReminderEmail({
      contactName: "Jo",
      number: "INV-0020",
      amountDue: "$800.00",
      dueDate: "1 Oct 2026",
      daysLate: 0,
      viewUrl: "https://example.com/invoices/2",
    });
    assert.match(html, /is due shortly/);
  });

  test("freshly overdue is described mildly rather than with a day count", async () => {
    const { html } = await paymentReminderEmail({
      contactName: "Jo",
      number: "INV-0020",
      amountDue: "$800.00",
      dueDate: "1 Sep 2026",
      daysLate: 5,
      viewUrl: "https://example.com/invoices/2",
    });
    assert.match(html, /is a little overdue/);
    assert.doesNotMatch(html, /5 days past/);
  });

  test("30+ days late states the exact count instead of staying vague", async () => {
    const { html } = await paymentReminderEmail({
      contactName: "Jo",
      number: "INV-0020",
      amountDue: "$800.00",
      dueDate: "1 Aug 2026",
      daysLate: 45,
      viewUrl: "https://example.com/invoices/2",
    });
    assert.match(html, /now 45 days past its due date/);
  });

  test("the boundary itself (30) already reads as an exact count", async () => {
    const { html } = await paymentReminderEmail({
      contactName: "Jo",
      number: "INV-0020",
      amountDue: "$800.00",
      dueDate: "1 Aug 2026",
      daysLate: 30,
      viewUrl: "https://example.com/invoices/2",
    });
    assert.match(html, /now 30 days past its due date/);
  });
});

describe("passwordResetEmail", () => {
  test("makes clear the link is single-use and short-lived", async () => {
    const { html } = await passwordResetEmail({
      name: "Dana",
      resetUrl: "https://example.com/reset-password/xyz",
    });
    assert.match(html, /Hi Dana,/);
    assert.match(html, /works once and\s*\n?\s*expires in an hour/);
    assert.match(html, /https:\/\/example\.com\/reset-password\/xyz/);
  });
});
