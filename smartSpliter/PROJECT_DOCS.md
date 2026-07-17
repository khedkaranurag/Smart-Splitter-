# 📖 SplitSmart — Complete Project Documentation

> **For a brand new developer who has never seen this codebase before.**
> This document explains *everything* — what the project does, how it's built, what every file is, and how all the pieces connect.

---

## Table of Contents
1. [What is SplitSmart?](#1-what-is-splitsmart)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [How to Run](#4-how-to-run)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [The Graph Settlement Algorithm](#6-the-graph-settlement-algorithm)
7. [Real-Time WebSocket (STOMP)](#7-real-time-websocket-stomp)
8. [Frontend Deep Dive](#8-frontend-deep-dive)
9. [Database Schema](#9-database-schema)
10. [API Reference](#10-api-reference)
11. [Data Flow Walkthroughs](#11-data-flow-walkthroughs)
12. [Key Design Decisions](#12-key-design-decisions)

---

## 1. What is SplitSmart?

SplitSmart is a **collaborative expense-splitting web application**. When a group of people (roommates, friends on a trip, colleagues) share expenses, it helps them figure out who owes whom — and most importantly, how to settle everything with the **fewest possible money transfers**.

### The Core Problem It Solves

Imagine 4 friends go on a trip:
- Alice pays ₹1200 for hotel
- Bob pays ₹400 for petrol
- Carol pays ₹600 for food
- Dave pays nothing

A naive approach calculates that Dave owes Alice, Dave owes Bob, Dave owes Carol — 3 transactions just for Dave. For a group of 5, this could mean 10+ transactions.

**SplitSmart's graph minimization algorithm reduces this to the absolute minimum number of bank transfers** — often just 2-3 transactions to settle 10+ debts.

---

## 2. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Pure HTML + CSS + Vanilla JS | No build step needed, runs directly in browser |
| **Backend** | Java 17 + Spring Boot 3.2 | Industry standard, robust, production-ready |
| **Database** | MySQL 8.4 | Persistent relational data storage |
| **ORM** | Hibernate / Spring Data JPA | Auto-creates tables, simplifies DB queries |
| **Auth** | JWT (JSON Web Tokens) via JJWT | Stateless authentication; no server sessions |
| **Security** | Spring Security | CORS, password hashing, request authorization |
| **Real-Time** | WebSocket + STOMP + SockJS | Live updates when group members add expenses |
| **Email** | Spring Mail (Mock Mode) | Invitation emails (console-logged in dev) |
| **Build Tool** | Apache Maven 3.9.6 | Dependency management and build lifecycle |

---

## 3. Project Structure

```
JOSH MORE PROJECT/
│
├── apache-maven-3.9.6/          ← Used to build and run the backend Java app
│
├── backend/                     ← Spring Boot Java backend
│   ├── pom.xml                  ← Declares project dependencies (MySQL, Spring Web, JWT, etc.)
│   └── src/main/
│       ├── java/com/splitsmart/
│       │   ├── SplitSmartApplication.java   ← Starts the Spring Boot application server
│       │   ├── config/
│       │   │   ├── SecurityConfig.java      ← Enforces JWT rules and configures CORS
│       │   │   └── WebSocketConfig.java     ← Enables real-time STOMP/SockJS messaging
│       │   ├── controller/      ← HTTP REST API endpoints (handles web requests)
│       │   │   ├── AuthController.java      ← Handles /api/auth (Login & Registration)
│       │   │   ├── GroupController.java     ← Handles /api/groups (Create, List, Invite, Balances)
│       │   │   ├── ExpenseController.java   ← Handles /api/expenses (Add bills, list group bills)
│       │   │   └── SettlementController.java← Handles /api/settle (Compute & confirm debt payoffs)
│       │   ├── dto/             ← Request/Response data shapes (Data Transfer Objects)
│       │   │   ├── AddExpenseRequest.java   ← Shape of data sent from frontend when adding a bill
│       │   │   ├── ApiResponse.java         ← Standard JSON wrapper for all API responses
│       │   │   ├── AuthResponse.java        ← Returns token and user profile on successful login
│       │   │   ├── BalanceDTO.java          ← Represents how much a user owes or is owed
│       │   │   ├── CreateGroupRequest.java  ← Shape of data for creating a new group
│       │   │   ├── ExpenseDTO.java          ← Standard format for returning an expense + its splits
│       │   │   ├── LoginRequest.java        ← Shape of data for email/password login
│       │   │   ├── RegisterRequest.java     ← Shape of data for signing up
│       │   │   └── TransactionDTO.java      ← Represents one person paying another to settle debts
│       │   ├── model/           ← JPA entities (defines MySQL database tables)
│       │   │   ├── User.java                ← Represents a user account
│       │   │   ├── Group.java               ← Represents an expense group (Trip, Roommates, etc.)
│       │   │   ├── GroupMember.java         ← Link table: Which users are in which groups
│       │   │   ├── Expense.java             ← Represents a single bill/receipt
│       │   │   ├── ExpenseSplit.java        ← Represents one person's share of a specific bill
│       │   │   └── Settlement.java          ← Represents a confirmed debt payoff
│       │   ├── repository/      ← Spring Data JPA database queries (talks to MySQL)
│       │   │   ├── UserRepository.java      ← Queries user data (e.g., find by email)
│       │   │   ├── GroupRepository.java     ← Queries group data
│       │   │   ├── GroupMemberRepository.java← Queries group memberships
│       │   │   ├── ExpenseRepository.java   ← Queries bills for a group
│       │   │   ├── ExpenseSplitRepository.java← Queries individual split amounts
│       │   │   └── SettlementRepository.java← Queries settled debts
│       │   ├── security/        ← JWT authentication plumbing
│       │   │   ├── JwtUtil.java             ← Generates and verifies JWT tokens
│       │   │   ├── JwtFilter.java           ← Intercepts HTTP requests to check for valid tokens
│       │   │   └── UserDetailsServiceImpl.java← Loads user details from DB for Spring Security
│       │   └── service/         ← Core business logic (the "brains" of the backend)
│       │       ├── AuthService.java         ← Hashes passwords, logs users in, issues tokens
│       │       ├── GroupService.java        ← Creates groups, sends invites, computes net balances
│       │       ├── ExpenseService.java      ← Saves bills, calculates EQUAL/CUSTOM splits, broadcasts WS
│       │       ├── SettlementAlgorithm.java ← ⭐ Runs the greedy graph algorithm to minimize transactions
│       │       ├── SettlementService.java   ← Orchestrates settlement calculation and saving
│       │       └── EmailService.java        ← Sends invitation emails (mocked to console in dev)
│       └── resources/
│           └── application.properties       ← App settings (MySQL URL, JWT secret, server port)
│
└── frontend/                    ← Pure HTML/CSS/JS client
    ├── index.html               ← Landing page (redirects to login or dashboard)
    ├── login.html               ← Register & Login UI
    ├── dashboard.html           ← Shows a grid of all your groups and total balances
    ├── create-group.html        ← UI for making a new group and inviting members
    ├── group.html               ← Main screen: shows the expense feed, sidebar balances, and "Add Bill" form
    ├── settle.html              ← Shows the D3.js visual graph and list of debt payoffs
    ├── css/
    │   ├── base.css             ← Global styles, fonts, color variables, animations
    │   ├── components.css       ← Reusable buttons, form inputs, modals, navbars
    │   └── pages.css            ← Layouts specific to dashboard, group, and settle pages
    └── js/
        ├── api.js               ← Manages HTTP requests (auto-adds JWT) and WebSocket connections
        ├── auth.js              ← Logic for the login/register forms
        ├── dashboard.js         ← Logic for fetching and rendering group cards
        ├── create-group.js      ← Logic for the multi-step group creation form
        ├── group.js             ← Logic for adding bills, changing split types, and live WS updates
        └── settle.js            ← Logic for rendering the D3.js settlement graph and saving payoffs
```

---

## 4. How to Run

### Prerequisites
- Java 17
- Apache Maven 3.9.6 (in `apache-maven-3.9.6/` folder)
- MySQL 8.4 running on port 3306
- Python (for the frontend server)

### Step 1: Start MySQL
```powershell
# Start MySQL as Administrator
Start-Process powershell -Verb RunAs -ArgumentList "-Command", "net start MySQL84"
```

### Step 2: Start the Backend
```powershell
cd "c:\Users\user\Downloads\JOSH MORE PROJECT\backend"
..\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```
Wait for: `Started SplitSmartApplication in X seconds`
Backend available at: **http://localhost:8080**

### Step 3: Start the Frontend
```powershell
cd "c:\Users\user\Downloads\JOSH MORE PROJECT\frontend"
python -m http.server 3000
```
Open: **http://localhost:3000**

---

## 5. Backend Deep Dive

### 5.1 Entry Point

**`SplitSmartApplication.java`** — Standard Spring Boot bootstrapper. `@SpringBootApplication` auto-scans all sub-packages for components, configurations, and repositories.

---

### 5.2 Data Models (Entities)

Each class maps to a MySQL table. Hibernate auto-creates them on startup.

#### `User.java` → table: `users`
| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-incremented |
| `name` | VARCHAR(100) | Display name |
| `email` | VARCHAR(150) | Unique, used for login |
| `password_hash` | VARCHAR(255) | BCrypt hashed |
| `avatar_color` | VARCHAR(20) | Random hex color for avatar circle |
| `created_at` | DATETIME | Auto-set on creation |

#### `Group.java` → table: `expense_groups`
> Named `expense_groups` because `GROUP` is a reserved SQL keyword.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | |
| `name` | VARCHAR(100) | |
| `type` | ENUM | `ROOMMATES`, `TRIP`, `FRIENDS`, `CUSTOM` |
| `invite_code` | VARCHAR(20) | Unique 8-char code e.g. `ABCD1234` |
| `created_by` | FK → users | |
| `archived` | BOOLEAN | Soft-delete flag |

#### `GroupMember.java` → table: `group_members`
Bridge table joining users to groups (many-to-many).

#### `Expense.java` → table: `expenses`
One expense paid by one person.

| Column | Type | Notes |
|---|---|---|
| `description` | VARCHAR(255) | "Hotel Room", "Petrol" |
| `amount` | DECIMAL(10,2) | Total paid |
| `paid_by` | FK → users | Who paid |
| `split_type` | ENUM | `EQUAL`, `CUSTOM`, `PERCENTAGE` |

#### `ExpenseSplit.java` → table: `expense_splits`
One row per person per expense — their individual share.

| Column | Type |
|---|---|
| `expense_id` | FK → expenses |
| `user_id` | FK → users |
| `amount_owed` | DECIMAL(10,2) |

#### `Settlement.java` → table: `settlements`
Records confirmed money transfers after settling up.

---

### 5.3 Repositories

Interfaces only — Spring Data JPA generates all SQL at runtime.

```java
// Spring auto-generates: SELECT * FROM users WHERE email = ?
Optional<User> findByEmail(String email);

// Custom JPQL query
@Query("SELECT g FROM Group g JOIN g.members m WHERE m.user.id = :userId AND g.archived = false")
List<Group> findActiveGroupsByUserId(@Param("userId") Long userId);
```

---

### 5.4 DTOs (Data Transfer Objects)

DTOs define the **shape of JSON going in/out of the API**, keeping internal DB models private.

**`ApiResponse<T>`** — every API response wrapper:
```json
{ "success": true, "message": "Group created", "data": { ... } }
```

**`AuthResponse`** — returned after login/register:
```json
{ "token": "eyJ...", "userId": 1, "name": "Josh", "email": "...", "avatarColor": "#7c3aed" }
```

**`TransactionDTO`** — one minimized settlement transaction:
```json
{ "fromUserName": "Dave", "toUserName": "Alice", "amount": 450.00 }
```

---

### 5.5 Services (Business Logic)

#### `AuthService.java`
- **`register()`**: Check email unique → BCrypt hash password → save User → generate JWT → return AuthResponse
- **`login()`**: Find user by email → `BCryptPasswordEncoder.matches(raw, hash)` → generate JWT

#### `GroupService.java`
- **`createGroup()`**: Save group with random 8-char invite code → add creator as member → invite others by email → send invitation emails
- **`getBalances()`**: Core balance calculation:
  1. Sum all expenses paid per person (credits)
  2. Sum all expense_splits owed per person (debits)
  3. `net = total_paid - total_owed`
  4. Return sorted list: positive = creditor, negative = debtor

#### `ExpenseService.java`
- **`addExpense()`**:
  1. Save `Expense` record
  2. `computeSplits()` based on type:
     - **EQUAL**: `amount ÷ n_members` each
     - **CUSTOM**: exact amounts per person
     - **PERCENTAGE**: `amount × (pct / 100)` each
  3. Save `ExpenseSplit` rows
  4. **Push via WebSocket** → all browsers in group get notified instantly

#### `EmailService.java`
- `spring.mail.host=mock` → prints formatted email to console
- Real SMTP configured → sends actual email via `JavaMailSender`

---

### 5.6 Controllers (REST API)

#### `AuthController.java`
| Method | URL | Auth Required |
|---|---|---|
| POST | `/api/auth/register` | ❌ Public |
| POST | `/api/auth/login` | ❌ Public |

#### `GroupController.java`
| Method | URL | Description |
|---|---|---|
| POST | `/api/groups` | Create group |
| GET | `/api/groups` | List my groups |
| GET | `/api/groups/{id}` | Group + members |
| POST | `/api/groups/{id}/invite` | Invite member by email |
| GET | `/api/groups/{id}/balances` | Net balances |

#### `ExpenseController.java`
| Method | URL | Description |
|---|---|---|
| POST | `/api/expenses` | Add expense |
| GET | `/api/expenses/group/{id}` | List group expenses |

#### `SettlementController.java`
| Method | URL | Description |
|---|---|---|
| GET | `/api/settle/{id}` | Compute min transactions (read-only) |
| POST | `/api/settle/{id}/confirm` | Save settlement to DB |

---

### 5.7 Security (JWT + Spring Security)

#### How Authentication Works End-to-End

**Registration/Login:**
```
User submits form
  → POST /api/auth/register
  → BCrypt.hash(password) saved to DB
  → JwtUtil.generateToken(email) → 24h JWT
  → Frontend: Auth.save({ token, userId, name... }) in localStorage
```

**Every Protected Request:**
```
Browser sends: Authorization: Bearer eyJ...
  → JwtFilter extracts token
  → JwtUtil.validateToken() → checks HMAC signature + expiry
  → JwtUtil.extractEmail() → "josh@email.com"
  → UserDetailsServiceImpl loads user from DB
  → Spring Security marks request as authenticated
  → Controller proceeds
```

**Password Security:**
- BCrypt with work factor 10
- Same password → different hash every time (salted)
- `BCryptPasswordEncoder.matches(raw, storedHash)` for login verification

---

### 5.8 Configuration (`application.properties`)

```properties
# MySQL connection
spring.datasource.url=jdbc:mysql://localhost:3306/splitsmart?useSSL=false&serverTimezone=Asia/Kolkata
spring.datasource.username=root
spring.datasource.password=

# Hibernate auto-manages tables
spring.jpa.hibernate.ddl-auto=update

# JWT — 24 hour expiry
jwt.secret=splitsmart-super-secret-jwt-signing-key-must-be-at-least-256-bits-long
jwt.expiration=86400000

# Email — mock mode (no real emails in dev)
spring.mail.host=mock
```

---

## 6. The Graph Settlement Algorithm

**File:** `SettlementAlgorithm.java`

### The Problem
After balance calculation we have:
```
Alice  → +₹800  (owed money — creditor)
Bob    → +₹200  (owed money — creditor)
Carol  → -₹600  (owes money — debtor)
Dave   → -₹400  (owes money — debtor)
```

We need to find the minimum number of transfers to zero out all balances.

### The Greedy Algorithm

Uses two priority queues:
- **Max-heap of creditors** (largest credit first)
- **Min-heap of debtors** (largest debt first, most negative)

**Each iteration:**
1. Take the biggest creditor (Alice +₹800)
2. Take the biggest debtor (Carol -₹600)
3. Transaction = `min(₹800, ₹600)` = **₹600**
4. Record: *"Carol pays Alice ₹600"*
5. Alice remaining: ₹200 → back in heap
6. Carol remaining: ₹0 → done

**Repeat until both heaps empty.**

**Result:** At most N-1 transactions for N people (theoretical minimum).
**Complexity:** O(N log N)

### Example
```
Input:  Alice +800, Bob +200, Carol -600, Dave -400
Step 1: Carol → Alice ₹600   [Alice now +200, Carol done]
Step 2: Dave  → Alice ₹200   [Alice done, Dave now -200]
Step 3: Dave  → Bob   ₹200   [Dave done, Bob done]
Output: 3 transactions (instead of naive 4+)
```

---

## 7. Real-Time WebSocket (STOMP)

**Files:** `WebSocketConfig.java`, `api.js`

WebSocket lets the server **push data to browsers** without polling. When User A adds an expense, User B's screen updates **instantly** without refreshing.

### Backend Setup
```java
// WebSocketConfig.java
registry.addEndpoint("/ws").withSockJS();     // connection endpoint
config.enableSimpleBroker("/topic");           // server-push channels
config.setApplicationDestinationPrefixes("/app"); // client-send prefix
```

### Frontend Connection
```javascript
// api.js — WS object
const socket = new SockJS('http://localhost:8080/ws');
const client = Stomp.over(socket);
client.connect({}, () => {
    // Subscribe to live expense feed
    client.subscribe('/topic/group/5', (msg) => {
        appendExpenseToFeed(JSON.parse(msg.body));
    });
    // Subscribe to live balance updates
    client.subscribe('/topic/balance/5', (msg) => {
        renderBalances(JSON.parse(msg.body));
    });
});
```

### The Two Live Channels
| Channel | Triggered When | Payload |
|---|---|---|
| `/topic/group/{id}` | Expense added | `ExpenseDTO` — new expense with splits |
| `/topic/balance/{id}` | Any expense added | `List<BalanceDTO>` — updated net balances |

**Why SockJS?** Automatic fallback to long-polling if WebSocket is blocked by firewalls/proxies.

---

## 8. Frontend Deep Dive

Zero-dependency vanilla HTML/CSS/JS — no React, no build step.

### 8.1 Pages

| File | URL | Purpose |
|---|---|---|
| `index.html` | `/` | Redirects: logged in → dashboard, else → login |
| `login.html` | `/login.html` | Register / Login tabs |
| `dashboard.html` | `/dashboard.html` | All my groups with balance summaries |
| `create-group.html` | `/create-group.html` | Type → Name → Members → Create |
| `group.html` | `/group.html?id=5` | 3-column: balances / expense feed / add bill |
| `settle.html` | `/settle.html?id=5` | D3.js graph + settlement transaction list |

### 8.2 JavaScript Modules

#### `api.js` — Foundation (all other files depend on this)

**`Auth` object** — localStorage wrapper:
```javascript
Auth.save(data)        // saves token + user profile after login
Auth.token()           // returns "eyJ..."
Auth.user()            // returns { id, name, email, avatarColor }
Auth.isLoggedIn()      // true if token exists
Auth.logout()          // clears localStorage
```

**`apiFetch()`** — core HTTP client, auto-attaches JWT:
```javascript
const res = await apiFetch('GET', '/groups/5');
// Sends: Authorization: Bearer <token>
```

**API namespaces:**
```javascript
GroupsAPI.list()                         // GET /api/groups
GroupsAPI.create({ name, type, ... })    // POST /api/groups
GroupsAPI.balances(groupId)              // GET /api/groups/5/balances
ExpensesAPI.add({ groupId, ... })        // POST /api/expenses
SettleAPI.compute(groupId)              // GET /api/settle/5
```

**`WS` object** — WebSocket manager:
```javascript
WS.connect(onConnectCallback)
WS.subscribe('/topic/group/5', callback)
WS.disconnect()
```

**UI Helpers:**
- `showToast(msg, type)` — slide-in notification (success/error/info)
- `formatAmount(n)` — formats as ₹1,200.00 (INR locale)
- `timeAgo(dateStr)` — "3 minutes ago", "2 hours ago"
- `getInitials(name)` — "Alice Smith" → "AS"
- `requireAuth()` — redirects to login if not authenticated

#### `auth.js`
Tab switching (Register/Login), form validation, calls `AuthAPI`, saves with `Auth.save()`, redirects to dashboard.

#### `dashboard.js`
Loads groups + balances in parallel, renders group cards with member count and user's net balance (green = owed, red = owes).

#### `create-group.js`
Multi-step form: type selector cards → name input → email chip input (add/remove emails) → `GroupsAPI.create()` → redirect to new group.

#### `group.js` *(largest file, 316 lines)*
- Parallel init: `loadGroupInfo()`, `loadFeed()`, `loadBalances()`, `setupWebSocket()`
- **Bill form**: validates → `ExpensesAPI.add()` → refreshes UI
- **Split types**: EQUAL hides custom inputs; CUSTOM/PERCENTAGE shows per-member inputs
- **WebSocket**: subscribes to both channels, updates feed + balances live
- **WhatsApp**: `shareViaWhatsApp()` opens `wa.me/?text=...` with pre-filled invite message

#### `settle.js`
- Calls `SettleAPI.compute()` → receives minimum transaction list
- Renders **D3.js force-directed graph**: nodes = people, edges = payment directions
- Shows numbered transaction list below graph
- "Confirm Settlement" → `SettleAPI.confirm()` saves to DB

### 8.3 CSS Architecture

**`base.css`** — Design tokens + reset:
```css
:root {
  --accent-purple: #7c3aed;
  --grad-teal: linear-gradient(135deg, #0891b2, #06b6d4);
  --glass-bg: rgba(255,255,255,0.06);       /* glassmorphism */
  --bg-primary: #080c18;                    /* deep dark navy */
  --shadow-glow: 0 0 40px rgba(124,58,237,0.15);
}
```
Animations: `fadeIn`, `slideInUp`, `spin`, `pulse`, `shimmer`.

**`components.css`** — Reusable UI:
- Buttons: `btn-primary` (purple), `btn-teal`, `btn-secondary` (glass), `btn-whatsapp` (green)
- Glass cards with `backdrop-filter: blur(20px)`
- Form inputs with purple focus ring
- Modal overlay + animated dialog
- Member chips (toggle selectors for expense splitting)

**`pages.css`** — Page layouts:
- `group-layout`: CSS Grid 3-column (sidebar / feed / bill panel)
- `feed-scroll`: Fixed-height scrollable expense timeline
- `settle-grid`: Settlement graph + transaction list side-by-side

---

## 9. Database Schema

```
users
  id (PK) | name | email (UNIQUE) | password_hash | avatar_color | created_at

expense_groups
  id (PK) | name | type | invite_code (UNIQUE) | created_by (FK→users) | archived | created_at

group_members  [bridge: users ↔ expense_groups]
  id (PK) | group_id (FK) | user_id (FK) | joined_at

expenses
  id (PK) | group_id (FK) | description | amount | paid_by (FK→users) | split_type | created_at

expense_splits  [one row per person per expense]
  id (PK) | expense_id (FK) | user_id (FK) | amount_owed

settlements
  id (PK) | group_id (FK) | from_user (FK) | to_user (FK) | amount | settled_at
```

**Key Relationships:**
- A `User` can be in many `Groups` (via `group_members`)
- A `Group` has many `Expenses`
- Each `Expense` has many `ExpenseSplits` (one per involved person)
- `ExpenseSplit.amount_owed` is what each person owes for that specific expense

---

## 10. API Reference

All protected endpoints require header: `Authorization: Bearer <token>`

### Auth
```
POST /api/auth/register   Body: { name, email, password }
POST /api/auth/login      Body: { email, password }
Both return: { success, data: { token, userId, name, email, avatarColor } }
```

### Groups
```
POST   /api/groups                  Body: { name, type, memberEmails[] }
GET    /api/groups                  → list of user's groups
GET    /api/groups/{id}             → group + members
POST   /api/groups/{id}/invite      Body: { email }
GET    /api/groups/{id}/balances    → [{ userId, userName, netBalance }]
```

### Expenses
```
POST /api/expenses
  Body (EQUAL):      { groupId, description, amount, paidById, splitType:"EQUAL", memberIds:[1,2,3] }
  Body (CUSTOM):     { ..., splitType:"CUSTOM", customSplits:{"1":500,"2":400} }
  Body (PERCENTAGE): { ..., splitType:"PERCENTAGE", percentageSplits:{"1":60.0,"2":40.0} }

GET /api/expenses/group/{groupId}   → list of ExpenseDTOs with split details
```

### Settlement
```
GET  /api/settle/{groupId}           → minimum transaction list (read-only, does NOT save)
POST /api/settle/{groupId}/confirm   → saves transactions to settlements table
```

---

## 11. Data Flow Walkthroughs

### Flow A: User Registers
```
1. User fills register form (login.html)
2. auth.js → POST /api/auth/register
3. AuthController → AuthService.register()
4.   userRepository.existsByEmail() → no duplicate
5.   BCryptPasswordEncoder.encode(password)
6.   userRepository.save(new User(...))
7.   JwtUtil.generateToken(email) → "eyJ..."
8. Response: { token, userId, name, avatarColor }
9. Frontend: Auth.save(response.data) → localStorage
10. Redirect → dashboard.html
```

### Flow B: User Adds an Expense
```
1. Fill "Add Expense" form on group.html
2. group.js → POST /api/expenses
3. ExpenseController → ExpenseService.addExpense()
4.   Save Expense to DB
5.   computeSplits() → save ExpenseSplit rows
6.   messagingTemplate.send("/topic/group/5", expenseDTO)
        ↓ pushed to ALL browsers in this group instantly!
7.   Recalculate balances → send("/topic/balance/5", balances)
8. Other browsers (WS subscribed):
     appendExpenseToFeed(expense) → new card appears
     renderBalances(balances)     → sidebar updates
```

### Flow C: Settling Up
```
1. Click "Settle Up" → settle.html?id=5
2. settle.js → GET /api/settle/5
3. SettlementController → SettlementService
4.   groupService.getBalances(5) → net balances
5.   settlementAlgorithm.minimize(balances) → min transactions
6. settle.js receives TransactionDTO list
7. D3.js renders force graph (nodes = people, edges = payment flows)
8. Transaction list rendered below
9. Click "Confirm" → POST /api/settle/5/confirm
10. Transactions saved to settlements table
```

---

## 12. Key Design Decisions

| Decision | Reason |
|---|---|
| **JWT stateless auth** | No server-side sessions. Scales horizontally. Any server instance can validate. |
| **BCrypt passwords** | Industry standard. Salted. Adaptive work factor. Never reversible. |
| **STOMP over SockJS** | SockJS provides fallback transport (long-poll) for restricted networks. STOMP adds pub/sub semantics. |
| **`ddl-auto=update`** | Hibernate auto-creates/updates tables from Java classes. No manual SQL schemas. |
| **Greedy balance algorithm** | O(N log N) with priority queues. Produces at most N-1 transactions (minimum possible). Practical for 100s of people. |
| **INR (₹) currency** | `formatAmount()` in `api.js` uses `en-IN` locale. Change there to support other currencies. |
| **Vanilla JS** | Zero build step. Any browser opens HTML files directly. No framework learning curve. |
| **Glassmorphism dark UI** | Modern aesthetic. `backdrop-filter: blur()` + deep navy background `#080c18` + purple accent `#7c3aed`. |
| **WhatsApp share (no API)** | `wa.me/?text=` deep-link opens WhatsApp with pre-filled message. 100% free. No API keys needed. |
| **Mock email mode** | `spring.mail.host=mock` → logs email to console. Switch to real SMTP just by updating `application.properties`. |

---

## 13. How SplitSmart is Different from Competitors (e.g., Splitwise, Google Pay)

When asked **"Why build another splitting app?"**, here is how SplitSmart stands out technically and functionally from existing platforms:

1. **Greedy Debt Minimization (The Core USP):**
   - **Google Pay** splitting is mostly 1-to-N (one person requests money from N friends). It doesn't continuously track running balances over days/weeks to cancel out debts.
   - **Splitwise** has a "Simplify Debts" feature, but SplitSmart builds this natively into the core graph algorithm using Max/Min Priority Heaps. Every settlement strictly enforces O(N log N) minimization.
   
2. **Real-Time WebSocket Sync:**
   - Unlike basic CRUD apps that require manual page refreshes, SplitSmart uses **STOMP/WebSocket**. If a roommate adds an expense from their phone, your browser updates the balance and the feed **instantly**.

3. **No Heavy Frontend Framework:**
   - Instead of shipping a massive React or Angular bundle, SplitSmart uses pure Vanilla JS and CSS. This guarantees near-instant initial page loads and makes the codebase extremely accessible to developers.

4. **Zero-Friction Onboarding:**
   - Competitors often require complex app downloads. SplitSmart uses a responsive web interface with a simple 8-character invite code and deep-linked WhatsApp sharing.

---

## 14. Common Interview Questions (And How to Answer Them)

If you are presenting this project in a technical interview, expect these questions:

### Q1. "How does your settlement algorithm actually work?"
**Answer:** "It uses a greedy approach to solve the cash-flow minimization problem. After calculating everyone's net balance (total paid minus total owed), I split the users into two Priority Queues: a Max-Heap for creditors (people owed money) and a Min-Heap for debtors (people who owe money). While both heaps aren't empty, I pop the biggest creditor and biggest debtor, create a transaction for the minimum of their two balances, and push any remaining balance back into the respective heap. This guarantees at most N-1 transactions."

### Q2. "Why did you use WebSocket instead of REST polling?"
**Answer:** "For a collaborative app, users need to see expenses as soon as they are added. REST polling (e.g., `setInterval` every 5 seconds) would spam the backend with unnecessary requests, wasting server CPU and database connections. WebSockets maintain a persistent, bidirectional connection, allowing the server to *push* updates exactly when they happen, resulting in lower latency and reduced server load."

### Q3. "How are you handling security and sessions?"
**Answer:** "The app is completely stateless. Instead of server-side sessions, I implemented JWT (JSON Web Tokens). When a user logs in, the backend verifies their BCrypt-hashed password and issues a signed JWT. The frontend stores this token and attaches it to the `Authorization: Bearer` header of every API request. A Spring Security filter chain intercepts these requests, validates the cryptographic signature, and authenticates the user."

### Q4. "What happens if two people add an expense at the exact same time?"
**Answer:** "Because I am using Spring Boot with Hibernate and a relational database (MySQL), the database handles concurrency via ACID transactions. If both requests hit the backend simultaneously, they are processed in isolated transactions. Since the net balances are calculated dynamically from the `expenses` and `expense_splits` tables rather than keeping a running total column, there are no race conditions with balance updates."

### Q5. "Why did you choose Java/Spring Boot over Node.js?"
**Answer:** "Spring Boot enforces a very clean, structured, and strictly-typed architecture (Controllers → Services → Repositories). This makes it highly scalable for complex business logic, like the graph minimization algorithm and complex relational data mapping via JPA/Hibernate. Furthermore, Spring’s built-in support for STOMP over WebSocket made implementing the real-time features very robust."

---

*Generated: June 2026 | SplitSmart v1.0.0 | MySQL + Spring Boot + Vanilla JS*
