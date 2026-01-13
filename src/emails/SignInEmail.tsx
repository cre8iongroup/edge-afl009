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
  Section,
  Text,
} from 'react-email';
import * as React from 'react';

interface SignInEmailProps {
  signInLink: string;
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export const SignInEmail = ({ signInLink }: SignInEmailProps) => (
  <Html>
    <Head />
    <Preview>Your sign-in link for ALPFA 2026 Convention Portal</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/static/alpfa-logo-email.png`}
          width="150"
          height="55"
          alt="ALPFA Logo"
          style={logo}
        />
        <Heading style={heading}>Your Sign-In Link</Heading>
        <Section style={buttonContainer}>
          <Button style={button} href={signInLink}>
            Sign in to ALPFA Portal
          </Button>
        </Section>
        <Text style={paragraph}>
          This link will sign you into the ALPFA 2026 Convention Portal. It will expire in 1 hour and can only be used once.
        </Text>
        <Text style={paragraph}>
          If you did not request this email, you can safely ignore it.
        </Text>
        <Text style={paragraph}>
          — The ALPFA & cre8ion Team
        </Text>
        <Section style={linkContainer}>
          <Text style={paragraph}>
            Or copy and paste this URL into your browser:
          </Text>
          <Link href={signInLink} style={link}>
            {signInLink}
          </Link>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default SignInEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
};

const logo = {
  margin: '0 auto',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '18px',
  lineHeight: '1.4',
  color: '#484848',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const button = {
  backgroundColor: '#0072c6',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '18px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
};

const linkContainer = {
    marginTop: '32px',
    borderTop: '1px solid #eaeaea',
    paddingTop: '20px',
};

const link = {
  color: '#0072c6',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
};
