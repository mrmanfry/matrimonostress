/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface TaskItem {
  title: string
  dueDate?: string | null
  priority?: string | null
  vendorName?: string | null
  category?: string | null
}
interface PaymentItem {
  description: string
  amount: string
  dueDate: string
  overdue?: boolean
  vendorName?: string | null
  installmentLabel?: string | null
}
interface AppointmentItem {
  title: string
  date: string
  time?: string | null
  location?: string | null
  vendorName?: string | null
}

interface Props {
  recipientName?: string
  weddingName?: string
  daysToWedding?: number
  motivationalMessage?: string
  weeklyTip?: string
  hasPartnerRole?: boolean
  overdueTasksCount?: number
  overduePaymentsTotal?: string
  upcomingTasks?: TaskItem[]
  sharedTasks?: TaskItem[]
  payments?: PaymentItem[]
  paymentsTotal?: string
  appointments?: AppointmentItem[]
  dashboardUrl?: string
}

const priorityBadge = (p?: string | null) =>
  p === 'must' ? '🔴 Must' : p === 'should' ? '🟠 Should' : p === 'could' ? '🔵 Could' : ''

const Email = ({
  recipientName = 'Ciao',
  weddingName = '',
  daysToWedding = 0,
  motivationalMessage = '',
  weeklyTip = '',
  hasPartnerRole = false,
  overdueTasksCount = 0,
  overduePaymentsTotal = '',
  upcomingTasks = [],
  sharedTasks = [],
  payments = [],
  paymentsTotal = '',
  appointments = [],
  dashboardUrl = 'https://wedsapp.it/app/checklist',
}: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Riepilogo settimanale — {daysToWedding} giorni al matrimonio</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Buon lunedì, {recipientName}</Heading>
          {motivationalMessage && <Text style={motiv}>{motivationalMessage}</Text>}
          {weddingName && <Text style={subtitle}>Il punto della situazione per <strong>{weddingName}</strong></Text>}
        </Section>

        <Section style={countdown}>
          <Text style={countNum}>{daysToWedding}</Text>
          <Text style={countLabel}>giorni al matrimonio</Text>
        </Section>

        <Section style={content}>
          {(overdueTasksCount > 0 || overduePaymentsTotal) && (
            <Section style={overdueBox}>
              <Text style={overdueTitle}>⚠️ Scaduti</Text>
              {overdueTasksCount > 0 && (
                <Text style={overdueText}><strong>{overdueTasksCount}</strong> task {hasPartnerRole ? 'tuoi' : ''} scaduti</Text>
              )}
              {overduePaymentsTotal && (
                <Text style={overdueText}>Pagamenti scaduti: <strong>{overduePaymentsTotal}</strong></Text>
              )}
            </Section>
          )}

          {upcomingTasks.length > 0 && (
            <>
              <Text style={sectionTitle}>📅 {hasPartnerRole ? 'I tuoi prossimi task' : 'Questa settimana'} ({upcomingTasks.length})</Text>
              {upcomingTasks.map((t, i) => (
                <Section key={i} style={taskItem}>
                  <Text style={taskTitle}>{t.title}</Text>
                  <Text style={taskMeta}>
                    {t.vendorName && `🏢 ${t.vendorName}   `}
                    {t.dueDate && `📅 ${t.dueDate}   `}
                    {priorityBadge(t.priority)}
                  </Text>
                </Section>
              ))}
            </>
          )}

          {hasPartnerRole && sharedTasks.length > 0 && (
            <>
              <Text style={sectionTitleShared}>👫 Da fare insieme ({sharedTasks.length})</Text>
              {sharedTasks.slice(0, 5).map((t, i) => (
                <Section key={i} style={sharedItem}>
                  <Text style={taskTitle}>{t.title}</Text>
                  {(t.vendorName || t.dueDate) && (
                    <Text style={taskMeta}>
                      {t.vendorName && `🏢 ${t.vendorName}   `}
                      {t.dueDate && `📅 ${t.dueDate}`}
                    </Text>
                  )}
                </Section>
              ))}
            </>
          )}

          {payments.length > 0 && (
            <>
              <Text style={sectionTitle}>💰 Pagamenti in scadenza {paymentsTotal && `(${paymentsTotal})`}</Text>
              {payments.map((p, i) => {
                const heading = [p.vendorName, p.installmentLabel || p.description].filter(Boolean).join(' — ')
                return (
                  <Section key={i} style={p.overdue ? paymentOverdue : paymentItem}>
                    <Text style={taskTitle}>{heading || p.description} — <strong>{p.amount}</strong></Text>
                    <Text style={taskMeta}>📅 {p.dueDate}{p.overdue ? ' (SCADUTO)' : ''}</Text>
                  </Section>
                )
              })}
            </>
          )}

          {appointments.length > 0 && (
            <>
              <Text style={sectionTitleApp}>📆 Appuntamenti questa settimana ({appointments.length})</Text>
              {appointments.map((a, i) => (
                <Section key={i} style={apptItem}>
                  <Text style={taskTitle}>{a.title}</Text>
                  <Text style={taskMeta}>
                    📅 {a.date}{a.time && ` ⏰ ${a.time}`}
                    {a.vendorName && `   🏢 ${a.vendorName}`}
                    {a.location && `   📍 ${a.location}`}
                  </Text>
                </Section>
              ))}
            </>
          )}

          {upcomingTasks.length === 0 && sharedTasks.length === 0 && payments.length === 0 && appointments.length === 0 && overdueTasksCount === 0 && (
            <Text style={emptyText}>Nessuna attività in programma questa settimana 🎉</Text>
          )}

          {weeklyTip && (
            <Section style={tipBox}>
              <Text style={tipText}>💡 <strong>Consiglio:</strong> {weeklyTip}</Text>
            </Section>
          )}

          <Hr style={hr} />
          <Section style={{ textAlign: 'center' as const }}>
            <Button style={button} href={dashboardUrl}>Gestisci Checklist</Button>
          </Section>
        </Section>

        <Text style={footer}>
          Ricevi questa email ogni lunedì come organizzatore del matrimonio.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => {
    const total = (d.upcomingTasks?.length ?? 0) + (d.sharedTasks?.length ?? 0)
      + (d.payments?.length ?? 0) + (d.appointments?.length ?? 0)
    return `Il tuo piano settimanale: ${total} attività${d.weddingName ? ` — ${d.weddingName}` : ''}`
  },
  displayName: 'Digest settimanale coppia',
  previewData: {
    recipientName: 'Marco',
    weddingName: 'Marco & Giulia',
    daysToWedding: 87,
    motivationalMessage: 'Questa sarà una settimana produttiva! 🚀',
    weeklyTip: 'Conferma tutti i dettagli con i fornitori e inizia a raccogliere le conferme RSVP.',
    hasPartnerRole: true,
    overdueTasksCount: 2,
    overduePaymentsTotal: '€ 1.200',
    upcomingTasks: [
      { title: 'Confermare menù catering', dueDate: '15 lug', priority: 'must', vendorName: 'Villa Aurora' },
      { title: 'Ritirare partecipazioni', dueDate: '17 lug', priority: 'should' },
    ],
    sharedTasks: [
      { title: 'Prova abito', dueDate: '19 lug' },
    ],
    payments: [
      { description: 'Villa Aurora — 2ª rata', amount: '€ 3.500', dueDate: '20 lug', overdue: false },
    ],
    paymentsTotal: '€ 3.500',
    appointments: [
      { title: 'Prova trucco', date: '16 lug', time: '15:00', vendorName: 'Beauty Lab', location: 'Milano' },
    ],
    dashboardUrl: 'https://wedsapp.it/app/checklist',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Lato', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto' }
const header = { background: 'hsl(243, 75%, 58%)', padding: '30px 28px', textAlign: 'center' as const, borderRadius: '12px 12px 0 0' }
const h1 = { color: '#ffffff', fontSize: '24px', margin: '0 0 8px', fontWeight: 'bold' as const }
const motiv = { color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontStyle: 'italic' as const, margin: '0 0 10px' }
const subtitle = { color: 'rgba(255,255,255,0.95)', fontSize: '15px', margin: 0 }
const countdown = { backgroundColor: '#ffffff', padding: '20px', textAlign: 'center' as const, borderBottom: '1px solid hsl(225, 30%, 92%)' }
const countNum = { fontSize: '48px', fontWeight: 'bold' as const, color: 'hsl(243, 75%, 58%)', margin: 0, lineHeight: '1' }
const countLabel = { fontSize: '12px', color: 'hsl(0, 0%, 45%)', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '4px 0 0' }
const content = { padding: '25px 28px' }
const overdueBox = { backgroundColor: '#FEE2E2', borderLeft: '4px solid #dc2626', padding: '14px 16px', marginBottom: '20px', borderRadius: '4px' }
const overdueTitle = { color: '#dc2626', margin: '0 0 8px', fontWeight: 'bold' as const, fontSize: '15px' }
const overdueText = { color: '#7F1D1D', margin: '4px 0', fontSize: '14px' }
const sectionTitle = { color: 'hsl(0, 0%, 20%)', fontSize: '15px', fontWeight: 'bold' as const, borderBottom: '2px solid hsl(243, 75%, 58%)', paddingBottom: '6px', margin: '20px 0 12px' }
const sectionTitleShared = { ...sectionTitle, borderBottomColor: '#10b981' }
const sectionTitleApp = { ...sectionTitle, borderBottomColor: '#8B5CF6' }
const taskItem = { padding: '10px 12px', marginBottom: '6px', backgroundColor: '#F9FAFB', borderRadius: '8px', borderLeft: '3px solid hsl(243, 75%, 58%)' }
const sharedItem = { ...taskItem, backgroundColor: '#ECFDF5', borderLeftColor: '#10b981' }
const paymentItem = { ...taskItem, borderLeftColor: '#F59E0B' }
const paymentOverdue = { ...taskItem, borderLeftColor: '#DC2626' }
const apptItem = { ...taskItem, backgroundColor: '#FAF5FF', borderLeftColor: '#8B5CF6' }
const taskTitle = { fontSize: '14px', color: 'hsl(0, 0%, 15%)', margin: 0, fontWeight: '600' as const }
const taskMeta = { fontSize: '12px', color: 'hsl(0, 0%, 45%)', margin: '2px 0 0' }
const emptyText = { textAlign: 'center' as const, color: 'hsl(0, 0%, 45%)', padding: '20px 0' }
const tipBox = { backgroundColor: '#F0F9FF', borderLeft: '4px solid #0EA5E9', padding: '14px 16px', margin: '20px 0', borderRadius: '4px' }
const tipText = { margin: 0, color: '#0369A1', fontSize: '14px' }
const hr = { borderColor: 'hsl(225, 30%, 92%)', margin: '20px 0' }
const button = {
  backgroundColor: 'hsl(243, 75%, 58%)', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '25px',
  padding: '14px 32px', textDecoration: 'none', display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 55%)', textAlign: 'center' as const, padding: '16px', margin: 0 }
