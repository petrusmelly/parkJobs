const map = L.map('map').setView([38.90, -77.03], 10); // Adjusted zoom level for visibility
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

const marker = L.marker([40, -77.03]).addTo(map);
marker.bindPopup("Hello, world!").openPopup();