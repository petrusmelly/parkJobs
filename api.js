
// The get AllNPSJobs function gets all jobs in the NPS -- open to the public and "status" or other hiring authority jobs.
// It takes each page's results and adds them to the all jobs array.
// This is what we'll use daily to issue a call to the API and update the data. 
// We'll save the json data to the server and then iterate over the alljobs Array to populate our map.

import fetch from 'node-fetch';
import { writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const host = process.env.HOST;
const userAgent = process.env.USER_AGENT;  
const authKey = process.env.AUTH_KEY;
const apiUrl = process.env.API_URL;
            
const headers = new Headers({
    'Host': host,
    'User-Agent': userAgent,
    'Authorization-Key': authKey
});

export async function getAllNpsJobs() {
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

            allJobs = allJobs.concat(jobs) // Append the current page's jobs to the new allJobs array
            console.log(`Fetched page ${currentPage}, ${jobs.length} jobs`);

            currentPage++;
        } while (allJobs.length < totalResults); // continue the loop while the allJobs length is less than total Results, ensuring we save all jobs returned to our allJobs array
    
        console.log(`Fetched all ${allJobs.length} jobs.`);
        await writeFile('npsJobsData.json', JSON.stringify(allJobs, null, 2));
        console.log('Data saved to npsJobsData.json');
    } catch (err) {
        console.error('Error fetching jobs:', err);
    }
}