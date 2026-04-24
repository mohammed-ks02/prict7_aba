# 🏰 Sentinel Tower & Crisis Governance (Groupe 5)
**Documentation Technique & Guide d'Exploitation**  
`Version : 1.0` | `Workflow ID : 099037e3-fde7-429e-8013-e072552844f9` | `Statut : Stopped`

---

## 🎯 Objectifs du Workflow
Ce workflow d'automatisation assure la **surveillance proactive**, la **gestion de crise** et la **continuité de service** pour une infrastructure hospitalière multi-gateways (G1 à G4). Ses missions principales :

1. 🐶 **Watchdog (Cœur Battant)** : Détecter l'inactivité de la passerelle G1 (>15 min) et alerter immédiatement.
2. 🤖 **Logger Centralisé IA** : Réceptionner, classifier (Humain/Technique) et prioriser les erreurs via un agent Gemini, puis router les alertes.
3. ⏱️ **Suivi KPI & Latence** : Mesurer le temps de parcours patient (entrée → pharmacie) et flaguer les dépassements (>45 min).
4. 💳 **Mode Secours (Failover)** : Basculer automatiquement les transactions bancaires en attente vers une feuille de secours si le système G3 est indisponible.
5. 📊 **Audit & Export** : Archiver les transactions réussies et générer des exports CSV planifiés pour la conformité.

---

## 🏗️ Architecture & Explication des Nœuds
Le workflow est structuré en **5 branches indépendantes** fonctionnant en parallèle.

| Branche | Déclencheur | Nœuds Clés | Rôle |
|---------|-------------|------------|------|
| 🐶 **Watchdog** | `Manual Trigger` | `Postgres Action` → `Function` → `If-Else` → `Gmail/Slack` | Interroge la table `check` toutes les X minutes. Si `diff >= 900s`, déclenche une alerte `RED`. |
| 🤖 **Error Logger** | `POST /errors` | `AI Agent (Gemini)` → `Function (Timestamp)` → `Switch` → `Slack/Gmail/Sheets` | Analyse le payload, retourne un JSON structuré (`severity`, `error_type`), puis route selon `HIGH`, `MEDIUM` ou `LOW`. |
| ⏱️ **KPI Monitor** | `POST /start` & `/end` | `Webhook` → `Function` → `Merge (zip)` → `Function (Calcul)` → `Log` | Fusionne les timestamps, calcule la durée en minutes, applique le seuil de 45 min et retourne `DELAY_INACCEPTABLE` ou `OK`. |
| 💳 **Failover Bank** | `POST /bank` | `Webhook` → `Function` → `If-Else` → `Sheet Secours` OU `Sheet Audit` | Si `status === "pending_payment"` → bascule vers la feuille `Failover Backup` + email. Sinon → archive dans `transactions réussies`. |
| 📅 **CSV Export** | `Cron (0 5 * * *)` ou `POST /csv` | `Cron/Webhook` → `Function` → `Google Sheets` | Formate les données d'audit et les ajoute à la feuille `csv` pour extraction quotidienne. |

> 🔍 **Note Technique** : Le nœud `Merge` utilise la stratégie `zip`. Il attend **obligatoirement** les deux appels (`/start` et `/end`) avant de passer au calcul.

---

## 📡 Points d'Entrée & Requêtes (Webhooks)
Tous les webhooks répondent `200 OK` immédiatement. Les payloads attendus sont :

### 1. 🚨 Injection d'Erreur
`POST /errors`
```json
{
  "source": "G3_Banking_Module",
  "error_message": "Connection timeout after 30s. Retry failed."
}
```
✅ **Réponse attendue** : L'IA retourne `{"error_type": "Technical Error", "severity": "HIGH", "message": "...", "recommendation": "..."}`. Alertes Slack/Gmail selon la sévérité.

### 2. ⏱️ Début & Fin de Parc Patient
`POST /start`
```json
{ "start_time": "2024-05-20T10:00:00Z" }
```
`POST /end`
```json
{ "end_time": "2024-05-20T10:50:00Z" }
```
✅ **Réponse attendue** : Après réception des deux, le nœud `Function2` calcule `durationMinutes: 50` et retourne `status: "DELAY_INACCEPTABLE"`.

### 3. 💳 Transaction Bancaire
`POST /bank`
```json
{
  "patient_id": "P-8821",
  "transaction_id": "TXN-9902",
  "status": "pending_payment",
  "source": "G3_Gateway"
}
```
✅ **Réponse attendue** : Si `status === "pending_payment"` → écriture dans `Failover Backup` + email. Si `"completed"` → écriture dans `transactions réussies`.

### 4. 📄 Export CSV
`POST /csv` ou déclenchement Cron (5h00 UTC)
```json
{
  "patient_id": "P-8821",
  "transaction_id": "TXN-9903",
  "status": "completed",
  "source": "G4_Pharmacy"
}
```
✅ **Réponse attendue** : Ajout d'une ligne dans l'onglet `csv` pour archivage.

---

