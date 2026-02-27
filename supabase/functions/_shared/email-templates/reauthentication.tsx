/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Il tuo codice di verifica Wedsapp</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://storage.googleapis.com/gpt-engineer-file-uploads/jg6Z0NN8ffXJDlJRrKhqsPAGGk12/uploads/1766960076694-Logo Variant 3.png"
          alt="Wedsapp"
          width="140"
          height="auto"
          style={logo}
        />
        <Heading style={h1}>Codice di verifica</Heading>
        <Text style={text}>
          Usa il codice qui sotto per confermare la tua identità:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Il codice scadrà tra pochi minuti. Se non hai fatto questa richiesta,
          puoi ignorare questa email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Lato', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logo = { marginBottom: '24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(243, 75%, 58%)',
  margin: '0 0 20px',
  fontFamily: "'Lato', Arial, sans-serif",
}
const text = {
  fontSize: '15px',
  color: 'hsl(0, 0%, 9%)',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const codeStyle = {
  fontFamily: "'Fira Code', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(243, 75%, 58%)',
  margin: '0 0 30px',
  letterSpacing: '4px',
}
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 63%)', margin: '32px 0 0' }
