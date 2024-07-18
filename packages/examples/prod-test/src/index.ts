import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Telescope, MongoStorage, EntryType, TelescopeDatabaseType } from 'node-telescope';
import { createServer } from 'http';

dotenv.config();

async function createTestServer() {
	const app = express();
	const server = createServer(app);

	// Connect to MongoDB
	await mongoose.connect(process.env.DB_URI || '');

	console.log('Connected to MongoDB');

	// Configure Telescope
	const storage = new MongoStorage({
		connection: mongoose.connection,
		dbName: process.env.DB_NAME || 'telescope',
	});

	const telescope = new Telescope({
		storage: storage,
		watchedEntries: [EntryType.REQUESTS, EntryType.EXCEPTIONS, EntryType.QUERIES],
		enableQueryLogging: true,
		routePrefix: '/telescope-test',
		app: app,
		server: server,
		databaseType: TelescopeDatabaseType.MONGO,
		includeCurlCommand: true,
	});

	app.use(telescope.middleware());
	app.use('*', (req, res) => {
		console.log(`Caught unhandled request: ${req.method} ${req.originalUrl}`);
		res.status(404).send('Not Found');
	});
	// Routes
	app.get('/', (req, res) => {
		res.send('Hello World! This is the Production Test Server.');
	});
	app.get('/test', (req, res) => {
		res.send('Test route working');
	});

	app.get('/error', (_req, _res) => {
		throw new Error('This is a test error');
	});

	// Error handling
	app.use((err: Error, req: express.Request, res: express.Response) => {
		console.error(err.stack);
		res.status(500).send('Something broke!');
	});

	return server;
}

// Create and start the server
createTestServer()
	.then(server => {
		const PORT = process.env.PORT || 4000;
		server.listen(PORT, () => {
			console.log(`Server is running on http://localhost:${PORT}`);
			console.log(`Telescope is available at http://localhost:${PORT}/telescope`);
		});
	})
	.catch(error => {
		console.error('Failed to start the server:', error);
		process.exit(1);
	});