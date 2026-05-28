# Help 4 Friends

Production-grade modular monolith for reporting abandoned dogs and matching nearby organizations.

## Stack

- Frontend: React + TypeScript + Vite + Redux Toolkit + React Router + Framer Motion
- Backend: Node.js + Express + TypeScript (Controller -> Service -> Repository)
- Database: PostgreSQL + SQL (pg driver)

## Project Structure

- client/src/pages
- client/src/components
- client/src/features
- client/src/services
- client/src/hooks
- client/src/types
- client/src/store
- client/src/styles
- server/src/modules/{auth,users,organizations,reports,matching,help,admin}
- server/src/{config,middlewares,utils,routes,types}
- server/sql

## Run

1. Install dependencies:
   - npm install
2. Prepare server env:
   - copy server/.env.example to server/.env
3. Create database schema:
   - npm run db:init --workspace server
4. Seed sample data:
   - npm run db:seed --workspace server
5. Start both apps:
   - npm run dev

## Roles

- USER
- ORGANIZATION
- ADMIN

JWT-based authentication and role-based route protection are implemented in both backend and frontend.

## Key API Endpoints

- POST /api/auth/register
- POST /api/auth/login
- GET /api/users/me
- PUT /api/users/me
- GET /api/organizations
- GET /api/organizations/nearby
- POST /api/reports
- GET /api/reports/me
- GET /api/reports/all
- PATCH /api/reports/:id/status
- GET /api/reports/:id/matches
- POST /api/help
- GET /api/help/me
- GET /api/admin/dashboard

## Phases Covered

- MVP: Auth, report creation, geolocation, nearby matching
- Alpha: Dashboards, report status updates, help options, image upload
- Final: UI polish, robust error handling, admin management panel
# Wedd
