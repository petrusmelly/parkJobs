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
        spiderfyOnMaxZoom: false,
        zoomToBoundsOnClick: false,
        showCoverageOnHover: true,
        maxClusterRadius: 30
    });


    // Add the job cluster layer to the map
    map.addLayer(jobClusters);


    // Logic to handle cluster clicks -- limit clusters to 10 and then break out if less than 10
    jobClusters.on('clusterclick', (e) => {
        L.DomEvent.stop(e); // prevents follow-up zoom/unspiderfy behavior
        const cluster = e.layer;
        const count = cluster.getChildCount();

        const currentZoom = map.getZoom();
        const maxZoom = map.getMaxZoom();
        const spiderZoomLimit = 11;

        if (count <= SPIDERFYLIMIT || currentZoom >= spiderZoomLimit || currentZoom >= maxZoom) {
            //if cluster is small, or we're zoomed in over spiderZoom, or over max zoom, then spiderfy
            cluster.spiderfy();
            return false;
        }

        // otherwise, zoom in one step
        
        if (currentZoom < maxZoom) {
            map.setView(cluster.getLatLng(), currentZoom + 1, { animate: true });
            return false;
        };

        return false;
    });


    // filter elements
    const agencyEl = document.getElementById('agencyFilter');
    const seriesEl = document.getElementById('seriesFilter');
    const titleEl = document.getElementById('jobTitleFilter');
    const scheduleEl = document.getElementById('scheduleFilter');
    const gradeEl = document.getElementById('gradeFilter');
    const toggleMulti = document.getElementById('toggleMulti');
    const multiJobsContainer = document.getElementById('table-section');
    const resetBtn = document.getElementById('resetFilters');
    const countPinsEl = document.getElementById('countPins');
    const countMultiEl = document.getElementById('countMulti');

     // pins array
    let pins = [];

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


    // function for rendering markers from pins array
    function renderMarkers(pinsArray) {
        jobClusters.clearLayers();

        pinsArray.forEach(pin => {
            if (!jobHasCoords(pin)) return;

            const lat = parseFloat(pin.latitude);
            const lng = parseFloat(pin.longitude);

            // build popup contents, a scrollable list of jobs @ this coordinate

            const jobs = Array.isArray(pin.jobs) ? pin.jobs: [];

            const jobsHtml = jobs.map(j => {
                const url = cleanApplyUrl(j.apply_url);
                const title = j.job_title ?? '';
                const site = j.site_name ?? '';
                const agency = j.agency_name ?? '';

                return `
                    <div style="margin-bottom:8px;">
                        <div><b>${title}</b></div>
                        <div>${site}${agency ? ` — ${agency}` : ''}</div>
                        <a href="${url}" target="_blank" rel="noopener noreferrer">Apply Here</a>
                    </div>
                `;
            }).join('<hr style="margin:8px 0;">');

            const popupHtml = `
            <div style="max-height:240px; overflow:auto;">
                <div style="margin-bottom:8px;"><b>${pin.location_name ?? ''}</b></div>
                ${jobsHtml || '<i>No jobs at this location.</i>'}
            </div>
        `;

            const marker = L.marker([lat, lng]);
            marker.bindPopup(popupHtml);
            
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
        const agency = (agencyEl.value || '').trim();
        const q = (titleEl.value || '').trim().toLowerCase();
        const series = (seriesEl.value || '').trim();
        const schedule = (scheduleEl.value || '').trim();
        const gradeStr = (gradeEl.value || '').trim();
        const grade = gradeStr ? parseInt(gradeStr, 10) : null;


       const filteredPins = pins.map(pin => {
        const jobs = Array.isArray(pin.jobs) ? pin.jobs : [];

        // filter jobs WITHIN this pin
        const filteredJobs = jobs.filter(j => {
            const matchesAgency = !agency || j.agency_name === agency;
            const matchesTitle = (j.job_title || '').toLowerCase().includes(q);
            const matchesSeries = !series || j.occupational_series === series;
            const matchesSchedule = !schedule || j.job_schedule === schedule;

            let matchesGrade = true;
            if (grade !== null) {
                const low = parseInt(j.low_grade ?? '', 10);
                const high = parseInt(j.high_grade ?? '', 10);
                matchesGrade =
                    Number.isFinite(low) &&
                    Number.isFinite(high) &&
                    grade >= low &&
                    grade <= high;
            };

            return matchesAgency && matchesTitle && matchesSeries && matchesSchedule && matchesGrade
        });

        // return a new pin object with only the jobs that match
        return {...pin, jobs: filteredJobs };

       })
       // keep only pins that still have at least one job in the pop up
       .filter(pin => Array.isArray(pin.jobs) && pin.jobs.length > 0);

       renderMarkers(filteredPins);

       // Counts of pins and counts of jobs
       const pincount = filteredPins.length;
       const jobCount = filteredPins.reduce((sum, p) => sum + p.jobs?.length || 0, 0);
       
       // update counts of pins and jobs on UI
       updateCounts(jobCount, 0);
       
        // const filtered = pins.filter(job => {
        //     const matchesAgency = !agency || job.agency_name === agency;
        //     const matchesTitle = (job.job_title || '').toLowerCase().includes(q);
        //     const matchesSeries = !series || job.occupational_series === series;
        //     const matchesSchedule = !schedule || job.job_schedule === schedule;
            
        //     let matchesGrade = true;
        //     if (grade !== null) {
        //         const low = parseInt(job.low_grade ?? '', 10);
        //         const high = parseInt(job.high_grade ?? '', 10);
        //         matchesGrade = 
        //             Number.isFinite(low) && 
        //             Number.isFinite(high) && 
        //             grade >= low && 
        //             grade <= high;
        //     }

        //     return matchesAgency && matchesTitle && matchesSeries && matchesSchedule && matchesGrade;
        // });

        // renderMarkers(filtered);
        // updateCounts(filtered.length, 0);
    };

    function resetFilters() {
        if (agencyEl) agencyEl.value = '';
        titleEl.value = '';
        seriesEl.value = '';
        scheduleEl.value = '';
        gradeEl.value = '';
        applyFilters();   // re-renders markers + table + counts
    };

    agencyEl.addEventListener('change', applyFilters);
    titleEl.addEventListener('input', applyFilters);
    seriesEl.addEventListener('change', applyFilters);
    scheduleEl.addEventListener('change', applyFilters);
    gradeEl.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', resetFilters);
    
    fetch('/park/jobs')
        .then(response => response.json())
        .then(jobs => {
            console.log("jobs payload keys:", jobs && typeof jobs === 'object' ? Object.keys(jobs) : typeof jobs, jobs);

            pins = jobs.pins ?? [];

            updateCounts(pins.length, 0);

            seriesEl.innerHTML = '<option value="">All</option>';
            scheduleEl.innerHTML = '<option value="">All</option>';
            agencyEl.innerHTML = '<option value="">All</option>';

            // Helperr: flatten all jobs from all pins
            const allJobs = pins.flatMap(p => Array.isArray(p.jobs) ? p.jobs: []);

            // Populating the series filter
            const seriesSet = new Set(allJobs.map(j => j.occupational_series).filter(Boolean));
            [...seriesSet].sort().forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                seriesEl.appendChild(opt);
            });
            
            const scheduleSet = new Set(allJobs.map(j => j.job_schedule).filter(Boolean));
            [...scheduleSet].sort().forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                scheduleEl.appendChild(opt);
            });

            const agencySet = new Set(allJobs.map(j => j.agency_name).filter(Boolean));
            [...agencySet].sort().forEach(a => {
                const opt = document.createElement('option');
                opt.value = a;
                opt.textContent = a;
                agencyEl.appendChild(opt);
            });

            //initial render
            applyFilters();

        })
        .catch(error => console.error('Failed to load job data:', error));
});

