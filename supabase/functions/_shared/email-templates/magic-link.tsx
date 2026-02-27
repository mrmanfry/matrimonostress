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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Il tuo link di accesso a Wedsapp</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://storage.googleapis.com/gpt-engineer-file-uploads/jg6Z0NN8ffXJDlJRrKhqsPAGGk12/uploads/1766960076694-Logo Variant 3.png"
          alt="Wedsapp"
          width="140"
          height="auto"
          style={logo}
        />
        <Heading style={h1}>Il tuo link di accesso</Heading>
        <Text style={text}>
          Clicca il pulsante qui sotto per accedere a Wedsapp. Il link scadrà
          tra pochi minuti.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accedi a Wedsapp
        </Button>
        <Text style={footer}>
          Se non hai richiesto questo link, puoi ignorare questa email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
