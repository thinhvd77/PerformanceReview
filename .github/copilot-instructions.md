# Performance Review Form Management System - AI Coding Instructions

## System Overview

This is a full-stack Performance Review management system with three main roles:
- **Admin**: Complete system control, user management, form templates, and exports
- **Manager** (QLRR dept): Can view department submissions and export summaries
- **Employee**: Can fill forms assigned to their position

**Tech Stack**: Node.js (Express) + PostgreSQL (TypeORM) + React (Vite) + Ant Design

## Architecture & Key Components

### Backend Structure (`/backend/src/`)
- **Database**: TypeORM with EntitySchema pattern (User, FormTemplate, ExportRecord entities)
- **Authentication**: JWT-based with role-based access control (`middlewares/auth.js`)
- **File Processing**: Excel import/export using ExcelJS library
- **API Routes**: RESTful structure with `/api` prefix

### Frontend Structure (`/frontend/src/`)
- **Pages**: Role-based routing (Admin, Dashboard for managers, User forms)
- **Components**: Modular UI components using Ant Design
- **State Management**: React Context for authentication
- **File Handling**: Excel export/import with client-side processing

## Critical Development Patterns

### 1. Organization Data Structure
The system uses a hierarchical organizational structure defined in `utils/orgData.js` (both frontend/backend):
```javascript
orgData = {
  branches: [{ id: 'hs', name: 'Hội sở' }, ...],
  departments: { 'hs': [{ id: 'hs-kt', name: 'Kế toán & ngân quỹ' }], ... },
  positions: { 'hs-kt': [{ id: 'hs-kt-tp', name: 'Trưởng phòng' }], ... }
}
```
**Pattern**: IDs are hierarchical (branch-dept-position) for form assignment matching.

### 2. Form Assignment System
Forms are assigned to positions using `assignedGroups` (array) or legacy `assignedGroup`:
```javascript
// Multiple assignments supported
assignedGroups: [
  { branchId: 'hs', departmentId: 'hs-kt', positionId: 'hs-kt-tp' }
]
```
**Critical**: Form filtering in `controllers/formTemplate.controller.js` matches user's exact position.

### 3. Excel Processing Pipeline
**Import**: Excel → JSON schema → FormTemplate entity → Database
**Export**: Form data → ExcelJS → Protected Excel file → File storage
- Files stored in `uploads/` (import) and `uploads/exports/` (submitted forms)
- Excel protection with password "Admin@6421"
- Custom table rendering for complex form layouts

### 4. Authentication Flow
```javascript
// Frontend: JWT token + user object in localStorage
// Backend: middleware chain authenticateToken → authorizeRole
// Token validation includes server-side verification on app bootstrap
```

### 5. Role-Based Access Patterns
```javascript
// Route protection pattern
<PrivateRoute adminOnly={true}>          // Admin only
<PrivateRoute allowedRoles={["manager"]}> // Specific roles  
<PrivateRoute>                           // Any authenticated user
```

## Development Workflows

### Database Operations
```bash
# TypeORM commands (from /backend)
npm run typeorm -- migration:generate --outputJs src/migrations/MigrationName
npm run migration:run
```

### Development Servers
```bash
# Backend (Port 5000)
cd backend && npm run dev

# Frontend (Port 5173) 
cd frontend && npm run dev
```

### API Documentation
Swagger UI available at `/api-docs` when backend running.

## Integration Points

### File Upload Flow
1. **Import**: `POST /api/files/upload` → Excel processing → FormTemplate creation
2. **Export**: Client generates Excel → `POST /api/exports` → Server stores file

### Form Data Flow
1. User selects position → `GET /api/form-templates` (filtered by position)
2. Form interaction → ExcelJS export → File upload with metadata
3. Admin views → `GET /api/exports` → Download/view submitted forms

### Department Summary Export
Manager role can export department summaries via `GET /api/exports/department-summary` with branch/department filters.

## Key Dependencies & Utilities

- **ExcelJS**: Complex Excel file manipulation (protection, styling, formulas)
- **Multer**: File upload handling with disk storage
- **Ant Design**: UI consistency - always use existing components
- **orgData utility**: Central source for organizational hierarchy
- **findNameById()**: Maps IDs to display names throughout the system

## Common Gotchas

1. **Organization IDs**: Always use hierarchical format (branch-dept-position)
2. **Form Assignment**: Must match exact position for user to see forms
3. **Excel Protection**: Password-protected exports prevent user modifications
4. **File Paths**: Use relative paths for database storage, absolute for file operations
5. **Role Normalization**: Always normalize role strings to lowercase for comparisons
6. **Token Validation**: Server-side verification on app bootstrap prevents stale tokens

## Testing & Debugging

- Default admin: username `admin`, password `admin123`
- Check browser localStorage for token/user persistence issues  
- Excel file processing errors often relate to schema parsing in `services/upload.service.js`
- Form assignment issues: verify orgData hierarchy matches database user positions