CREATE DATABASE splitsmart;
SHOW DATABASES;
USE splitsmart;
SHOW TABLES;
-- Check registered users
SELECT * FROM users;

-- Check groups created
SELECT * FROM groups;

-- Check group members
SELECT * FROM group_members;

-- Check expenses added
SELECT * FROM expenses;

-- Check how expenses were split among members
SELECT * FROM expense_splits;

-- Check settlements/payments
SELECT * FROM settlements;