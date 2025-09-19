// swaggerDef.js
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
    openapi: '3.0.0', // Specify OpenAPI version
    info: {
        title: 'My Express API',
        version: '1.0.0',
        description: 'A sample API for demonstration purposes',
    },
    servers: [
        {
            url: 'http://localhost:3000/api', // Your API base URL
            description: 'Development server',
        },
    ],
};

const options = {
    swaggerDefinition,
    apis: ['./routes/*.js', './models/*.js'], // Path to your API routes and models
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerSpec };