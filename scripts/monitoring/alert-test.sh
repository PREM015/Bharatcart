#!/bin/bash
# Test Alert System
# Purpose: Validates alerting configuration
# Description: Sends test alerts to verify delivery

set -e

echo "🔔 Testing alert system..."

# Slack webhook test
if [ -n "$SLACK_WEBHOOK_URL" ]; then
  echo "Testing Slack alerts..."
  curl -X POST "$SLACK_WEBHOOK_URL"     -H 'Content-Type: application/json'     -d '{
      "text": "🧪 Test Alert from BharatCart",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*Test Alert*\nThis is a test alert to verify Slack integration."
          }
        }
      ]
    }'
  echo "✅ Slack alert sent"
fi

# Email test
if [ -n "$SMTP_HOST" ]; then
  echo "Testing email alerts..."
  node -e "
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.ALERT_EMAIL,
      subject: 'Test Alert from BharatCart',
      text: 'This is a test alert to verify email integration.'
    }).then(() => console.log('✅ Email alert sent'))
      .catch(err => console.error('❌ Email failed:', err));
  "
fi

# PagerDuty test
if [ -n "$PAGERDUTY_API_KEY" ]; then
  echo "Testing PagerDuty alerts..."
  curl -X POST https://api.pagerduty.com/incidents     -H "Authorization: Token token=$PAGERDUTY_API_KEY"     -H "Content-Type: application/json"     -d '{
      "incident": {
        "type": "incident",
        "title": "Test Alert from BharatCart",
        "service": {
          "id": "'$PAGERDUTY_SERVICE_ID'",
          "type": "service_reference"
        },
        "urgency": "low",
        "body": {
          "type": "incident_body",
          "details": "This is a test alert"
        }
      }
    }'
  echo "✅ PagerDuty alert sent"
fi

echo "✅ Alert system test complete!"
