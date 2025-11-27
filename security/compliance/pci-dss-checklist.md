# PCI DSS Compliance Checklist

**Purpose**: Payment card data security  
**Description**: Requirements for handling credit card information

## Core Requirements
- [ ] Firewall configuration protecting cardholder data
- [ ] No vendor-supplied defaults for passwords
- [ ] Protect stored cardholder data with encryption
- [ ] Encrypt transmission over public networks (TLS 1.2+)
- [ ] Use anti-virus software
- [ ] Develop secure systems and applications
- [ ] Restrict access by business need-to-know
- [ ] Unique IDs for each user
- [ ] Restrict physical access to data
- [ ] Track all access to network resources
- [ ] Test security systems regularly
- [ ] Maintain information security policy

## Tokenization
- [ ] Use payment gateway tokenization (Stripe/PayPal)
- [ ] Never store CVV/CVV2
- [ ] Mask PAN when displayed (show last 4 digits only)

## SAQ Type
SAQ A - Redirect to payment processor (recommended)

Last Audit: [Date]  
Compliance Status: ✅
