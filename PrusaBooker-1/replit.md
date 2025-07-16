# MakerSpace 3D Printer Hub - replit.md

## Overview

MakerSpace is a comprehensive 3D printer management system built for educational and professional environments. The application provides QR code-based authentication for printer access, comprehensive training modules, booking management, and administrative tools for managing users and equipment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Build Tool**: Vite with React plugin
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: Neon PostgreSQL (serverless)
- **Authentication**: Replit OpenID Connect (OIDC) integration
- **Session Management**: Express sessions with PostgreSQL store

### Monorepo Structure
- **Client**: Frontend React application (`client/`)
- **Server**: Backend Express application (`server/`)
- **Shared**: Common schemas and types (`shared/`)

## Key Components

### Authentication System
- **Provider**: Replit OIDC authentication
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Authorization**: Role-based access control (admin/user roles)
- **Session Security**: HTTP-only cookies with secure settings

### Database Schema
- **Users**: Profile management with admin permissions
- **Printers**: Equipment tracking with status and location
- **Bookings**: Time-slot reservations with status tracking
- **Credentials**: Training certification system
- **Training Videos**: Educational content with progress tracking
- **Issues**: Equipment problem reporting
- **Notifications**: User messaging system

### Core Features
1. **QR Code Scanner**: Camera-based printer identification
2. **Booking System**: Time-slot based printer reservations
3. **Training Module**: Video-based certification system
4. **Admin Panel**: User, printer, and content management
5. **Notification System**: Real-time user alerts
6. **Issue Tracking**: Equipment problem reporting

### UI/UX Design
- **Design System**: shadcn/ui with "new-york" style
- **Theme**: Light/dark mode support with CSS variables
- **Responsive**: Mobile-first design with desktop optimizations
- **Navigation**: Sidebar for desktop, sheet navigation for mobile

## Data Flow

### Authentication Flow
1. User accesses application
2. Replit OIDC handles authentication
3. User session stored in PostgreSQL
4. Frontend receives user data via `/api/auth/user`

### Printer Access Flow
1. User scans QR code or selects printer
2. System checks user credentials/training
3. Booking creation if authorized
4. Real-time status updates

### Training System Flow
1. User selects credential type
2. Video progression tracking
3. Completion verification
4. Credential award upon completion

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: OpenID Connect authentication provider
- **WebSockets**: Real-time communication via ws library

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Production server bundling
- **TSX**: Development server with TypeScript support

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **date-fns**: Date manipulation utilities
- **TanStack Query**: Server state management

## Deployment Strategy

### Development Environment
- **Dev Server**: Concurrent React (Vite) and Express servers
- **Hot Reload**: Vite HMR for frontend, TSX watch for backend
- **Error Handling**: Runtime error modal for development

### Production Build
1. **Frontend**: Vite builds to `dist/public`
2. **Backend**: ESBuild bundles server to `dist/index.js`
3. **Static Serving**: Express serves built frontend assets
4. **Database**: Drizzle migrations via `db:push` command

### Environment Configuration
- **Database**: `DATABASE_URL` for PostgreSQL connection
- **Sessions**: `SESSION_SECRET` for session encryption
- **Auth**: `REPL_ID` and `ISSUER_URL` for OIDC
- **CORS**: `REPLIT_DOMAINS` for allowed origins

### Production Considerations
- **Error Boundaries**: Global error handling with status codes
- **Request Logging**: Structured API request/response logging
- **Security**: CSRF protection via same-origin session cookies
- **Performance**: Infinite stale time for stable data caching