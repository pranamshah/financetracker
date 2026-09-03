import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { fmt } from './calc.js'

// Use "Rs." rather than the ₹ glyph: the built-in PDF fonts don't include the
// rupee symbol, and embedding a font would bloat the file. Plain text + tables
// only keeps each PDF tiny (typically well under 100 KB).
const rs = (n) => `Rs. ${fmt(n)}`
const d = (v) => (v ? new Date(v).toLocaleDateString() : '')
const today = () => new Date().toLocaleDateString()

function baseDoc() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  doc.setFont('helvetica', 'bold').setFontSize(16)
  return doc
}

const tableStyle = {
  theme: 'grid',
  styles: { fontSize: 9, cellPadding: 3 },
  headStyles: { fillColor: [22, 163, 74], textColor: 255, fontSize: 9 },
  margin: { left: 40, right: 40 }
}

function save(doc, name) {
  doc.save(name)
}

// ---- Per-customer full history -------------------------------------------
// One file: customer info header, then each loan in order with its summary
// block followed by a table of every entry under that loan.
export function customerHistoryPdf({ customer, loans, entries }) {
  const doc = baseDoc()
  let y = 48
  doc.text('Customer History', 40, y)
  doc.setFont('helvetica', 'normal').setFontSize(10)
  y += 18
  doc.text(`Name: ${customer.name}`, 40, y); y += 14
  if (customer.phone) { doc.text(`Phone: ${customer.phone}`, 40, y); y += 14 }
  if (customer.address) { doc.text(`Address: ${customer.address}`, 40, y); y += 14 }
  doc.text(`Generated: ${today()}`, 40, y); y += 10

  const byLoan = (loanId) => entries.filter((e) => e.loan_id === loanId)

  loans.forEach((l, i) => {
    const collected = Number(l.collected ?? 0)
    const balance = Number(l.total_to_receive) - collected
    doc.setFont('helvetica', 'bold').setFontSize(11)
    y += 20
    doc.text(`Loan ${i + 1} — ${l.frequency} (${l.status})`, 40, y)
    doc.setFont('helvetica', 'normal').setFontSize(9)

    autoTable(doc, {
      ...tableStyle,
      startY: y + 6,
      head: [['Given', 'Interest', 'Total', 'Collected', 'Balance', 'Start']],
      body: [[
        rs(l.amount_given), rs(l.interest_amount), rs(l.total_to_receive),
        rs(collected), rs(balance), d(l.start_date)
      ]]
    })
    y = doc.lastAutoTable.finalY

    const rows = byLoan(l.id).map((e) => [d(e.entry_date), rs(e.amount), e.member_name || '', e.note || ''])
    autoTable(doc, {
      ...tableStyle,
      startY: y + 4,
      head: [['Date', 'Amount', 'Collected by', 'Note']],
      body: rows.length ? rows : [['—', 'No collections', '', '']]
    })
    y = doc.lastAutoTable.finalY
  })

  save(doc, `${safe(customer.name)}_History.pdf`)
}

// ---- Single loan history --------------------------------------------------
export function loanHistoryPdf({ customer, loan, entries, index = 1 }) {
  const doc = baseDoc()
  let y = 48
  doc.text('Loan History', 40, y)
  doc.setFont('helvetica', 'normal').setFontSize(10)
  y += 18
  doc.text(`Customer: ${customer.name}`, 40, y); y += 14
  doc.text(`Generated: ${today()}`, 40, y)

  const collected = Number(loan.collected ?? 0)
  const balance = Number(loan.total_to_receive) - collected
  autoTable(doc, {
    ...tableStyle, startY: y + 8,
    head: [['Given', 'Interest', 'Total', 'Collected', 'Balance', 'Start']],
    body: [[rs(loan.amount_given), rs(loan.interest_amount), rs(loan.total_to_receive),
            rs(collected), rs(balance), d(loan.start_date)]]
  })
  y = doc.lastAutoTable.finalY
  const rows = entries.filter((e) => e.loan_id === loan.id)
    .map((e) => [d(e.entry_date), rs(e.amount), e.member_name || '', e.note || ''])
  autoTable(doc, {
    ...tableStyle, startY: y + 4,
    head: [['Date', 'Amount', 'Collected by', 'Note']],
    body: rows.length ? rows : [['—', 'No collections', '', '']]
  })
  save(doc, `${safe(customer.name)}_Loan${index}.pdf`)
}

