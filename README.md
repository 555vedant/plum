# AI-Powered OPD Insurance Claim Adjudication System

## Overview

An AI-powered insurance claim adjudication platform that automates OPD claim processing using Large Language Models, rule-based policy validation, confidence scoring, and manual review workflows.

The system extracts information from prescriptions, medical bills, pharmacy bills, and diagnostic reports, evaluates them against insurance policies, and generates automated claim decisions.

---

## Key Features

### AI Document Processing

* Upload prescriptions, medical bills, pharmacy bills, and diagnostic reports
* PDF and image support
* Gemini 2.5 Flash powered extraction
* Structured JSON generation
* Confidence scoring

### Automated Claim Adjudication

* Policy rule validation
* Coverage verification
* Medical necessity checks
* Limit validation
* Manual review routing
* Partial approval support

### Claim Management

* Claim history tracking
* Detailed audit trail
* Decision explanations
* Confidence score reporting

### Administration

* Admin policy configuration dashboard
* Appeals and re-review workflow
* Automated policy management
* Analytics dashboard

---

## Technology Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS

### Backend

* FastAPI
* SQLAlchemy 2.0
* Pydantic

### Database

* PostgreSQL
* Supabase

### Storage

* Supabase Storage

### Artificial Intelligence

* Gemini 2.5 Flash

---

## System Architecture

```text
                    ┌────────────────────┐
                    │      Next.js       │
                    │    Frontend UI     │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │      FastAPI       │
                    │      Backend       │
                    └─────────┬──────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼

 ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
 │ Supabase       │  │ Gemini 2.5     │  │ Rule Engine    │
 │ Storage        │  │ Flash          │  │                │
 └────────┬───────┘  └────────┬───────┘  └────────┬───────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ PostgreSQL         │
                    │ Supabase Database  │
                    └────────────────────┘
```

---

## Claim Processing Flow

```text
Upload Documents
       │
       ▼
Store in Supabase Storage
       │
       ▼
Gemini Extraction
       │
       ▼
Structured JSON
       │
       ▼
Rule Engine Evaluation
       │
       ▼
Decision Generation
       │
       ▼
Store Results
       │
       ▼
Display Outcome
```

---

## Database Schema

### claims

| Field            | Description                                            |
| ---------------- | ------------------------------------------------------ |
| id               | Claim ID                                               |
| status           | APPROVED / REJECTED / PARTIAL_APPROVAL / MANUAL_REVIEW |
| claimed_amount   | Submitted claim amount                                 |
| approved_amount  | Final approved amount                                  |
| confidence_score | AI confidence score                                    |
| decision_reason  | Decision explanation                                   |
| created_at       | Creation timestamp                                     |

### documents

| Field         | Description                  |
| ------------- | ---------------------------- |
| id            | Document ID                  |
| claim_id      | Associated claim             |
| document_type | Prescription / Bill / Report |
| storage_url   | Supabase Storage URL         |

### extracted_data

| Field          | Description           |
| -------------- | --------------------- |
| id             | Record ID             |
| claim_id       | Associated claim      |
| extracted_json | Gemini extracted data |

---

## Project Structure

```text
insurance-ai-adjudicator/

├── frontend/
│
│   ├── app/
│   │   ├── page.tsx
│   │   ├── upload/
│   │   ├── claims/
│   │   └── claims/[id]/
│   │
│   ├── components/
│   │   ├── UploadForm.tsx
│   │   ├── ClaimCard.tsx
│   │   ├── DecisionCard.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── lib/
│   └── types/
│
├── backend/
│
│   ├── app/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── core/
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
└── README.md
```

---

## Implemented Adjudication Rules

### Approval Conditions

A claim is approved only if all validations pass successfully.

### Rejection Rules

#### PER_CLAIM_EXCEEDED

Reject when claim amount exceeds ₹5000.

#### BELOW_MIN_AMOUNT

Reject when claim amount is below ₹500.

#### DOCTOR_REG_INVALID

Reject when doctor registration is missing or invalid.

Valid Examples:

```text
MH/12345/2020
KA/56789/2019
DL/99999/2022
```

#### MISSING_DOCUMENTS

Required documents:

* Prescription
* Medical Bill

#### NON_COVERED_TREATMENT

Examples:

* Teeth Whitening
* Hair Transplant
* Weight Loss Treatment

#### LATE_SUBMISSION

Reject when submitted more than 30 days after treatment.

#### DATE_MISMATCH

Reject when treatment dates across documents do not match.

---

## Manual Review Rules

### LOW_CONFIDENCE

Claims are routed to manual review when:

```text
Confidence Score < 0.80
```

### HIGH_VALUE_CLAIM

Claims are routed to manual review when:

```text
Claim Amount > ₹25,000
```

---

## Partial Approval

Example:

```text
Root Canal          ₹2200
Teeth Whitening     ₹1800
```

Decision:

```text
PARTIAL_APPROVAL

Approved Amount: ₹2200
Rejected Amount: ₹1800
```

---

## Confidence Scoring

```text
confidence =
(extraction_confidence × 0.7)
+
(document_completeness × 0.3)
```

Claims with confidence below 0.80 are automatically routed for manual review.

---

## API Endpoints

### Upload Documents

```http
POST /api/claims/upload
```

### Process Claim

```http
POST /api/claims/process
```

### List Claims

```http
GET /api/claims
```

### Claim Details

```http
GET /api/claims/{id}
```

---

## Local Development

### Backend

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

Swagger Documentation:

```text
http://localhost:8000/docs
```

---

### Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

## Environment Variables

### Backend

```env
DATABASE_URL=

SUPABASE_URL=

SUPABASE_KEY=

GEMINI_API_KEY=
```

---

## Sandbox Mode

The application supports a sandbox mode for development without API keys.

Sandbox mode:

* Saves files locally
* Generates mock extraction responses
* Simulates adjudication results
* Enables end-to-end testing without external services

---

## Implemented Advanced Features

* AI-powered document extraction
* Confidence score based decision making
* Manual review workflow
* Partial approval workflow
* Appeals and re-review workflow
* Admin policy configuration dashboard
* Analytics dashboard
* Automated policy management
* Detailed audit trail
* Claim history tracking

---

## Future Enhancements

* Fraud Detection Engine
* Multi-Policy Support

---

## Author

Vedant Kasar

Built using FastAPI, Next.js, Gemini 2.5 Flash, PostgreSQL, Supabase Storage, and SQLAlchemy.
