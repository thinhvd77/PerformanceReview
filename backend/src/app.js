import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from "bcryptjs";
import {fileURLToPath} from 'url';
import swaggerUi from 'swagger-ui-express';
import {swaggerSpec} from './config/swaggerDef.js'
import {AppDataSource} from './config/database.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from "./routes/upload.routes.js";
import formTemplateRoutes from './routes/formTemplate.routes.js';
import exportRoutes from './routes/export.routes.js';
import recordRoutes from "./routes/record.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Swagger setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerPath = path.join(__dirname, 'config', 'swagger.json');
let swaggerDocument = {};
try {
    const spec = fs.readFileSync(swaggerPath, 'utf-8');
    swaggerDocument = JSON.parse(spec);
} catch (e) {
    console.warn('Swagger spec not found or invalid. Swagger UI will be unavailable.', e.message);
}

// if (Object.keys(swaggerDocument).length > 0) {
//     // Keep server URL in sync with current PORT
//     if (swaggerDocument.servers && swaggerDocument.servers.length > 0) {
//         swaggerDocument.servers[0].url = `http://localhost:${PORT}`;
//     }
//     app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
//     app.get('/swagger.json', (req, res) => res.json(swaggerDocument));
// }
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Routes
app.use('/api/users', userRoutes);
app.use('/api/files', uploadRoutes);
app.use('/api/forms', formTemplateRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/records', recordRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({status: 'OK', message: 'Server is running'});
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({message: 'Something went wrong!'});
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