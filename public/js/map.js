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
        showCoverageOnHover: true,
        maxClusterRadius: 30
    });


    // Add the job cluster layer to the map
    map.addLayer(jobClusters);


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


    // filter elements
    const seriesEl = document.getElementById('seriesFilter');
    const titleEl = document.getElementById('jobTitleFilter');
    const scheduleEl = document.getElementById('scheduleFilter');
    const gradeEl = document.getElementById('gradeFilter');
    const toggleMulti = document.getElementById('toggleMulti');
    const multiJobsContainer = document.getElementById('table-section');
    const resetBtn = document.getElementById('resetFilters');
    const countPinsEl = document.getElementById('countPins');
    const countMultiEl = document.getElementById('countMulti');


    // helper function to display count of jobs shown
    function updateCounts(pinsCount, multiCount) {
        if (countPinsEl) countPinsEl.textContent = String(pinsCount);
        if (countMultiEl) countMultiEl.textContent = String(multiCount);
    }
    

    // Fill grade dropdown with 1-15
    for (let g = 1; g <= 15; g++) {
        const opt = document.createElement('option');
        opt.value = String(g);
        opt.textContent = String(g);
        gradeEl.appendChild(opt);
    };


    // Two job arrays -- single locations (will be pins on map) and multiple locations (will be place in toggle-able table)
    let singleLocationJobs = [];
    let multiLocationJobs = [];


    // function for cleaning apply URLs
    function cleanApplyUrl(apply_url) {
        return String(apply_url).replace(/[\[\]"]+/g, '').replace(/{|}/g, '');
    };


    // function for checking that the job has latitude and longitude
    function jobHasCoords(job) {
        const lat = parseFloat(job.latitude);
        const lng = parseFloat(job.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng);
        // return job.latitude && job.longitude;
    };


    // function for rendering markers from job array
    function renderMarkers(jobsArray) {
        jobClusters.clearLayers();

        jobsArray.forEach(job => {
            if (!jobHasCoords(job)) return;

            const url = cleanApplyUrl(job.apply_url);
            const marker = L.marker([parseFloat(job.latitude), parseFloat(job.longitude)]);
            marker.bindPopup(
                `<b>${job.job_title}</b><br>${job.site_name}<br>${job.position_location_display}<br>` +
                `<a href="${url}" target="_blank" rel="noopener noreferrer">Apply Here</a>`
            );
            
            jobClusters.addLayer(marker);

        });

    };


    function renderMultiTable(jobsArray) {
        const tableContainer = document.getElementById('tableContainer');
        tableContainer.innerHTML = '';

        if (!jobsArray || jobsArray.length === 0) return;

        const table = document.createElement('table');
        table.style.width = '100%';
        table.setAttribute('border', '1');

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        ['Job Title', 'Site Name', 'Apply Link'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        jobsArray.forEach(job => {
            const row = tbody.insertRow();
            
            row.insertCell().textContent = job.job_title ?? '';
            row.insertCell().textContent = job.site_name ?? '';
            
            const cellApply = row.insertCell();
            const link = document.createElement('a');
            link.href = cleanApplyUrl(job.apply_url);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Apply Here';
            cellApply.appendChild(link);
        });
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
    };

    function applyMultiToggle() {
        if (!multiJobsContainer) return;
        const show = toggleMulti.checked;
        // if the multiple jobs table filter is checked, show it, if unchecked then hide by setting display to none
        multiJobsContainer.style.display = show ? '' : 'none';

        // if the filter is checked, run the applyFilters function, this will keep the table refreshed with all jobs unless filtered
        if (show) {
            applyFilters();
        }
    };

    function applyFilters () {
        const q = (titleEl.value || '').trim().toLowerCase();
        const series = (seriesEl.value || '').trim();
        const schedule = (scheduleEl.value || '').trim();
        const gradeStr = (gradeEl.value || '').trim();
        const grade = gradeStr ? parseInt(gradeStr, 10) : null;


        const filteredSingles = singleLocationJobs.filter(job => {
            const matchesTitle = (job.job_title || '').toLowerCase().includes(q);
            const matchesSeries = !series || job.occupational_series === series;
            const matchesSchedule = !schedule || job.job_schedule === schedule;
            let matchesGrade = true;
            if (grade !== null) {
                const low = parseInt(job.low_grade ?? '', 10);
                const high = parseInt(job.high_grade ?? '', 10);
                matchesGrade = Number.isFinite(low) && Number.isFinite(high) && grade >= low && grade <= high;
            }
            return matchesTitle && matchesSeries && matchesSchedule && matchesGrade;
        });

        const filteredMultis = multiLocationJobs.filter(job => {
            const matchesTitle = (job.job_title || '').toLowerCase().includes(q);
            const matchesSeries = !series || job.occupational_series === series;
            const matchesSchedule = !schedule || job.job_schedule === schedule;
            let matchesGrade = true;
            if (grade !== null) {
                const low = parseInt(job.low_grade ?? '', 10);
                const high = parseInt(job.high_grade ?? '', 10);
                matchesGrade = Number.isFinite(low) && Number.isFinite(high) && grade >= low && grade <= high;
            }
            return matchesTitle && matchesSeries && matchesSchedule && matchesGrade;
        });

        renderMarkers(filteredSingles);

        // Only render the jobs with multiple locations if the table is enabled
        if (toggleMulti.checked) {
            renderMultiTable(filteredMultis);
        };

        // Call update counts to update the span element that displays job counts
        updateCounts(filteredSingles.length, toggleMulti.checked ? filteredMultis.length : 0);
    };

    function resetFilters() {
        titleEl.value = '';
        seriesEl.value = '';
        scheduleEl.value = '';
        gradeEl.value = '';
        
        // toggle table back on
        toggleMulti.checked = true;
        
        applyMultiToggle();   // shows the table section
        applyFilters();   // re-renders markers + table + counts
    };

    toggleMulti.addEventListener('change', applyMultiToggle);
    titleEl.addEventListener('input', applyFilters);
    seriesEl.addEventListener('change', applyFilters);
    scheduleEl.addEventListener('change', applyFilters);
    gradeEl.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', resetFilters);

    
    fetch('/park/jobs')
        .then(response => response.json())
        .then(jobs => {

            // Storing jobs in outer arrays so filters can use them later
            singleLocationJobs = jobs.singleLocationJobs ?? [];
            multiLocationJobs = jobs.multipleLocationJobs ?? [];

            seriesEl.innerHTML = '<option value="">All</option>';
            scheduleEl.innerHTML = '<option value="">All</option>';

            // Populating the series filter
            const seriesSet = new Set([
                ...singleLocationJobs.map(j => j.occupational_series),
                ...multiLocationJobs.map(j => j.occupational_series),
            ].filter(Boolean));

            [...seriesSet].sort().forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                seriesEl.appendChild(opt);
            });

            // Populating the schedule filter
            const scheduleSet = new Set([
                ...singleLocationJobs.map(j => j.job_schedule),
                ...multiLocationJobs.map(j => j.job_schedule),
            ].filter(Boolean));

            [...scheduleSet].sort().forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                scheduleEl.appendChild(opt);
            });

            // No longer need to call renderMarkers or renderMultiTable or applyFilters
            // applyMultiToggle() will run all of them, based on defaults (blank, so all jobs appear), 
            // it also calls applyFilters which runs both render functions (singles and multis)
            applyMultiToggle();

        })
        .catch(error => console.error('Failed to load job data:', error));
});

