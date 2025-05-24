import cron from 'node-cron';
import { refreshNpsJobData } from './refreshJobData';

cron.schedule('1 0,12,17 * * *', async () => {
    console.log('Running schedule job at 1 minute past midnight, noon, 5:00pmET: Fetching NPS jobs...');
    try {
        await refreshNpsJobData();
        console.log('Job dumping and fetching complete');
    } catch (err) {
        console.error('Error during cron job:', err);
    }
}, {
    timezone: "America/New_York",
});