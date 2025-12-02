import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from "bcryptjs";
import { AppDataSource } from './config/database.js';
import userRoutes from './routes/user.routes.js';
import uploadRoutes from "./routes/upload.routes.js";
import formTemplateRoutes from './routes/formTemplate.routes.js';
import exportRoutes from './routes/export.routes.js';
import recordRoutes from "./routes/record.routes.js";
import bonusAwardRoutes from "./routes/bonusAward.routes.js";
import annualPlanRoutes from "./routes/annualPlan.routes.js";
import quarterPlanRoutes from "./routes/quarterPlan.routes.js";
import quarterActualRoutes from "./routes/quarterActual.routes.js";
import activityLogRoutes from "./routes/activityLog.routes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/files', uploadRoutes);
app.use('/api/forms', formTemplateRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/bonus-awards', bonusAwardRoutes);
app.use('/api/annual-plans', annualPlanRoutes);
app.use('/api/quarter-plans', quarterPlanRoutes);
app.use('/api/quarter-actuals', quarterActualRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Something went wrong!';
    
    // Log error in development
    if (isDevelopment) {
        console.error('Error:', err);
    } else {
        console.error('Error:', message);
    }
    
    const response = { message };
    if (isDevelopment && err.stack) {
        response.stack = err.stack;
    }
    
    res.status(statusCode).json(response);
});

// Initialize database and start server
const initializeApp = async () => {
    try {
        await AppDataSource.initialize();
        console.log('Database connected successfully');

        // Create default admin user if not exists
        const userRepository = AppDataSource.getRepository('User');
        const existingAdmin = await userRepository.findOneBy({ username: 'admin' });
        
        if (!existingAdmin) {
            console.log('Creating Administrator...');
            const adminData = {
                id: '99999999',
                username: 'admin',
                fullname: 'Administrator',
                role: 'Admin',
                password: await bcrypt.hash('admin123', 10),
            };
            const admin = userRepository.create(adminData);
            await userRepository.save(admin);
            console.log('✅ Administrator created successfully!');
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};

initializeApp();
