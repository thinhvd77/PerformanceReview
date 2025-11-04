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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Initialize database and start server
AppDataSource.initialize()
    .then(async () => {
        console.log('Database connected successfully');

        const officerRepository = AppDataSource.getRepository('User');

        let admin = await officerRepository.findOneBy({
            username: 'admin',
        });
        if (!admin) {
            console.log('Tạo Administrator...');
            const adminData = {
                id: '99999999',
                username: 'admin',
                fullname: 'Administrator',
                role: 'Admin',
                password: await bcrypt.hash('admin123', 10),
            };
            admin = officerRepository.create(adminData);
            await officerRepository.save(admin);
            console.log('✅ Tạo Administrator thành công!');
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database connection failed:', error);
    });
