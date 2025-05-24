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
const dbUser = process.env.DB_USERNAME;
const dbHost = process.env.DB_HOST_NAME;
const dbPW = process.env.DB_PW;
const db = process.env.DB_NAME;

const pool = new Pool ({
    host: dbHost,
    user: dbUser,
    password: dbPW,
    database: db,
    port: 5432,
    ssl: { rejectUnauthorized: false }
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
    const sqlGetAllJobs = 'SELECT * FROM jobs;'
    const sqlGetAllMultipleLocationJobs = "SELECT * FROM jobs WHERE position_location_display LIKE '%Multiple Locations%';";
    const sqlGetAllSingleLocationJobs = "SELECT * FROM jobs WHERE position_location_display NOT LIKE '%Multiple Locations%';";
    const client = await connectToDatabase();
    try {
        const result_all = await client.query(sqlGetAllJobs);
        const result_multipleLocations = await client.query(sqlGetAllMultipleLocationJobs);
        const result_singleLocations = await client.query(sqlGetAllSingleLocationJobs);

        return {
            allJobs: result_all.rows,
            multipleLocationJobs: result_multipleLocations.rows,
            singleLocationJobs: result_singleLocations.rows
        };
    } catch (err) {
        console.error('Error fetching jobs from database:', err);
    } finally {
        client.release();
        }
    };
