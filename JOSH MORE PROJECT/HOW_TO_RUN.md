# How to Run SplitSmart (Locally)

This guide provides exactly what you need to run this project on any Windows PC smoothly, using the tools already included in the folder.

---

## 1. Prerequisites

Before running the project, you only need to have these two things installed on your computer:
1. **Java 17 or higher**
2. **MySQL 8.4**
3. **Python 3.10+** (only for the frontend web server)

> **Note:** You do *not* need to install Maven. This project includes an embedded version of Maven (`apache-maven-3.9.6` folder) so it works out-of-the-box everywhere!

---

## 2. Set Up the Database (MySQL)

By default, the application expects a MySQL server running locally on port `3306` with the username `root` and **no password**. 

1. Start your MySQL Server.
2. Open a terminal or MySQL Command Line and run:
   ```sql
   CREATE DATABASE IF NOT EXISTS splitsmart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

*(If your MySQL `root` user has a password, you must open `backend/src/main/resources/application.properties` and change `spring.datasource.password=` to your actual password before proceeding).*

---

## 3. Run the Backend (Spring Boot)

1. Open **Command Prompt** or **PowerShell**.
2. Navigate to the `backend` folder inside the project:
   ```powershell
   cd "backend"
   ```
3. Run the application using the **bundled Maven** (this prevents any "mvn is not recognized" errors):
   ```powershell
   ..\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
   ```
4. Maven will download the required Java dependencies. Once you see `Started SplitSmartApplication` in the logs, the backend is running!
   - API is running at: **http://localhost:8080**
   - *Hibernate automatically creates all the tables inside your `splitsmart` database upon first boot.*

---

## 4. Run the Frontend (Vanilla JS)

The frontend is pure HTML/JS/CSS, but it needs to be served through a local server so the browser doesn't block API requests (CORS policy).

1. Open a **new** terminal window (keep the backend running in the first one).
2. Navigate to the `frontend` folder:
   ```powershell
   cd "frontend"
   ```
3. Start the built-in Python web server:
   ```powershell
   python -m http.server 3000
   ```
4. Open your web browser and go to: **http://localhost:3000**

---

## 5. Verify the Application

1. You will be redirected to the login page (`login.html`).
2. Click on **Create Account** and register a new user.
3. You will be redirected to the dashboard.
4. Click **+ New Group**, choose a type, and create your first group.
5. Add an expense to see the real-time feed and balances update!

---

## Troubleshooting

- **"Can't connect to MySQL server on 'localhost:3306'"**: Your MySQL service is not running. Open an Administrator PowerShell and run `net start MySQL84` (or whatever your service is named).
- **"Unknown database 'splitsmart'"**: You forgot to run the `CREATE DATABASE` command in Step 2.
- **Frontend isn't loading or looks broken**: Make sure you are accessing `http://localhost:3000` and not double-clicking the `index.html` file directly in Windows Explorer.
