import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

// ---- Period report (Daily / Weekly / Monthly) ----------------------------
// Grouped by customer (alphabetical); under each customer, each loan with its
// entries for the period and a subtotal. Grand totals at the end.
export function periodReportPdf({ range, rows, given }) {
  const doc = baseDoc()
  const label = { today: 'Daily', week: 'Weekly', month: 'Monthly' }[range] || range
  let y = 48
  doc.text(`${label} Report`, 40, y)
  doc.setFont('helvetica', 'normal').setFontSize(10)
  y += 16
  doc.text(`Generated: ${today()}`, 40, y)

  // Group rows: customer -> loan -> entries
  const customers = []
  const cIndex = {}
  for (const r of rows) {
    if (!(r.customer_id in cIndex)) {
      cIndex[r.customer_id] = customers.length
      customers.push({ id: r.customer_id, name: r.customer_name, phone: r.phone, loans: [], lIndex: {} })
    }
    const c = customers[cIndex[r.customer_id]]
    if (!(r.loan_id in c.lIndex)) {
      c.lIndex[r.loan_id] = c.loans.length
      c.loans.push({ id: r.loan_id, frequency: r.frequency, entries: [] })
    }
    c.loans[c.lIndex[r.loan_id]].entries.push(r)
  }

  let grandCollected = 0

  if (customers.length === 0) {
    autoTable(doc, { ...tableStyle, startY: y + 12, body: [['No collections in this period']] })
    y = doc.lastAutoTable.finalY
  }

  customers.forEach((c) => {
    doc.setFont('helvetica', 'bold').setFontSize(12)
    y += 22
    doc.text(`${c.name}${c.phone ? ` · ${c.phone}` : ''}`, 40, y)
    let custTotal = 0

    c.loans.forEach((loan, i) => {
      doc.setFont('helvetica', 'normal').setFontSize(9)
      const body = loan.entries.map((e) => {
        custTotal += Number(e.amount)
        grandCollected += Number(e.amount)
        return [d(e.entry_date), rs(e.amount), e.member_name || '', e.note || '']
      })
      autoTable(doc, {
        ...tableStyle,
        startY: y + 6,
        head: [[`Loan ${i + 1} (${loan.frequency}) — Date`, 'Amount', 'Collected by', 'Note']],
        body
      })
      y = doc.lastAutoTable.finalY
    })

    doc.setFont('helvetica', 'bold').setFontSize(10)
    y += 14
    doc.text(`Subtotal for ${c.name}: ${rs(custTotal)}`, 40, y)
  })

  // Grand totals
  doc.setFont('helvetica', 'bold').setFontSize(12)
  y += 28
  doc.text('Totals', 40, y)
  autoTable(doc, {
    ...tableStyle,
    startY: y + 6,
    head: [['Collected (in)', 'New loans given (out)', 'Net']],
    body: [[rs(grandCollected), rs(given), rs(grandCollected - given)]]
  })

  save(doc, `Report_${label}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

function safe(name) {
  return String(name).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
}
