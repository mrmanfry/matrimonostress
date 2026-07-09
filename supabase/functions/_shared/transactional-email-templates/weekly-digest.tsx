/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  firstName?: string
  daysToWedding?: number
  confirmedGuests?: number
  totalGuests?: number
  budgetSpent?: string
  budgetTotal?: string
  pendingTasks?: number
  nextPayment?: string
  dashboardUrl?: string
}

const Email = ({
  firstName = 'sposi',
  daysToWedding = 0,
  confirmedGuests = 0,
  totalGuests = 0,
  budgetSpent = '€0',
  budgetTotal = '€0',
  pendingTasks = 0,
  nextPayment = '—',
  dashboardUrl = 'https://wedsapp.it/app/dashboard',
}: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Il tuo riepilogo settimanale — {daysToWedding} giorni al matrimonio</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Riepilogo settimanale</Heading>
        <Text style={text}>
          Ciao <strong>{firstName}</strong>, mancano <strong>{daysToWedding} giorni</strong> al vostro matrimonio.
          Ecco lo stato del vostro progetto.
        </Text>

        <Section style={grid}>
          <Text style={label}>Invitati confermati</Text>
          <Text style={value}>{confirmedGuests} / {totalGuests}</Text>
        </Section>
        <Section style={grid}>
          <Text style={label}>Budget utilizzato</Text>
          <Text style={value}>{budgetSpent} / {budgetTotal}</Text>
        </Section>
        <Section style={grid}>
          <Text style={label}>Task da completare</Text>
          <Text style={value}>{pendingTasks}</Text>
        </Section>
        <Section style={grid}>
          <Text style={label}>Prossimo pagamento</Text>
          <Text style={value}>{nextPayment}</Text>
        </Section>

        <Button style={button} href={dashboardUrl}>Apri Dashboard</Button>
        <Text style={footer}>Ricevi il riepilogo ogni lunedì mattina.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Riepilogo settimanale — ${d.daysToWedding ?? 0} giorni al matrimonio`,
  displayName: 'Digest settimanale coppia',
  previewData: {
    firstName: 'Marco',
    daysToWedding: 87,
    confirmedGuests: 92,
    totalGuests: 150,
    budgetSpent: '€ 18.400',
    budgetTotal: '€ 35.000',
    pendingTasks: 5,
    nextPayment: 'Villa Aurora — € 3.500 (20 luglio)',
    dashboardUrl: 'https://wedsapp.it/app/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Lato', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(243, 75%, 58%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(0, 0%, 9%)', lineHeight: '1.6', margin: '0 0 24px' }
const grid = { borderBottom: '1px solid hsl(225, 30%, 92%)', padding: '12px 0', margin: 0 }
const label = { fontSize: '12px', color: 'hsl(0, 0%, 45%)', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const value = { fontSize: '16px', color: 'hsl(0, 0%, 15%)', margin: 0, fontWeight: 'bold' as const }
const button = {
  backgroundColor: 'hsl(243, 75%, 58%)', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '20px',
  padding: '14px 28px', textDecoration: 'none', display: 'inline-block' as const,
  marginTop: '24px',
}
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 55%)', margin: '32px 0 0' }
