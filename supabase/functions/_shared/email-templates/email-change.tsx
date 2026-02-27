/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Conferma il cambio email per Wedsapp</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://storage.googleapis.com/gpt-engineer-file-uploads/jg6Z0NN8ffXJDlJRrKhqsPAGGk12/uploads/1766960076694-Logo Variant 3.png"
          alt="Wedsapp"
          width="140"
          height="auto"
          style={logo}
        />
        <Heading style={h1}>Conferma il cambio email</Heading>
        <Text style={text}>
          Hai richiesto di cambiare la tua email da{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link> a{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          Clicca il pulsante qui sotto per confermare.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Conferma Cambio Email
        </Button>
        <Text style={footer}>
          Se non hai richiesto questa modifica, proteggi immediatamente il tuo
          account.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: 'hsl(243, 75%, 58%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(243, 75%, 58%)',
  color: 'hsl(225, 100%, 96%)',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '20px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 63%)', margin: '32px 0 0' }
