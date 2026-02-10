// The get dumpGetCleanSave function dumps the current data in the DB, then gets all jobs in the NPS -- open to the public and "status" or other hiring authority jobs.
// It takes each page's results, selects the information we want, and adds them to the all jobs array.
// This is what we'll use daily to issue a call to the API and update the data. 
// We'll save the json data to the server/database and then iterate over the allJobs data to populate our map.

import fetch from 'node-fetch';
import { writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;

// Change this back to .config(); so it uses regular .env. .env.local is for testing updated schema on local db
dotenv.config();

const host = process.env.HOST;
const userAgent = process.env.USER_AGENT;  
const authKey = process.env.AUTH_KEY;
const apiUrl = process.env.API_URL;

const connectionString =
  process.env.INTERNAL_DB_URL || 
  process.env.EXTERNAL_DB_URL;

const isRender = !!process.env.RENDER;

const pool = new Pool({
  connectionString,
  ssl: isRender ? { rejectUnauthorized: false } : false,
});

async function connectToDatabase() {
    return pool.connect();
}
            
const headers = new Headers({
    'Host': host,
    'User-Agent': userAgent,
    'Authorization-Key': authKey
});

export async function dumpGetCleanSaveAllNpsJobs() {
    let allJobs = [];
    let currentPage = 1;
    const resultsPerPage = 25;
    let totalResults= 0;
    const url = apiUrl;
    
    const client = await connectToDatabase();

    try {
        // Check for exising jobs in the database
        const checkDataExist = 'SELECT COUNT(*) AS count FROM jobs;';
        const result = await client.query(checkDataExist);
        const jobCount = parseInt(result.rows[0].count, 10);

        // If there are existing jobs, we're going to clear them out in order to replace them with fresh data.

        if (jobCount > 0) {
            console.log('Clearing existing jobs from database...');
            await client.query('DELETE FROM jobs;');
        }

        do {
            const response = await fetch(`${url}&Page=${currentPage}`, {
                method: 'GET',
                headers:headers
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch page ${currentPage}: ${response.status}`);
            }

            const data = await response.json();
            totalResults = data.SearchResult.SearchResultCountAll; // Total Number of Jobs returned by USA Jobs
            const jobs = data.SearchResult.SearchResultItems; // This is the list of returned job objects
           
            // now that we have all the jobs from the API, we can loop through them and extract the data we want
            // then save just our selected data to a new list of jobs. That list is what we will loop through and save to the DB.

            jobs.forEach(item => {
                const descriptor = item.MatchedObjectDescriptor;
                const positionLocation = descriptor.PositionLocation[0];
                const payInfo = descriptor.PositionRemuneration[0];
                const occSeries = descriptor.JobCategory[0].Code;
                const jobSchedule = descriptor.JobGrade[0].Code;
                const userAreaDetails = descriptor.UserArea.Details

                const parkJob = {
                    job_title : descriptor.PositionTitle,
                    site_name : descriptor.SubAgency,
                    position_location_display : descriptor.PositionLocationDisplay,
                    start_date: descriptor.PositionStartDate,
                    end_date : descriptor.PositionEndDate,
                    close_date : descriptor.ApplicationCloseDate,
                    occupational_series : occSeries,
                    job_schedule : jobSchedule,
                    low_grade : userAreaDetails.LowGrade,
                    high_grade : userAreaDetails.HighGrade,
                    min_wage : payInfo.MinimumRange,
                    max_wage : payInfo.MaximumRange,
                    location_name : positionLocation.LocationName,
                    latitude : positionLocation.Latitude,
                    longitude : positionLocation.Longitude,
                    apply_URL : descriptor.ApplyURI,
                };
                allJobs.push(parkJob);
            });

            console.log(`Fetched page ${currentPage}, ${jobs.length} jobs`);
            currentPage++;

        } while (allJobs.length < totalResults); // continue the loop while the allJobs length is less than total Results, ensuring we save all jobs returned to our allJobs array
    
        console.log(`Fetched all ${allJobs.length} jobs.`);
        await writeFile('npsJobsData.json', JSON.stringify(allJobs, null, 2));
        console.log('Data saved to npsJobsData.json');
        
        // Now that we extracted the data we want from the jobs, loop through them and add them to DB.

        const sql = `
            INSERT INTO jobs (
            job_title, site_name, position_location_display, start_date, 
            end_date, close_date, occupational_series, job_schedule, 
            low_grade, high_grade, min_wage, max_wage, location_name, 
            latitude, longitude, apply_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                      $9, $10, $11, $12, $13, $14, $15, $16
                      )`;
                
        for (const job of allJobs) {
            const params = [
                job.job_title || null,
                job.site_name || null,
                job.position_location_display || null,
                job.start_date || null,
                job.end_date || null,
                job.close_date || null,
                job.occupational_series || null,
                job.job_schedule || null,
                job.low_grade || null,
                job.high_grade || null,
                job.min_wage || null,
                job.max_wage || null,
                job.location_name || null,
                job.latitude || null,
                job.longitude || null,
                job.apply_URL || null,
            ];
            await client.query(sql, params);
        }

        console.log(`Inserted ${allJobs.length} jobs into database.`);

    } catch (err) {
        console.error('Error fetching jobs:', err);
    } finally {
        client.release();
    }
}

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