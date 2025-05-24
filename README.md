# ParkJobs

🗺️ A web app that displays National Park Service job listings on an interactive map.

## Built With

- Node.js + Express
- PostgreSQL
- Leaflet.js (map display)
- USAJOBS API
- Render (hosting + cron jobs)

## Features

- Live map of open NPS jobs with location-based filtering
- Daily updates pulled from the USAJOBS API
- Automatically refreshes job listings 3x per day

## Live Site

https://parkjobs.onrender.com/

## Scheduled Updates

This app uses a Render Cron Job to fetch job data 3x per day and update:
- PostgreSQL database
- A local JSON file for potential future static delivery

## Future Improvements

- GUI enhancements--make it prettie, color-coded pins, filterable by job type/pay, etc.
- Serve data from JSON file if DB usage becomes costly
