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

interface WeddingBlock {
  weddingName: string
  daysToWedding: number
  role: string
  hasPartnerRole?: boolean
  canFinance?: boolean
  canAppointments?: boolean
  canChecklist?: boolean
  overdueTasksCount?: number
  overduePaymentsTotal?: string
  upcomingTasks?: TaskItem[]
  sharedTasks?: TaskItem[]
  payments?: PaymentItem[]
  paymentsTotal?: string
  appointments?: AppointmentItem[]
}

interface Props {
  recipientName?: string
  motivationalMessage?: string
  weeklyTip?: string
  dashboardUrl?: string
  weddings?: WeddingBlock[]
}

const priorityBadge = (p?: string | null) =>
  p === 'must' ? '🔴 Must' : p === 'should' ? '🟠 Should' : p === 'could' ? '🔵 Could' : ''

const roleLabel = (r: string) =>
  r === 'co_planner' ? 'Sposi' : r === 'planner' ? 'Planner' : r === 'manager' ? 'Collaboratore' : r

const WeddingSection = ({ w }: { w: WeddingBlock }) => {
  const showTasks = w.canChecklist !== false && ((w.upcomingTasks?.length ?? 0) > 0 || (w.sharedTasks?.length ?? 0) > 0 || (w.overdueTasksCount ?? 0) > 0)
  const showPayments = !!w.canFinance && (w.payments?.length ?? 0) > 0
  const showAppointments = !!w.canAppointments && (w.appointments?.length ?? 0) > 0

  return (
    <Section style={weddingCard}>
      <Section style={weddingHeader}>
        <Text style={weddingName}>{w.weddingName}</Text>
        <Text style={weddingMeta}>
          <span style={roleBadge}>{roleLabel(w.role)}</span>
          <span style={{ marginLeft: 8 }}>{w.daysToWedding} giorni al matrimonio</span>
        </Text>
      </Section>

      {((w.overdueTasksCount ?? 0) > 0 || w.overduePaymentsTotal) && (
        <Section style={overdueBox}>
          <Text style={overdueTitle}>⚠️ Scaduti</Text>
          {(w.overdueTasksCount ?? 0) > 0 && (
            <Text style={overdueText}><strong>{w.overdueTasksCount}</strong> task {w.hasPartnerRole ? 'tuoi' : ''} scaduti</Text>
          )}
          {w.overduePaymentsTotal && (
            <Text style={overdueText}>Pagamenti scaduti: <strong>{w.overduePaymentsTotal}</strong></Text>
          )}
        </Section>
      )}

      {showTasks && (w.upcomingTasks?.length ?? 0) > 0 && (
        <>
          <Text style={sectionTitle}>📅 Task {w.hasPartnerRole ? 'tuoi' : ''} questa settimana ({w.upcomingTasks?.length})</Text>
          {w.upcomingTasks!.map((t, i) => (
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

      {showTasks && (w.sharedTasks?.length ?? 0) > 0 && (
        <>
          <Text style={sectionTitleShared}>👫 Da fare insieme ({w.sharedTasks?.length})</Text>
          {w.sharedTasks!.map((t, i) => (
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

      {showPayments && (
        <>
          <Text style={sectionTitle}>💰 Pagamenti {w.paymentsTotal && `(${w.paymentsTotal})`}</Text>
          {w.payments!.map((p, i) => {
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

      {showAppointments && (
        <>
          <Text style={sectionTitleApp}>📆 Appuntamenti ({w.appointments?.length})</Text>
          {w.appointments!.map((a, i) => (
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
    </Section>
  )
}

const Email = ({
  recipientName = 'Ciao',
  motivationalMessage = '',
  weeklyTip = '',
  dashboardUrl = 'https://wedsapp.it/app/checklist',
  weddings = [],
}: Props) => {
  const totalOverdue = weddings.reduce((s, w) => s + (w.overdueTasksCount ?? 0), 0)
  const nearest = weddings[0]

  return (
    <Html lang="it" dir="ltr">
      <Head />
      <Preview>Riepilogo settimanale — {weddings.length} matrimoni</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Buon lunedì, {recipientName}</Heading>
            {motivationalMessage && <Text style={motiv}>{motivationalMessage}</Text>}
            <Text style={subtitle}>
              {weddings.length === 1
                ? <>Il punto della settimana per <strong>{weddings[0].weddingName}</strong></>
                : <>Il punto della settimana su <strong>{weddings.length} matrimoni</strong></>}
            </Text>
          </Section>

          {nearest && (
            <Section style={countdown}>
              <Text style={countNum}>{nearest.daysToWedding}</Text>
              <Text style={countLabel}>giorni al prossimo matrimonio</Text>
            </Section>
          )}

          <Section style={content}>
            {totalOverdue > 0 && weddings.length > 1 && (
              <Section style={overdueBox}>
                <Text style={overdueTitle}>⚠️ In arretrato</Text>
                <Text style={overdueText}><strong>{totalOverdue}</strong> task scaduti tra tutti i matrimoni</Text>
              </Section>
            )}

            {weddings.map((w, i) => <WeddingSection key={i} w={w} />)}

            {weddings.length === 0 && (
              <Text style={emptyText}>Nessuna attività in programma questa settimana 🎉</Text>
            )}

            {weeklyTip && (
              <Section style={tipBox}>
                <Text style={tipText}>💡 <strong>Consiglio:</strong> {weeklyTip}</Text>
              </Section>
            )}

            <Hr style={hr} />
            <Section style={{ textAlign: 'center' as const }}>
              <Button style={button} href={dashboardUrl}>Apri WedsApp</Button>
            </Section>
          </Section>

          <Text style={footer}>
            Ricevi questa email ogni lunedì con il riepilogo dei matrimoni che segui.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => {
    const n = d.weddings?.length ?? 0
    if (n === 0) return `Il tuo piano settimanale`
    if (n === 1) return `Il tuo piano settimanale — ${d.weddings![0].weddingName}`
    return `Il tuo piano settimanale — ${n} matrimoni`
  },
  displayName: 'Digest settimanale',
  previewData: {
    recipientName: 'Marco',
    motivationalMessage: 'Buona settimana di lavoro.',
    weeklyTip: 'Conferma tutti i dettagli con i fornitori e inizia a raccogliere le conferme RSVP.',
    dashboardUrl: 'https://wedsapp.it/app/checklist',
    weddings: [
      {
        weddingName: 'Marco & Giulia',
        daysToWedding: 87,
        role: 'planner',
        hasPartnerRole: false,
        canFinance: true,
        canAppointments: true,
        canChecklist: true,
        overdueTasksCount: 2,
        overduePaymentsTotal: '€ 1.200',
        upcomingTasks: [
          { title: 'Confermare menù catering', dueDate: '15 lug', priority: 'must', vendorName: 'Villa Aurora' },
        ],
        sharedTasks: [],
        payments: [
          { description: 'Villa Aurora — 2ª rata', amount: '€ 3.500', dueDate: '20 lug', overdue: false },
        ],
        paymentsTotal: '€ 3.500',
        appointments: [
          { title: 'Prova trucco', date: '16 lug', time: '15:00', vendorName: 'Beauty Lab', location: 'Milano' },
        ],
      },
      {
        weddingName: 'Luca & Sara',
        daysToWedding: 142,
        role: 'planner',
        canFinance: true,
        canAppointments: true,
        canChecklist: true,
        upcomingTasks: [
          { title: 'Sopralluogo location', dueDate: '18 lug', priority: 'should' },
        ],
        payments: [],
        appointments: [],
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Lato', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '640px', margin: '0 auto' }
const header = { background: 'hsl(243, 75%, 58%)', padding: '30px 28px', textAlign: 'center' as const, borderRadius: '12px 12px 0 0' }
const h1 = { color: '#ffffff', fontSize: '24px', margin: '0 0 8px', fontWeight: 'bold' as const }
const motiv = { color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontStyle: 'italic' as const, margin: '0 0 10px' }
const subtitle = { color: 'rgba(255,255,255,0.95)', fontSize: '15px', margin: 0 }
const countdown = { backgroundColor: '#ffffff', padding: '20px', textAlign: 'center' as const, borderBottom: '1px solid hsl(225, 30%, 92%)' }
const countNum = { fontSize: '48px', fontWeight: 'bold' as const, color: 'hsl(243, 75%, 58%)', margin: 0, lineHeight: '1' }
const countLabel = { fontSize: '12px', color: 'hsl(0, 0%, 45%)', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '4px 0 0' }
const content = { padding: '25px 28px' }
const weddingCard = { border: '1px solid hsl(225, 30%, 92%)', borderRadius: '10px', padding: '18px', marginBottom: '18px', backgroundColor: '#ffffff' }
const weddingHeader = { marginBottom: '10px', borderBottom: '1px solid hsl(225, 30%, 94%)', paddingBottom: '8px' }
const weddingName = { fontSize: '17px', fontWeight: 'bold' as const, color: 'hsl(0, 0%, 15%)', margin: 0 }
const weddingMeta = { fontSize: '12px', color: 'hsl(0, 0%, 45%)', margin: '4px 0 0' }
const roleBadge = { display: 'inline-block' as const, padding: '2px 8px', borderRadius: '10px', backgroundColor: 'hsl(243, 75%, 96%)', color: 'hsl(243, 75%, 40%)', fontWeight: '600' as const, fontSize: '11px', textTransform: 'uppercase' as const }
const overdueBox = { backgroundColor: '#FEE2E2', borderLeft: '4px solid #dc2626', padding: '12px 14px', marginBottom: '14px', borderRadius: '4px' }
const overdueTitle = { color: '#dc2626', margin: '0 0 6px', fontWeight: 'bold' as const, fontSize: '14px' }
const overdueText = { color: '#7F1D1D', margin: '4px 0', fontSize: '13px' }
const sectionTitle = { color: 'hsl(0, 0%, 20%)', fontSize: '14px', fontWeight: 'bold' as const, borderBottom: '2px solid hsl(243, 75%, 58%)', paddingBottom: '5px', margin: '14px 0 8px' }
const sectionTitleShared = { ...sectionTitle, borderBottomColor: '#10b981' }
const sectionTitleApp = { ...sectionTitle, borderBottomColor: '#8B5CF6' }
const taskItem = { padding: '10px 12px', marginBottom: '6px', backgroundColor: '#F9FAFB', borderRadius: '8px', borderLeft: '3px solid hsl(243, 75%, 58%)' }
const sharedItem = { ...taskItem, backgroundColor: '#ECFDF5', borderLeftColor: '#10b981' }
const paymentItem = { ...taskItem, borderLeftColor: '#F59E0B' }
const paymentOverdue = { ...taskItem, borderLeftColor: '#DC2626' }
const apptItem = { ...taskItem, backgroundColor: '#FAF5FF', borderLeftColor: '#8B5CF6' }
const taskTitle = { fontSize: '13px', color: 'hsl(0, 0%, 15%)', margin: 0, fontWeight: '600' as const }
const taskMeta = { fontSize: '11px', color: 'hsl(0, 0%, 45%)', margin: '2px 0 0' }
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
