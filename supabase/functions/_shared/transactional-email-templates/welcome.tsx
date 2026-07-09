/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  firstName?: string
  partner1?: string
  partner2?: string
  trialEndDate?: string
  dashboardUrl?: string
}

const Email = ({
  firstName = 'sposi',
  partner1 = '',
  partner2 = '',
  trialEndDate = '30 giorni da oggi',
  dashboardUrl = 'https://wedsapp.it/app/dashboard',
}: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Benvenuti su WedsApp — il vostro matrimonio, sotto controllo.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Benvenuti su WedsApp</Heading>
        {partner1 && partner2 && (
          <Text style={subtitle}>{partner1} & {partner2}</Text>
        )}
        <Text style={text}>
          Ciao <strong>{firstName}</strong>, il vostro account Premium in prova è attivo.
          Avete accesso completo a tutte le funzionalità fino al <strong>{trialEndDate}</strong>.
        </Text>
        <Section style={box}>
          <Text style={boxTitle}>I primi 3 passi</Text>
          <Text style={li}><strong>1.</strong> Aggiungete gli invitati (import CSV, testo libero o uno per uno)</Text>
          <Text style={li}><strong>2.</strong> Impostate il budget totale e i contratti fornitori</Text>
          <Text style={li}><strong>3.</strong> Invitate il partner o il wedding planner nel workspace</Text>
        </Section>
        <Button style={button} href={dashboardUrl}>Vai alla Dashboard</Button>
        <Text style={footer}>
          WedsApp — Il Project Manager del vostro matrimonio.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) =>
    d.partner1 && d.partner2
      ? `Benvenuti ${d.partner1} & ${d.partner2} su WedsApp`
      : 'Benvenuti su WedsApp',
  displayName: 'Benvenuto nuova coppia',
  previewData: {
    firstName: 'Marco',
    partner1: 'Marco',
    partner2: 'Giulia',
    trialEndDate: '15 agosto 2026',
    dashboardUrl: 'https://wedsapp.it/app/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Lato', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: 'hsl(243, 75%, 58%)', margin: '0 0 8px' }
const subtitle = { fontSize: '16px', color: 'hsl(0, 0%, 40%)', margin: '0 0 24px' }
const text = { fontSize: '15px', color: 'hsl(0, 0%, 9%)', lineHeight: '1.6', margin: '0 0 24px' }
const box = { backgroundColor: 'hsl(225, 100%, 97%)', borderRadius: '12px', padding: '20px 24px', margin: '0 0 28px' }
const boxTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(243, 75%, 58%)', margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const li = { fontSize: '14px', color: 'hsl(0, 0%, 20%)', margin: '0 0 8px', lineHeight: '1.5' }
const button = {
  backgroundColor: 'hsl(243, 75%, 58%)', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '20px',
  padding: '14px 28px', textDecoration: 'none', display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 55%)', margin: '32px 0 0' }
