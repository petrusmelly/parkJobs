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

async function connectToDatabase() {
    const connection = await mysql.createConnection({
        host: dbHost,
        user: dbUser,
        password: dbPW,
        database: db
    });
    return connection;
};

const headers = new Headers({
    'Host': host,
    'User-Agent': userAgent,
    'Authorization-Key': authKey
});

export async function getDbJobs() {
    const sqlGetAllJobs = 'SELECT * FROM jobs;'
    const sqlGetAllMultipleLocationJobs = 'SELECT * FROM jobs WHERE position_location_display LIKE "%Multiple Locations%";'
    const sqlGetAllSingleLocationJobs = 'SELECT * FROM jobs WHERE position_location_display NOT LIKE "%Multiple Locations%";'
    let connection;
    try {
        connection = await connectToDatabase();
        const [result_all] = await connection.execute(sqlGetAllJobs);
        const [result_multipleLocations] = await connection.execute(sqlGetAllMultipleLocationJobs);
        const [result_singleLocations] = await connection.execute(sqlGetAllSingleLocationJobs);

        return {
            allJobs: result_all,
            multipleLocationJobs: result_multipleLocations,
            singleLocationJobs: result_singleLocations
        };
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};
