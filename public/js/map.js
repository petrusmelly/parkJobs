document.addEventListener('DOMContentLoaded', function() {

    const map = L.map('map').setView([38.90, -77.03], 5); // Adjust zoom level for visibility
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // const marker = L.marker([40, -77.03]).addTo(map);
    // marker.bindPopup("Hello, world!").openPopup();

    fetch('/park/jobs')
        .then(response => response.json())
        .then(jobs => {
            jobs.singleLocationJobs.forEach(job => {
                if (job.latitude && job.longitude) {
                    const url = job.apply_url.replace(/[\[\]"]+/g, '').replace(/{|}/g, '');
                    const marker = L.marker([job.latitude, job.longitude]).addTo(map);
                    marker.bindPopup(`<b>${job.job_title}</b><br>${job.site_name}<br>${job.position_location_display}<br><a href="${url}" target="_blank">Apply Here</a>`);
                }
            });
            // do something with multpleLocationJobsHere -- put them in a table?
            const multiLocationJobs = jobs.multipleLocationJobs;
            if (multiLocationJobs.length > 0) {
                const table = document.createElement('table');
                table.style.width = '100%';
                table.setAttribute('border', '1');

                // Table Header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');

                // Header for Job Title
                const thTitle = document.createElement('th');
                thTitle.textContent = 'Job Title';
                headerRow.appendChild(thTitle);

                // Header for Site Name
                const thSiteName = document.createElement('th');
                thSiteName.textContent = 'Site Name';
                headerRow.appendChild(thSiteName);

                // Header for Apply Link
                const thApplyLink = document.createElement('th');
                thApplyLink.textContent = 'Apply Link';
                headerRow.appendChild(thApplyLink);

                // Append Header Row to thead element
                thead.appendChild(headerRow);
                table.appendChild(thead);

                // Create the table body
                const tbody = document.createElement('tbody');
                multiLocationJobs.forEach(job => {

                    const row = tbody.insertRow();
                    const cellTitle = row.insertCell();
                    cellTitle.textContent = job.job_title;

                    const cellSiteName = row.insertCell();
                    cellSiteName.textContent = job.site_name;

                    const cellApply = row.insertCell();
                    const link = document.createElement('a');
                    link.setAttribute('href', job.apply_url.replace(/[\[\]"]+/g, '').replace(/{|}/g, ''));
                    link.setAttribute('target', '_blank');
                    link.textContent = "Apply Here" // this is what will display in the cell as a clickable link for the user
                    cellApply.appendChild(link);
                });
                table.appendChild(tbody);
                document.getElementById('tableContainer').appendChild(table)
                // document.body.appendChild(table) // Append the table to the body or another container
            }
        })
        .catch(error => console.error('Failed tot load job data:', error));
});

