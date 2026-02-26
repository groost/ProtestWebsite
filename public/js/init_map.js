document.addEventListener("DOMContentLoaded", init);

function init() {
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');

    if (!form) {
        giveAccess();
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const messageBox = document.getElementById('messageBox');
        if (!messageBox) {
            console.error('Missing #messageBox element');
        }

        if (!submitBtn) {
            console.error('Missing #submitBtn element');
            return;
        }

        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        // Get form data
        const formData = {
            email: document.getElementById('email')?.value,
            code: document.getElementById('code')?.value
        };

        try {
            const response = await fetch('/check-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                showMessage('success', result.message);
                form.reset();
                giveAccess();
            } else {
                showMessage('error', result.message);
            }
        } catch (error) {
            showMessage('error', 'An error occurred. Please try again.');
            console.error('Error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
        }
    });

    const x = document.cookie;
    if (x === 'access=success') {
        giveAccess();
    }
}

// getCandidates();

function showMessage(type, text) {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;

    messageBox.className = `message ${type} show`;
    messageBox.textContent = text;

    // // Hide message after 5 seconds
    // setTimeout(() => {
    //   messageBox.classList.remove('show');
    // }, 5000);
}

function giveAccess() {
    document.cookie = "access=success; expires=Thu, 18 Dec 2026 12:00:00 UTC; path=/";
    const page = document.querySelector('main.page');
    if (page) {
        page.remove();
    } else {
        const container = document.querySelector('.container');
        if (container) container.remove();
    }

    const appContainer = document.createElement("div");
    appContainer.id = "app";
    
    // Create and insert map container
    const mapContainer = document.createElement('div');
    mapContainer.id = 'map';
    appContainer.appendChild(mapContainer);

    const sidebarContainer = document.createElement('div');
    sidebarContainer.id = "sidebar";

    const addButton = document.createElement('button');
    addButton.innerText = 'See Crimes';
    addButton.id = 'see-crimes-btn';
    addButton.onclick = () => openCrimesModal();
    sidebarContainer.appendChild(addButton);

    const header = document.createElement("h2");
    header.innerText = "Protests";
    sidebarContainer.appendChild(header);

    const listContainer = document.createElement("div");
    listContainer.id = "protest-list";
    sidebarContainer.appendChild(listContainer);

    appContainer.appendChild(sidebarContainer);

    document.body.appendChild(appContainer);

    const map = L.map('map');

    function success(pos) {
        const crd = pos.coords;
        currentLocation = crd;
        map.setView([crd.latitude, crd.longitude], 10);
    }

    navigator.geolocation.getCurrentPosition(success);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    makePopups(map);
    showMarkers(map);
}

function openCrimesModal() {
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    
    const modal = document.createElement('div');
    modal.id = 'modal';

    const title = document.createElement('h2');
    title.innerText = "Crimes of ICE and Trump";
    modal.appendChild(title);

    const scrollPanel = document.createElement('div');
    scrollPanel.id = 'modal-scroll-panel';

    const crimes = getCrimes();
    for(var i = 0; i < crimes.length; i++) {
        scrollPanel.appendChild(crimes[i]);
    }

    modal.appendChild(scrollPanel);
    overlay.append(modal);
    document.body.appendChild(overlay);
}


function getCrimes() {
    var crimes = [];
    
    var toAdd = document.createElement("a");
    toAdd.href = "https://www.amnesty.org/en/latest/news/2025/04/president-trumps-first-100-days-attacks-on-human-rights/";
    toAdd.innerText = "Amesty International";
    toAdd.target = '_blank';
    crimes.push(toAdd);

    toAdd = document.createElement("a");
    toAdd.href = "https://immigrantjustice.org/blog/leading-with-cruelty-eight-impacts-of-trumps-first-day-executive-orders/";
    toAdd.target = '_blank';
    toAdd.innerText = "Immigrant Justice";
    crimes.push(toAdd);
    
    toAdd = document.createElement("a");
    toAdd.href = "https://www.aclu.org/news/human-rights/the-targeted-chaos-of-trumps-attacks-against-international-human-rights-law-and-justice";
    toAdd.target = '_blank';
    toAdd.innerText = "ACLU";
    crimes.push(toAdd);

    toAdd = document.createElement("a");
    toAdd.href = "https://www.theguardian.com/us-news/2026/jan/09/federal-officers-blocked-medics-from-scene-of-ice-shooting-witnesses-say";
    toAdd.target = '_blank';
    toAdd.innerText = "Renee Nicole Good";
    crimes.push(toAdd);

    toAdd = document.createElement("a");
    toAdd.href = "https://www.nbcnews.com/news/us-news/witness-videos-cbp-killing-minnesota-man-appear-counter-trump-administ-rcna255791";
    toAdd.target = '_blank';
    toAdd.innerText = "Alex Pretti";
    crimes.push(toAdd);
    
    toAdd = document.createElement("a");
    toAdd.href = "https://www.independent.co.uk/news/world/americas/us-politics/ruben-ray-martinez-ice-shooting-good-pretti-b2924800.html";
    toAdd.target = '_blank';
    toAdd.innerText = "Ruben Ray Martinez";
    crimes.push(toAdd);

    // toAdd = document.createElement("a");
    // toAdd.href = "";
    // toAdd.innerText = "Immigrant Justice";
    // crimes.append(toAdd);
    
    // toAdd = document.createElement("a");
    // toAdd.href = "";
    // toAdd.innerText = "Immigrant Justice";
    // crimes.append(toAdd);

    return crimes;
}

