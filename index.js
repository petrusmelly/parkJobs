import express from 'express';
import { getAllNpsJobs } from './api.js';
import { getAndCleanAllNpsJobs } from './usajAPI.js';
import { getCleanSaveAllNpsJobs } from './getCleanSave.js';
import './scheduler.js';
import mysql from 'mysql2/promise';
import { getDbJobs } from './getDbJobs.js';
import { dumpGetCleanSaveAllNpsJobs } from './public/js/dumpGetCleanSave.js';

const app = express();
const port = 3000;

async function connectToDatabase() {
    const connection = await mysql.createConnection({
        host: dbHost,
        user: dbUser,
        password: dbPW,
        database: db
    });
    return connection;
};

// virtual path prefix
app.use('/static', express.static('public'));

// routes
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public/views' });
});

app.get('/api/jobs', async (req, res) => {
    try {
        const connection = await connectToDatabase();
        const [rows] = await connection.execute('SELECT * FROM jobs');
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Failed to fetch jobs from database:', error);
        res.status(500).send('Failed to fetch jobs');
    }
});


// this will display the DB dadta as JSON in the browser
app.get('/park/jobs', async (req, res) => {
    try {
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

// Toggle which function to run for testing. Trying to build a function that does the fetching, cleaning, and saving all in one.
// runJobs does the fetching an cleaning.
// getCleanSave should do it all.

let runJobs = false;

// Now that the fetch, clean, save, is working, set this to false to avoid running up API usage. The data is already saved to the DB.
// If you want/need fresh data, drop the table, then re-run it. Then, set back to false.

let runAPI = false;

let runRefresh = true;

// The code below uses the dumpGetCleanSave (the whole enchilada) function. Use it to test the full functionality of what we want the API function to do.

function refreshNpsJobData() {
    (async () => {
        try {
            await dumpGetCleanSaveAllNpsJobs();
            console.log('Refreshed database.');
    } catch (err) {
        console.error('Error refreshing database:', err);
    }
    })();
}


function fetchNPSJobs() {
    (async () => {
        try {
            await getAndCleanAllNpsJobs();
            console.log('Initial job fetching complete.');
        } catch (err) {
            console.error('Error during initial job fetching:', err);
        }
    })();
};


function fetchCleanAndSaveNPSJobs() {
    (async () => {
        try {
            await getCleanSaveAllNpsJobs();
            console.log('Initial job fetching and saving complete.');
        } catch (err) {
            console.error('Error fetching, cleaning, or saving jobs...', err);
        }
    })();
};


if (runJobs) {
    fetchNPSJobs();
} else {
    if (runAPI) {
        fetchCleanAndSaveNPSJobs();
    }
    else {
        refreshNpsJobData();
        console.log('runJobs and  runAPI set to false. Running refresh.');
    }
};

// console.log('About to run getDbJobs...');
// getDbJobs();



