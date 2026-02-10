import fetch from 'node-fetch';
import { writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } =pkg;

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

export async function getDbJobs() {
    const client = await connectToDatabase();

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
