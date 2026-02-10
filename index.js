import express from 'express';
import pkg from 'pg';
import { getDbJobs } from './getDbJobs.js';
import dotenv from 'dotenv';

const app = express();
const port = 3000;
const { Pool } = pkg;

dotenv.config();

const dbUser = process.env.DB_USERNAME;
const dbHost = process.env.DB_HOST_NAME;
const dbPW = process.env.DB_PW;
const db = process.env.DB_NAME;

const isRender = !!process.env.RENDER;

const pool = new Pool ({
    host: dbHost,
    user: dbUser,
    password: dbPW,
    database: db,
    port: Number(process.env.PORT || 3000 ),
    ssl: isRender ? { rejectUnauthorized: false } : false,
});

// virtual path prefix
app.use('/static', express.static('public'));

// routes
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public/views' });
});

app.get('/api/jobs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM jobs');
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to fetch jobs from database:', error);
        res.status(500).send('Failed to fetch jobs');
    }
});


app.get('/about', (req, res) => {
    res.sendFile('about.html', {root: './public/views'});
});


// this will display the DB dadta as JSON in the browser
app.get('/park/jobs', async (req, res) => {
    try {
        const jobsCount = await pool.query('SELECT COUNT(*) FROM jobs;');
        const locCount  = await pool.query('SELECT COUNT(*) FROM job_locations;');

        console.log('jobs:', jobsCount.rows[0].count, 'locations:', locCount.rows[0].count);
        const jobData = await getDbJobs();
        res.json(jobData);
    } catch (err) {
        console.error('Failed to fetch jobs from DB:', err);
        res.status(500).send('Failed to fetch jobs from the database');
    } 
});

// start server
app.listen(port, () => {
    console.log(`ParkJobs app listening on port ${port}`)
});

// The code below uses the dumpGetCleanSave (the whole enchilada) function. Use it to test the full functionality of what we want the API function to do.
// Remove this before hosting on Render and set up the refresh in a Render Cron job. Let the server serve it, don't run this function every time the server boots.
// In short: this is only for testing, once  hosted, the refresh will run when needed.
// refreshNpsJobData();
// console.log('runJobs and  runAPI set to false. Running refresh.');



