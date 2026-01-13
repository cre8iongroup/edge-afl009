import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'react-email';
import * as React from 'react';
import type { Submission } from '@/lib/types';

interface StatusUpdateEmailProps {
  submissionTitle: string;
  newStatus: Submission['status'];
  submissionType: Submission['sessionType'];
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const statusDescriptions: Record<Submission['status'], string> = {
    'Approved': 'Congratulations! Your proposal has been approved. You can now add presenter details via your dashboard.',
    'Rejected': 'Thank you for your submission. After careful consideration, we are unable to move forward with your proposal at this time.',
    'Needs Information': 'Your proposal requires additional information. Please visit your dashboard to view comments and update your submission.',
    'Awaiting Approval': 'Your submission is currently under review. We appreciate your patience.'
};

export const StatusUpdateEmail = ({
  submissionTitle,
  newStatus,
  submissionType,
}: StatusUpdateEmailProps) => {
  const description = statusDescriptions[newStatus] || 'There has been an update on your submission.';

  return (
    <Html>
      <Head />
      <Preview>Update on your ALPFA submission: {submissionTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
           <Img
            src={`${baseUrl}/static/alpfa-logo-email.png`}
            width="150"
            height="55"
            alt="ALPFA Logo"
            style={logo}
          />
          <Heading style={heading}>Submission Status Updated</Heading>
          <Text style={paragraph}>
            The status for your {submissionType} proposal, "{submissionTitle}", has been updated to:
          </Text>
          <Section style={statusContainer}>
            <Text style={statusText}>{newStatus}</Text>
          </Section>
          <Text style={paragraph}>{description}</Text>
          <Section style={buttonContainer}>
            <Button style={button} href={`${baseUrl}/dashboard`}>
              View My Dashboard
            </Button>
          </Section>
          <Text style={paragraph}>
            If you have any questions, please reply to this email.
          </Text>
          <Text style={paragraph}>
            — The ALPFA & cre8ion Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default StatusUpdateEmail;

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
  fontSize: '28px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
};

const statusContainer = {
    border: '1px solid #eaeaea',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9',
    padding: '10px 20px',
    margin: '20px 0',
    textAlign: 'center' as const,
};

const statusText = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const button = {
  backgroundColor: '#0072c6',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
};
