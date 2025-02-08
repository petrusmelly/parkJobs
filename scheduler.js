import cron from 'node-cron';
import { getAllNpsJobs } from './api.js';
import { getCleanSaveAllNpsJobs } from './getCleanSave.js'
import { dumpGetCleanSaveAllNpsJobs } from './public/js/dumpGetCleanSave.js';

cron.schedule('1 0,12,17 * * *', async () => {
    console.log('Running schedule job at 1 minute past midnight, noon, 5:00 pm ET: Fetching NPS jobs...');
    try {
        await dumpGetCleanSaveAllNpsJobs();
        console.log('Job dumping and fetching complete.');
    } catch (err) {
        console.error('Error during schedule job:', err);
    }
}, {
    timezone: "America/New_York",
});

console.log('Scheduler ready to rock...');