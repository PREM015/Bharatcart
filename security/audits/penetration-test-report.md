# Penetration Testing Report

**Purpose**: Documents pen test results  
**Description**: Template for security vulnerability findings

## Executive Summary
- **Test Date**: [Date Range]
- **Tester**: [Company/Individual]
- **Scope**: Web app, API, Mobile apps
- **Overall Risk**: [Critical/High/Medium/Low]

## Methodology
1. Reconnaissance - Information gathering
2. Scanning - Vulnerability identification
3. Exploitation - Proof of concept
4. Reporting - Documentation

## Tools Used
- Burp Suite Professional
- OWASP ZAP
- Nmap
- Metasploit
- SQLMap

## Findings Summary
| Severity | Count |
|----------|-------|
| Critical | 0     |
| High     | 0     |
| Medium   | 0     |
| Low      | 0     |

## Sample Finding

### [HIGH] SQL Injection in Search
**CVSS**: 7.5  
**Location**: `/api/products/search`  
**Impact**: Database access  
**Recommendation**: Use parameterized queries  
**Status**: 🔴 Open  
**Deadline**: 14 days

## Remediation Timeline
- Critical: 7 days
- High: 14 days
- Medium: 30 days
- Low: 90 days

## Retest
Scheduled: [Date + 30 days]

Tester Signature: _________________
