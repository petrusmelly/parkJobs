import fetch from 'node-fetch';
import { writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } =pkg;

// Change this back to .config(); so it uses regular .env. .env.local is for testing updated schema on local db
dotenv.config({ path: '.env.local' });
console.log("DB host:", process.env.DB_HOST_NAME, "DB:", process.env.DB_NAME);

const host = process.env.HOST;
const userAgent = process.env.USER_AGENT;  
const authKey = process.env.AUTH_KEY;
const apiUrl = process.env.API_URL;
const dbUser = process.env.DB_USERNAME;
const dbHost = process.env.DB_HOST_NAME;
const dbPW = process.env.DB_PW;
const db = process.env.DB_NAME;

const isLocal = dbHost === 'localhost' || dbHost === '127.0.0.1';

const pool = new Pool ({
    host: dbHost,
    user: dbUser,
    password: dbPW,
    database: db,
    port: Number(process.env.DB_PORT || 5432),
    ssl: isLocal? false: { rejectUnauthorized: false }
});

async function connectToDatabase() {
    return pool.connect();
}

const headers = new Headers({
    'Host': host,
    'User-Agent': userAgent,
    'Authorization-Key': authKey
});

export async function getDbJobs() {
    const client = await connectToDatabase();
    
    // Pins as jobs:
//     const sqlPins = `
//     SELECT
//       jl.usajobs_id,
//       jl.location_name,
//       jl.latitude,
//       jl.longitude,
//       j.job_title,
//       j.site_name,
//       j.position_location_display,
//       j.occupational_series,
//       j.job_schedule,
//       j.low_grade,
//       j.high_grade,
//       j.min_wage,
//       j.max_wage,
//       j.apply_url,
//       j.agency_name
//     FROM job_locations jl
//     JOIN jobs j ON j.usajobs_id = jl.usajobs_id
//     WHERE jl.latitude IS NOT NULL AND jl.longitude IS NOT NULL;
//   `;

// Pins as locations, derived using lat/long of jobs in database
// Use this to test idea that instead of all jobs are pins,
// we'll set one pin to a location, and the marker popup will be a list of jobs at that pin

        const sqlPins = `
        SELECT
            jl.latitude,
            jl.longitude,

            (
                SELECT jl2.location_name
                FROM job_locations jl2
                WHERE jl2.latitude = jl.latitude
                AND jl2.longitude = jl.longitude
                AND jl2.location_name IS NOT NULL
                GROUP BY jl2.location_name
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS location_name,

            json_agg(
                json_build_object(
                'usajobs_id', jl.usajobs_id,
                'job_title', j.job_title,
                'site_name', j.site_name,
                'position_location_display', j.position_location_display,
                'occupational_series', j.occupational_series,
                'job_schedule', j.job_schedule,
                'low_grade', j.low_grade,
                'high_grade', j.high_grade,
                'min_wage', j.min_wage,
                'max_wage', j.max_wage,
                'apply_url', j.apply_url,
                'agency_name', j.agency_name
                )
                ORDER BY j.agency_name NULLS LAST, j.job_title NULLS LAST
                ) AS jobs,

                COUNT(*) AS job_count

                FROM job_locations jl
                JOIN jobs j ON j.usajobs_id = jl.usajobs_id
                WHERE jl.latitude IS NOT NULL
                AND jl.longitude IS NOT NULL
                GROUP BY jl.latitude, jl.longitude
                ORDER BY job_count DESC;
        `;

    try {
        const pins = await client.query(sqlPins);
        return { pins: pins.rows };
    } finally {
        client.release();
        }
    };
