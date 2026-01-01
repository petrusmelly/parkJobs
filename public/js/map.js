document.addEventListener('DOMContentLoaded', function() {

    const map = L.map('map').setView([38.90, -77.03], 5); // Adjust zoom level for visibility
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Cluster limit 
    const SPIDERFYLIMIT = 10;

    // Cluster group with some options enabled, this will be empty and we'll add markers to this cluster layer
    const jobClusters = L.markerClusterGroup({
        spiderfyOnMaxZoom: true, //when many markers are at same coords, this will fan them out
        zoomToBoundsOnClick: false,
        showCoverageonHover: true,
        maxClusterRadius: 30
    });

    // Logic to handle cluster clicks -- limit clusters to 10 and then break out if less than 10
    jobClusters.on('clusterclick', (e) => {
        const cluster = e.layer;
        const count = cluster.getChildCount();

        if (count <= SPIDERFYLIMIT) {
            //if less than the limit, spiderfy the pins
            cluster.spiderfy();
            return
        }

        // if the clusters are over 10, zoom in but don't spiderfy
        const currentZoom = map.getZoom();
        const maxZoom = map.getMaxZoom();
        if (currentZoom < maxZoom) {
            map.setView(cluster.getLatLng(), currentZoom + 1, { animate: true });
        };

    });

    // const marker = L.marker([40, -77.03]).addTo(map);
    // marker.bindPopup("Hello, world!").openPopup();

    fetch('/park/jobs')
        .then(response => response.json())
        .then(jobs => {
            jobs.singleLocationJobs.forEach(job => {
                if (job.latitude && job.longitude) {
                    const url = job.apply_url.replace(/[\[\]"]+/g, '').replace(/{|}/g, '');
                    // Make the marker at the coords for each job
                    const marker = L.marker([job.latitude, job.longitude]);
                    // Create the pin pop up for each marker
                    marker.bindPopup(`<b>${job.job_title}</b><br>${job.site_name}<br>${job.position_location_display}<br><a href="${url}" target="_blank">Apply Here</a>`);
                    // Add each marker to the cluster layer created above
                    jobClusters.addLayer(marker);
                }
            });

            // add the  cluster layer from above to the map
            map.addLayer(jobClusters);

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

