GLH – Stage 5 Interactive Prototype

Files:
- index.html: single-file interactive prototype for customer portal and platform administration.

New in this stage:
1) Local / international request scope.
2) Local shipping method, carrier and estimated freight cost.
3) International freight cost, insurance details, and trade payment instrument (SWIFT / documentary credit L/C / T/T).
4) Client registration and login with username and password; public browsing remains available as guest, while submitting requests and purchasing require login.
5) Customer orders are filtered to the signed-in customer's account in this browser.
6) Order-management action icons are role-dependent (demo roles: system administrator, operations, finance, read-only).
7) Financing payment option opens financing details in the client request form; submitting a financed request creates a linked financing application.
8) Financing administration: financing products, limits, term, margin, eligibility/document requirements, applications, underwriting status, preliminary approved amount, installment count, risk category and conditions.

How to test:
- Extract the ZIP completely.
- Open index.html in a modern browser (Chrome recommended).
- Browse as guest; try submitting a request or purchasing to see the login requirement.
- Use the header button to register a client, then submit a local or international request.
- In the request form choose payment method “تمويل عبر المنصة” and complete the financing fields.
- Switch to Platform Administration > Orders or Financing to inspect the linked records and update their statuses.
- The order action-role selector lets you test which icons are visible for each demo role.

Important limitations:
- This is a front-end demonstration. Data is stored in the browser's localStorage, not a shared server/database.
- The client password handling is only a demonstration and is NOT production-grade authentication. Do not use real passwords or sensitive personal/financial data.
- No actual payment, SWIFT transfer, documentary credit issuance, insurance policy issuance, financing disbursement, credit decision, or carrier integration is performed.
- Real production use requires backend APIs, database, secure password hashing, server-side authorization, audit logs, encryption, document storage, compliance controls, and integrations with licensed providers/banks/insurers/funders.
