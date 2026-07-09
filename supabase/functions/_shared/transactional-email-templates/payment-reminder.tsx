/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  vendorName?: string
  amount?: string
  dueDate?: string
  daysUntil?: number
  treasuryUrl?: string
}

const Email = ({
  vendorName = 'Fornitore',
  amount = '€0',
  dueDate = '',
  daysUntil = 0,
  treasuryUrl = 'https://wedsapp.it/app/treasury',
}: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Rata in scadenza: {vendorName} — {amount}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Rata in scadenza</Heading>
        <Text style={text}>
          C'è un pagamento previsto tra <strong>{daysUntil} giorni</strong>.
          Verifica la disponibilità di liquidità nella Tesoreria.
        </Text>
        <Section style={box}>
          <Text style={label}>Fornitore</Text>
          <Text style={value}>{vendorName}</Text>
          <Text style={label}>Importo</Text>
          <Text style={valueStrong}>{amount}</Text>
          <Text style={label}>Scadenza</Text>
          <Text style={value}>{dueDate}</Text>
        </Section>
        <Button style={button} href={treasuryUrl}>Apri Tesoreria</Button>
        <Text style={footer}>
          Ricevi questa notifica perché hai un piano di pagamento attivo su WedsApp.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Rata in scadenza: ${d.vendorName ?? 'fornitore'} — ${d.amount ?? ''}`,
  displayName: 'Promemoria pagamento fornitore',
  previewData: {
    vendorName: 'Villa Aurora — Catering',
    amount: '€ 3.500',
    dueDate: '20 luglio 2026',
    daysUntil: 5,
    treasuryUrl: 'https://wedsapp.it/app/treasury',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Lato', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(243, 75%, 58%)', margin: '0 0 20px' }
const text = { fontSize: '15px', color: 'hsl(0, 0%, 9%)', lineHeight: '1.6', margin: '0 0 24px' }
const box = { border: '1px solid hsl(225, 30%, 90%)', borderRadius: '12px', padding: '20px 24px', margin: '0 0 28px' }
const label = { fontSize: '11px', color: 'hsl(0, 0%, 45%)', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const value = { fontSize: '15px', color: 'hsl(0, 0%, 15%)', margin: '0 0 14px' }
const valueStrong = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(243, 75%, 58%)', margin: '0 0 14px' }
const button = {
  backgroundColor: 'hsl(243, 75%, 58%)', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '20px',
  padding: '14px 28px', textDecoration: 'none', display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 55%)', margin: '32px 0 0' }