function makePopups(map) {
    var clickedPos = null;
    map.on('contextmenu', function (e) {
        clickedPos = e.latlng;
        const currentDate = (new Date()).toLocaleDateString('en-CA');
        const popupContent = `
            <form id="PopupForm"> 
            <label>
                Title
                <input type="text" id="title" required>
            </label>
            <br><br>
            
            <label>
                Description
                <textarea id="description"></textarea>
            </label>
            <br><br>
            
            <label>
                Date
                <input type="date" id="startDate" value="${currentDate}">
            </label>
            <br><br>
            
            <button type="submit" id="Test">Submit</button>
            </form>
        `;

        const popup = L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(map);

        document.getElementById('PopupForm').addEventListener('submit', function (e) {
            e.preventDefault();
            
            map.closePopup();

            addMarker(clickedPos, map);
        });
    });
    
}

function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function addMarker(clickedPos, map) {
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const date = document.getElementById("startDate").value;

    // console.log(clickedPos);

    const res = await fetch('/api/get-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clickedPos) // ONLY send new markers
    });
    const data = await res.json();

    const marker = L.marker(clickedPos).addTo(map).bindPopup(`<b>${title}</b><br>${date}<br>${data}<br><br>${description}`);
    
    const toAdd = {
        "title": title, 
        "description": description, 
        "date": date,
        "clickedPos": clickedPos,
        "address": data,
        "distance": distanceInMi(currentLocation.latitude, currentLocation.longitude, clickedPos.lat, clickedPos.lng),
        "id": generateRandomString(10)
    };

    markerById[toAdd.id] = marker;
    markers.push(toAdd);

    saveMarkers();
}

async function saveMarkers() {
    const res = await fetch('/api/save-markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(markers) // ONLY send new markers
    });

    const data = await res.json();
    console.log(data);
}

function renderSidebar(protests, map) {
    const list = document.getElementById("protest-list");
    list.innerHTML = "";

    for (let i = 0; i < protests.length; i++) {
        const p = protests[i];

        const card = document.createElement("div");
        card.className = "protest-card";

        card.innerHTML = `
            <strong>${p.title}</strong><br>
            ${p.distance.toFixed(1)} miles away
        `;

        card.onclick = () => {
            const id = p.id;
            map.setView([p.clickedPos.lat, p.clickedPos.lng], 14);
            markerById[id].openPopup();
        };

        list.appendChild(card);
    }
}

async function showMarkers(map) {
    const fileMarkers = await fetch("/api/get-markers");
    const markersJSON = await fileMarkers.json();
    
    markers = markers.concat(markersJSON);

    navigator.geolocation.getCurrentPosition(pos => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        markers.sort((a, b) => b.distance - a.distance).reverse();
        renderSidebar(markers, map);
    });

    markers.forEach((element) => {
        const marker = L.marker(element.clickedPos).addTo(map).bindPopup(`<b>${element.title}</b><br>${element.date}<br>${element.address}<br><br>${element.description}`);
        markerById[element.id] = marker;
        // print(element.marker);
    });

}

function distanceInMi(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 0.621371;
}

async function getCandidates() {
    const res = await fetch('/api/candidates');
    
    if (!res.ok) {
        throw new Error('Request failed');
    }

    const data = await res.json();
    console.log(data);
}