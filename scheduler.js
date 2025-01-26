import cron from 'node-cron';
import { getAllNpsJobs } from './api.js';

cron.schedule('0 9 * * *', async () => {
    console.log('Running schedule job: Fetching NPS jobs...');
    try {
        await getAllNpsJobs();
        console.log('Job fetching complete.');
    } catch (err) {
        console.error('Error during schedule job:', err);
    }
}, {
    timezone: "America/New_York",
});

console.log('Scheduler ready to rock...');