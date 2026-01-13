import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'react-email';
import * as React from 'react';
import type { Submission } from '@/lib/types';

interface StatusUpdateEmailProps {
  submission: Submission;
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export default function StatusUpdateEmail({ submission }: StatusUpdateEmailProps) {
  const previewText = `Update on your submission: ${submission.title}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={'https://cre8iongroup.com/wp-content/uploads/2026/01/alpfa-new-logo-white.png'}
            width="150"
            height="auto"
            alt="ALPFA"
            style={logo}
          />
          <Text style={paragraph}>Hello,</Text>
          <Text style={paragraph}>
            There has been an update regarding your submission for the ALPFA 2026 Convention.
          </Text>
          <Section style={infoSection}>
            <Text style={infoLabel}>Submission Title:</Text>
            <Text style={infoValue}>{submission.title}</Text>
            <Text style={infoLabel}>New Status:</Text>
            <Text style={infoValue}>{submission.status}</Text>
          </Section>
          {submission.status === 'Approved' && (
            <Text style={paragraph}>
              Congratulations! Your session has been approved. Please log in to the portal to provide presenter details.
            </Text>
          )}
           {submission.status === 'Needs Information' && (
            <Text style={paragraph}>
              We need a little more information to move forward. Please log in to the portal to see what's required and update your submission.
            </Text>
          )}
          <Section style={btnContainer}>
            <Button style={button} href={`${baseUrl}/dashboard`}>
              Go to Your Dashboard
            </Button>
          </Section>
          <Text style={paragraph}>
            Best,
            <br />
            The ALPFA Team
          </Text>
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

const infoSection = {
  backgroundColor: '#1c1c1c',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
};

const infoLabel = {
  fontSize: '14px',
  color: '#888',
  margin: '0 0 4px 0',
};

const infoValue = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  margin: '0 0 16px 0',
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