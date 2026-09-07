const destinationInput = document.getElementById('destination');
const daysInput = document.getElementById('days');
const budgetSelect = document.getElementById('budget');
const paceSelect = document.getElementById('pace');
const generateBtn = document.getElementById('generate-btn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const savedResultsDiv = document.getElementById('saved-results');

let lastPayload = null;
let currentItinerary = null;

generateBtn.addEventListener('click', startGenerate);

async function startGenerate() {
    const destination = destinationInput.value.trim();
    const days = Number(daysInput.value);

    if (destination === '') {
        statusDiv.innerHTML = '<span class="error-text">Please enter a destination.</span>';
        return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 30) {
        statusDiv.innerHTML = '<span class="error-text">Enter a number of days from 1 to 30.</span>';
        return;
    }

    const checked = document.querySelectorAll('.interests input[type="checkbox"]:checked');
    const interests = [...checked].map(c => c.value);

    lastPayload = {
        destination,
        days,
        interests,
        budget: budgetSelect.value,
        pace: paceSelect.value
    };

    await generateItinerary(lastPayload);
}

async function generateItinerary(payload) {
    statusDiv.textContent = 'Planning your trip...';
    resultsDiv.innerHTML = '';
    generateBtn.disabled = true;

    try {
        const res = await fetch('/api/generate-itinerary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data.error || 'Could not generate itinerary. Please try again.');
        }

        statusDiv.textContent = '';
        showItinerary(data);
    } catch (err) {
        console.error(err);
        statusDiv.innerHTML = '<span class="error-text">' + (err.message || 'Something went wrong.') + '</span>';
    } finally {
        generateBtn.disabled = false;
    }
}

function showItinerary(data) {
    if (!data.days || data.days.length === 0) {
        statusDiv.innerHTML = '<span class="error-text">No itinerary was returned. Please try again.</span>';
        return;
    }

    currentItinerary = data;

    let html = `
        <div class="itinerary-controls">
            <button id="regenerate-btn">Regenerate</button>
            <button id="save-btn">Save Itinerary</button>
        </div>`;

    data.days.forEach(day => {
        html += buildDayCard(day);
    });

    resultsDiv.innerHTML = html;

    document.getElementById('regenerate-btn').onclick = () => {
        if (lastPayload) generateItinerary(lastPayload);
    };
    document.getElementById('save-btn').onclick = saveItinerary;
}

function buildDayCard(day) {
    const acts = day.activities || [];
    const activitiesHtml = acts.map(a =>
        `<li><strong>${a.time}:</strong> ${a.activity} - ${a.notes}</li>`
    ).join('');

    return `<div class="day-card">
        <h3>Day ${day.day}: ${day.title}</h3>
        <ul>${activitiesHtml}</ul>
    </div>`;
}

function saveItinerary() {
    if (!lastPayload || !currentItinerary) return;

    const saved = JSON.parse(localStorage.getItem('savedTrips')) || [];
    saved.push({
        id: 'trip-' + Date.now(),
        destination: lastPayload.destination,
        days: lastPayload.days,
        payload: lastPayload,
        itinerary: currentItinerary,
        savedAt: new Date().toISOString()
    });

    localStorage.setItem('savedTrips', JSON.stringify(saved));
    renderSaved();
}

function removeTrip(id) {
    const saved = JSON.parse(localStorage.getItem('savedTrips')) || [];
    localStorage.setItem('savedTrips', JSON.stringify(saved.filter(t => t.id !== id)));
    renderSaved();
}

function openTrip(id) {
    const saved = JSON.parse(localStorage.getItem('savedTrips')) || [];
    const trip = saved.find(t => t.id === id);
    if (!trip) return;

    lastPayload = trip.payload;
    showItinerary(trip.itinerary);
    window.scrollTo(0, 0);
}

function renderSaved() {
    const saved = JSON.parse(localStorage.getItem('savedTrips')) || [];

    savedResultsDiv.innerHTML = saved.map(trip => `
        <div class="trip-card">
            <h3>${trip.destination}</h3>
            <p>${trip.days} days</p>
            <button onclick="openTrip('${trip.id}')">Open</button>
            <button onclick="removeTrip('${trip.id}')">Delete</button>
        </div>
    `).join('');
}

renderSaved();