// ---- Period report (Daily / Weekly / Monthly) — grouped by DAY ------------
// Each day lists its entries (customer, amount, collected by) with a day
// subtotal; grand totals at the end.
export function periodReportPdf({ range, rows, given }) {
  const doc = baseDoc()
  const label = { today: 'Daily', week: 'Weekly', month: 'Monthly', all: 'All Data' }[range] || range
  let y = 48
  doc.text(`${label} Report`, 40, y)
  doc.setFont('helvetica', 'normal').setFontSize(10)
  y += 16
  doc.text(`Generated: ${today()}`, 40, y)

  // Group rows by day.
  const days = []
  const idx = {}
  for (const r of rows) {
    const key = String(r.entry_date).slice(0, 10)
    if (!(key in idx)) { idx[key] = days.length; days.push({ key, entries: [] }) }
    days[idx[key]].entries.push(r)
  }

  if (days.length === 0) {
    autoTable(doc, { ...tableStyle, startY: y + 12, body: [['No collections in this period']] })
    y = doc.lastAutoTable.finalY
  }

  days.forEach((day) => {
    doc.setFont('helvetica', 'bold').setFontSize(12)
    y += 22
    doc.text(d(day.key), 40, y)
    const body = day.entries.map((e) => [e.customer_name, rs(e.amount), e.member_name || '', e.note || ''])
    autoTable(doc, {
      ...tableStyle, startY: y + 6,
      head: [['Customer', 'Amount', 'Collected by', 'Note']],
      body
    })
    y = doc.lastAutoTable.finalY
  })

  save(doc, `Report_${label}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ---- Full backup: all customers, all loans, all entries (by customer) -----
export function allDataPdf({ customers, loans, entries }) {
  const doc = baseDoc()
  let y = 48
  doc.text('Finance Tracker — Full Backup', 40, y)
  doc.setFont('helvetica', 'normal').setFontSize(10)
  y += 16
  doc.text(`Generated: ${today()} · ${customers.length} customers`, 40, y)

  const loansByCust = {}
  for (const l of loans) (loansByCust[l.customer_id] ||= []).push(l)
  const entriesByLoan = {}
  for (const e of entries) (entriesByLoan[e.loan_id] ||= []).push(e)

  customers.forEach((c) => {
    if (y > 720) { doc.addPage(); y = 48 }
    doc.setFont('helvetica', 'bold').setFontSize(12)
    y += 22
    doc.text(`${c.name}${c.phone ? ` · ${c.phone}` : ''}`, 40, y)
    const cl = loansByCust[c.id] || []
    if (cl.length === 0) {
      doc.setFont('helvetica', 'normal').setFontSize(9)
      y += 14; doc.text('No loans', 40, y)
    }
    cl.forEach((l, i) => {
      const collected = Number(l.collected ?? 0)
      const balance = Number(l.total_to_receive) - collected
      autoTable(doc, {
        ...tableStyle, startY: y + 6,
        head: [[`Loan ${i + 1} — Given`, 'Total', 'Collected', 'Balance', 'Freq', 'Start']],
        body: [[rs(l.amount_given), rs(l.total_to_receive), rs(collected), rs(balance), l.frequency, d(l.start_date)]]
      })
      y = doc.lastAutoTable.finalY
      const es = entriesByLoan[l.id] || []
      autoTable(doc, {
        ...tableStyle, startY: y + 2,
        head: [['Date', 'Amount', 'Collected by', 'Note']],
        body: es.length ? es.map((e) => [d(e.entry_date), rs(e.amount), e.member_name || '', e.note || '']) : [['—', 'No collections', '', '']]
      })
      y = doc.lastAutoTable.finalY
    })
  })

  save(doc, `FinanceTracker_Backup_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ---- Excel: Period report (day-wise, same data as PDF) --------------------
export function periodReportXlsx({ range, rows }) {
  const label = { today: 'Daily', week: 'Weekly', month: 'Monthly', all: 'All_Data' }[range] || range
  const data = rows.map((r) => ({
    Date: String(r.entry_date).slice(0, 10),
    Customer: r.customer_name,
    'Amount (Rs)': Number(r.amount),
    'Collected By': r.member_name || '',
    Note: r.note || ''
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  // Column widths
  ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 24 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, label)
  XLSX.writeFile(wb, `Report_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ---- Excel: Full backup (customers + loans + entries) ----------------------
export function allDataXlsx({ customers, loans, entries }) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Customers
  const custSheet = XLSX.utils.json_to_sheet(customers.map((c) => ({
    Name: c.name, Phone: c.phone || ''
  })))
  custSheet['!cols'] = [{ wch: 28 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, custSheet, 'Customers')

  // Build name lookup
  const custName = {}
  for (const c of customers) custName[c.id] = c.name

  // Sheet 2: Loans
  const loanSheet = XLSX.utils.json_to_sheet(loans.map((l) => ({
    Customer: custName[l.customer_id] || l.customer_id,
    'Given (Rs)': Number(l.amount_given),
    'Interest (Rs)': Number(l.interest_amount),
    'Total (Rs)': Number(l.total_to_receive),
    'Collected (Rs)': Number(l.collected ?? 0),
    'Balance (Rs)': Number(l.total_to_receive) - Number(l.collected ?? 0),
    Frequency: l.frequency,
    'Start Date': String(l.start_date).slice(0, 10),
    Status: l.status
  })))
  loanSheet['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, loanSheet, 'Loans')

  // Sheet 3: All Entries
  const entrySheet = XLSX.utils.json_to_sheet(entries.map((e) => ({
    Date: String(e.entry_date).slice(0, 10),
    Customer: custName[e.customer_id] || e.customer_id,
    'Amount (Rs)': Number(e.amount),
    'Collected By': e.member_name || '',
    Note: e.note || ''
  })))
  entrySheet['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, entrySheet, 'Entries')

  XLSX.writeFile(wb, `FinanceTracker_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function safe(name) {
  return String(name).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
}
