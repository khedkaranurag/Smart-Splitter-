# 💸 SplitSmart

> Collaborative expense splitting with graph-based settlement optimization.

A full-stack web app where groups can log shared expenses and settle up using a **greedy graph minimization algorithm** that reduces transactions to the theoretical minimum (at most N-1 for N people).

---

## ⚙️ Tech Stack

| Layer       | Technology |
|-------------|-----------|
| Frontend    | HTML5, CSS3, Vanilla JavaScript, D3.js |
| Backend     | Java 17 + Spring Boot 3.2 |
| Database    | MySQL 8 |
| Auth        | Spring Security + JWT (JJWT 0.12.x) |
| Real-time   | Spring WebSocket (STOMP + SockJS) |
| Algorithm   | Greedy Min-Heap (Java PriorityQueue) |
| Graph Viz   | D3.js v7 Force-directed |

---

## 🚀 Quick Start

### Prerequisites

- **Java 17+** — [Download](https://adoptium.net/)
- **Maven 3.8+** — [Download](https://maven.apache.org/)
- **MySQL 8+** — [Download](https://dev.mysql.com/downloads/mysql/) or use Docker

### Step 1 — Start MySQL

Using Docker (easiest):
```bash
docker run --name splitsmart-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=splitsmart -p 3306:3306 -d mysql:8
```

Or start your local MySQL and create the database:
```sql
CREATE DATABASE splitsmart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2 — Configure Database

Edit `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/splitsmart?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=root   # ← change if needed
```

### Step 3 — Run the Backend

```bash
cd backend
mvn spring-boot:run
```

Backend starts at: **http://localhost:8080**

Hibernate will auto-create all tables on first run (`ddl-auto=update`).

### Step 4 — Open the Frontend

Open `frontend/index.html` directly in your browser, or serve it with:

```bash
# Using Python (from frontend/ directory)
python -m http.server 3000

# Then open: http://localhost:3000
```

Or just double-click `frontend/index.html` — it works from the filesystem too (CORS is configured to allow `file://` origins).

---

## 📁 Project Structure

```
JOSH MORE PROJECT/
├── backend/                          ← Spring Boot project
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/splitsmart/
│       │   ├── SplitSmartApplication.java
│       │   ├── config/               ← SecurityConfig, WebSocketConfig
│       │   ├── controller/           ← Auth, Group, Expense, Settlement
│       │   ├── service/              ← Business logic + Algorithm
│       │   ├── repository/           ← Spring Data JPA repos
│       │   ├── model/                ← JPA entities
│       │   ├── dto/                  ← Request/Response objects
│       │   └── security/             ← JWT util + filter
│       └── resources/
│           ├── application.properties
│           └── schema.sql            (reference — Hibernate auto-creates)
│
└── frontend/
    ├── index.html        → Redirect page
    ├── login.html        → Auth (register / login)
    ├── dashboard.html    → Group cards grid
    ├── group.html        → Chat feed + Add Bill + Balances sidebar
    ├── settle.html       → D3.js algorithm visualization
    ├── create-group.html → Group type selector + invite
    ├── css/
    │   ├── base.css      → Design tokens, typography, utilities
    │   ├── components.css → Buttons, cards, inputs, modal
    │   └── pages.css     → Page-specific layouts
    └── js/
        ├── api.js        → Fetch wrapper, JWT, WebSocket, helpers
        ├── auth.js       → Login/register logic
        ├── dashboard.js  → Groups list
        ├── group.js      → Chat feed + WebSocket + add bill
        ├── settle.js     → D3.js graph + algorithm visualization
        └── create-group.js
```

---

## 🔌 API Endpoints

### Auth (public)
```
POST /api/auth/register   → { name, email, password }
POST /api/auth/login      → { email, password }
```

### Groups (JWT required)
```
POST   /api/groups                → Create group
GET    /api/groups                → List user's groups
GET    /api/groups/{id}           → Group + members
POST   /api/groups/{id}/invite    → { email }
GET    /api/groups/{id}/balances  → Net balance per member
```

### Expenses (JWT required)
```
POST /api/expenses               → Add expense (EQUAL/CUSTOM/PERCENTAGE)
GET  /api/expenses/group/{id}    → Expense feed
```

### Settlement (JWT required)
```
GET  /api/settle/{groupId}         → Run algorithm, preview transactions
POST /api/settle/{groupId}/confirm → Persist settlements, archive group
```

### WebSocket (STOMP)
```
Connect:    ws://localhost:8080/ws  (via SockJS)
Subscribe:  /topic/group/{id}      → New expense broadcast
Subscribe:  /topic/balance/{id}    → Updated balances broadcast
```

---

## 🧠 The Settlement Algorithm

Located in [`SettlementAlgorithm.java`](backend/src/main/java/com/splitsmart/service/SettlementAlgorithm.java)

```
1. Compute net balance for each member (paid - owed)
2. Separate into max-heap (creditors) and min-heap (debtors)
3. Greedily match largest debtor with largest creditor
4. Settle min(credit, debt) between them
5. Re-queue if either still has a residual balance
6. Result: at most N-1 transactions for N people
```

**Complexity:** O(N log N) · **Result:** minimum possible transactions.

---

## 🎨 Frontend Design

- **Theme:** Dark navy glassmorphism (`#080c18` base, `blur(20px)` glass cards)
- **Accents:** Purple (`#7c3aed`) + Teal (`#06b6d4`)
- **Font:** Inter (Google Fonts)
- **Visualization:** D3.js force-directed graph with animated before → after transition

---

## ✅ Features Checklist

- [x] JWT register/login with avatar color assignment
- [x] Create groups (ROOMMATES / TRIP / FRIENDS / CUSTOM)
- [x] Invite members by email
- [x] Add expenses with EQUAL / CUSTOM / PERCENTAGE splits
- [x] Real-time expense feed via WebSocket (STOMP)
- [x] Net balance calculation per member
- [x] Graph minimization algorithm (greedy, O(N log N))
- [x] D3.js animated before/after graph visualization
- [x] Confirm & archive group after settlement
- [x] Responsive frontend with dark glassmorphism UI

---

*Built with Java Spring Boot · MySQL · HTML/CSS/JS · WebSocket · D3.js*
