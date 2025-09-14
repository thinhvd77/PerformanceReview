# Fullstack JavaScript Application

Ứng dụng fullstack sử dụng ExpressJS, PostgreSQL, TypeORM cho backend và React Vite cho frontend.

## Công nghệ sử dụng

### Backend
- ExpressJS
- PostgreSQL
- TypeORM
- JWT Authentication
- Bcrypt

### Frontend
- React với Vite
- React Router
- Axios
- React Hook Form

## Cài đặt

### Prerequisites
- Node.js (v14+)
- PostgreSQL

### Backend Setup

```bash
cd backend
npm install
```

1. Tạo database PostgreSQL
2. Copy `.env.example` thành `.env` và cập nhật thông tin database
3. Chạy server:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Đăng ký user mới
- `POST /api/users/login` - Đăng nhập
- `GET /api/users/profile` - Lấy thông tin profile (yêu cầu auth)

### Posts
- `GET /api/posts` - Lấy tất cả posts
- `GET /api/posts/:id` - Lấy post theo ID
- `POST /api/posts` - Tạo post mới (yêu cầu auth)
- `PUT /api/posts/:id` - Cập nhật post (yêu cầu auth)
- `DELETE /api/posts/:id` - Xóa post (yêu cầu auth)

## Cấu trúc dự án

```
project-root/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── entities/       # TypeORM entities
│   │   ├── middlewares/    # Express middlewares
│   │   ├── routes/         # API routes
│   │   └── app.js         # Main application file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   ├── App.jsx         # Main App component
│   │   └── main.jsx        # Entry point
│   └── package.json
└── README.md
```

## Scripts

### Backend
- `npm start` - Chạy production server
- `npm run dev` - Chạy development server với nodemon

### Frontend
- `npm run dev` - Chạy development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Variables

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=mydatabase
JWT_SECRET=your_secret_key
PORT=5000
NODE_ENV=development
```

## License

MIT