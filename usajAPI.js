// The get getAndClean function gets all jobs in the NPS -- open to the public and "status" or other hiring authority jobs.
// It takes each page's results, selects the information we want, and adds them to the all jobs array.
// This is what we'll use daily to issue a call to the API and update the data. 
// We'll save the json data to the server/database and then iterate over the alljobs Array to populate our map.

import fetch from 'node-fetch';
import { writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';


dotenv.config();

const host = process.env.HOST;
const userAgent = process.env.USER_AGENT;  
const authKey = process.env.AUTH_KEY;
const apiUrl = process.env.API_URL;
const dbUser = process.env.DB_USER;
const dbHost = process.env.DB_HOST;
const dbPW = process.env.DB_PW;
const db = process.env.DB;

const connection = mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPW,
    database: db
});
            
const headers = new Headers({
    'Host': host,
    'User-Agent': userAgent,
    'Authorization-Key': authKey
});

export async function getAndCleanAllNpsJobs() {
    let allJobs = [];
    let currentPage = 1;
    const resultsPerPage = 25;
    let totalResults= 0;
    const url = apiUrl;

    try {
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
    } catch (err) {
        console.error('Error fetching jobs:', err);
    }
}
