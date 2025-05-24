import { refreshNpsJobData } from './refreshJobData';

(async () => {
    try {
        console.log('Running cron job: Refreshing NPS job data...');
        await refreshNpsJobData();
        console.log('Job data refreshed.');
    } catch (err) {
        console.error('Cron job failed. Error during cron job:', err);
    }
})();