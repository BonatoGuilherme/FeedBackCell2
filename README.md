# FeedBackCELL

![Docker](https://img.shields.io/badge/docker-ready-blue)
![Node](https://img.shields.io/badge/node-20-green)
![Next.js](https://img.shields.io/badge/next.js-16-black)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

Full-stack feedback platform built with **Next.js**, **Express**, and **MySQL**, containerized using **Docker**.

---

## 🚀 Quick Start

### Requirements

* Docker Desktop

### Run the project

```bash
docker compose up -d
```

### Services

* Frontend → http://localhost:3000
* Backend → http://localhost:5000
* Database → localhost:3307

---

## 📁 Project Structure

```
.
├── frontend/            # Next.js (App Router + TypeScript)
├── backend/             # Express API + MySQL
├── docker-compose.yml   # Services orchestration
├── .env                 # Environment variables template
└── README.md
```

---

## 🐳 Docker

### Main commands

```bash
# Start containers
docker compose up -d

# Stop containers
docker compose down

# Rebuild containers
docker compose up -d --build

# View logs
docker compose logs -f
```

---

## ⚙️ Environment Variables

### Backend (`.env`)

```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=feedbackcell
NODE_ENV=development
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---
---

## 🧱 Tech Stack

* **Frontend:** Next.js, TypeScript
* **Backend:** Node.js, Express
* **Database:** MySQL
* **Infrastructure:** Docker, Docker Compose

---

## 🛠 Development

Containers support live reload in development.

Rebuild if needed:

```bash
docker compose up -d --build
```

---

## 📌 Notes
