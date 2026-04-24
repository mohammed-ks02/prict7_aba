Based on the PDF content for **Groupe 5 - Sentinel Tower & Crisis Governance**, here are your actionable tasks organized by category:

---

## 🔧 Core Workflow Implementation

### 1. Heartbeat System (Watchdog Global)
- [ ] Set up an advanced Watchdog that queries Data Stores from Groups 1, 2, 3, and 4
- [ ] Implement logic: Trigger alert if no new request detected in G1 for >15 minutes
- [ ] Configure automatic **Red Alert** via Slack/Email to technical direction for potential Gateway failures

### 2. Centralized Error Logger
- [ ] Receive all error Webhooks from the entire infrastructure
- [ ] Implement AI agent to categorize errors:
  - 🧍 Human error (bad input)
  - ⚙️ Technical error (server unavailable)
- [ ] Enable AI to auto-generate technical remediation advice for the concerned group

### 3. KPIs & Latency Monitoring
- [ ] Measure end-to-end **Patient Journey time** (G1 entry → G4 pharmacy)
- [ ] Set threshold: If total time >45 minutes → flag as issue
- [ ] Auto-update Airtable status to **"Délai Inacceptable"** for audit tracking

### 4. Failover Mode (Plan B)
- [ ] Build a Failover Switch mechanism
- [ ] Define scenario: If G3 (banking system) is down
- [ ] Implement manual/auto Webhook Trigger to redirect data to backup **Google Sheet** to ensure continuity of vital care

---

## 🚀 Advanced Features

- [ ] **Dynamic Status Dashboard**: Build visual interface showing each group's status:
  - 🟢 Active = Normal operation
  - 🟡 Slow = Abnormal response time (bottleneck)
  - 🔴 Down = Critical service failure
- [ ] **Audit Trail**: Aggregate all successful transactions into a daily CSV file for legal archiving
- [ ] **Security Governance**: Manage API keys & Webhook permissions with ability to revoke access in case of intrusion

---

## 🧪 Crash Test Scenarios (Testing)

- [ ] **"Silence of the Graves"**: Stop all flux to G1 → Verify G5 Watchdog detects inactivity
- [ ] **Performance Crisis**: Simulate excessive delays (Sleep) → Verify Dashboard turns orange & alerts are triggered

---

## 📦 Final Deliverables

- [ ] **Global Architecture Map**: Final Miro board showing total interconnection of all groups
- [ ] **Real-time Monitoring Dashboard**: Live control screen displaying infrastructure health/vitality
- [ ] **Incident Response Wiki**: PDF document detailing backup procedures (e.g., *"If G2 fails, follow Protocol B..."*)

---

> 💡 **Pro Tip**: Prioritize the Heartbeat System and Error Logger first, as they form the foundation of your monitoring mission. Then build the Dashboard for visibility, and finally document your Incident Response Wiki for handover.

Let me know if you need help breaking down any specific task or implementing a particular feature! 🛠️
