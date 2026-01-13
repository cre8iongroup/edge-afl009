import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'react-email';
import * as React from 'react';

interface SignInEmailProps {
  url: string;
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export default function SignInEmail({ url }: SignInEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your sign-in link for ALPFA 2026 Convention</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={'https://cre8iongroup.com/wp-content/uploads/2026/01/alpfa-new-logo-white.png'}
            width="150"
            height="auto"
            alt="ALPFA"
            style={logo}
          />
          <Text style={paragraph}>
            Welcome to the ALPFA 2026 Convention Portal. Click the button below to sign in securely.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={url}>
              Sign In
            </Button>
          </Section>
          <Text style={paragraph}>
            This link is valid for one-time use and will expire in 24 hours.
            <br />
            <br />
            If you did not request this email, you can safely ignore it.
          </Text>
          <Text style={paragraph}>
            Best,
            <br />
            The ALPFA Team
          </Text>
          <Section style={linkContainer}>
            <Link href={baseUrl} style={link}>
              ALPFA 2026 Convention
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  color: '#eaeaea',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
};

const logo = {
  margin: '0 auto',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#eaeaea',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#007bff',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
};

const linkContainer = {
  marginTop: '32px',
  textAlign: 'center' as const,
};

const link = {
  color: '#888',
  fontSize: '12px',
};