## 🧪 Scénarios de Test (Crash Tests)
| Test | Action | Résultat Attendu |
|------|--------|------------------|
| 🕳️ **Silence des Tombes** | Ne pas appeler le Watchdog ni insérer de pulse dans Supabase pendant 16 min. | `If-Else` → `true`. Envoi Gmail + Slack avec `🚨 ALERTE CRITIQUE – G1 Gateway DOWN`. |
| ⏳ **Crise de Performance** | Appeler `/start`, attendre 46 min, appeler `/end`. | `Function2` retourne `isLate: true`, `status: "DELAY_INACCEPTABLE"`. |
| 🏦 **Panne Banque** | Envoyer `/bank` avec `"status": "pending_payment"`. | Données redirigées vers la feuille `Failover Backup`. Email `Paymant Down Email` envoyé. |
| 🤖 **Classification IA** | Envoyer une erreur évidente (`"error_message": "Invalid user input"`). | IA retourne `error_type: "Human Error"`, `severity: "LOW"`. Pas d'alerte critique, ajout en Sheets. |

---

## 🗄️ Bases de Données & Feuilles Google

### 🔹 Supabase (PostgreSQL)
Table `public.check` :
```sql
CREATE TABLE public.check (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  message TEXT
);
```
Requête utilisée par le workflow :
```sql
SELECT EXTRACT(EPOCH FROM created_at)::INTEGER AS last_pulse 
FROM "check" ORDER BY created_at DESC LIMIT 1;
```

### 📊 Google Sheets (Onglets requis)
| Feuille | ID | Colonnes (Ligne 1) |
|---------|----|-------------------|
| **Errors** | `1J48EEczpKpLoKX9hM2uBzaICAtCQzGqB_zZMrNCPaAk` | `Source`, `Error Type`, `Severity`, `Message`, `Recommendation`, `Timestamp` |
| **Failover Backup** | `1J48EEczpKpLoKX9hM2uBzaICAtCQzGqB_zZMrNCPaAk` | `Patient ID`, `Transaction ID`, `Status`, `Source`, `Fallback Mode`, `Detected At`, `Note` |
| **transactions réussies** | `1e11Z5iM1MGfakGGCoFscEp9DUtbGmyWd6XFrUZYq53E` | `Patient ID`, `Transaction ID`, `Status`, `Source`, `Processed At`, `Note` |
| **csv** | `1J48EEczpKpLoKX9hM2uBzaICAtCQzGqB_zZMrNCPaAk` | `Patient ID`, `Transaction ID`, `Status`, `Source` |

> ⚠️ **Attention** : Certains nœuds `Google Sheets` utilisent `range: "A2:D2"` mais envoient 6 ou 7 valeurs. Pensez à mettre à jour les ranges en `A2:F2` ou `A2:G2` pour éviter les erreurs d'écriture.

---

## 🔧 Configuration & Sécurité

### 🔑 Gestion des Secrets
Le fichier JSON contient actuellement des **identifiants en clair** (`clientSecret`, `refreshToken`, `apiKey`, `password`).  
🛡️ **Action requise** :
1. Déplacer toutes les clés dans l'objet `secrets: {}` du workflow.
2. Remplacer les valeurs hardcodées par des références dynamiques : `[[ secrets.GMAIL_REFRESH_TOKEN ]]`, etc.
3. Révoquer les tokens actuels et en générer de nouveaux après migration.

### 🌐 Variables d'Environnement
| Variable | Usage |
|----------|-------|
| `SUPABASE_HOST` | `aws-1-eu-central-1.pooler.supabase.com` |
| `SLACK_CHANNEL_ID` | `course-tuto` ou `nouveau-canal` |
| `GEMINI_API_KEY` | Clé LLM pour l'agent |
| `SHEETS_CLIENT_ID` | Identifiant OAuth Google Sheets |

---

## 📈 Maintenance & Monitoring
- 🔄 **Cron** : `0 5 * * *` → Export automatique CSV à 5h00 UTC.
- 📦 **Logs** : Chaque branche contient des nœuds `Log`/`LogX`. Vérifiez la console d'exécution pour debugger les payloads intermédiaires.
- 🚧 **Failover** : Le mode secours est manuel/auto via webhook. Pour un basculement fully-automatisé, connecter le `Watchdog` à un nœud `Set Variable` qui force `status: "pending_payment"` temporairement.
- 📉 **Seuils** : 
  - Watchdog : `15 min` (`900s`)
  - KPI Latence : `45 min`
  - Modifier dans `Function` / `Function2` si besoin.

---

## 📞 Support & Équipe
- **Groupe** : Groupe 5 - Sentinel Tower & Crisis Governance
- **Rôle** : Surveillance Infrastructure, IA Diagnostique, Gouvernance de Crise
- **Plateforme** : Automation Engine (Compatible n8n/ActivePieces/Custom)
- **Dernière Mise à Jour** : `2024-04-24`

> 💡 *Conseil Pro* : Priorisez la sécurisation des tokens, testez chaque webhook isolément, puis validez les scénarios de crise avant la mise en production. Une fois stabilisé, branchez un tableau de bord (Grafana/Retool) sur les feuilles Sheets pour une visibilité temps réel.

---
📜 *Document généré à partir de `GRP5_S7-2026-04-24T22_00_40.395Z.json`. Conforme aux spécifications de surveillance hospitalière et de gouvernance de crise.* 🏥️
