// Requires Choices.js to be loaded beforehand in the HTML

// Your OpenAI key (for local use only)
const OPENAI_API_KEY = "MY API";

// Helper: call OpenAI to summarize text
async function summarizeText(text) {
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Please summarize the following in 2-3 concise sentences:" },
                    { role: "user", content: text }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });
        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Summarization error:", error);
        return "";
    }
}

// Set up tabs functionality
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to current button
            button.classList.add('active');
            
            // Show corresponding content
            const target = button.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
        });
    });
}

// Setup dark mode toggle
function setupDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Check if dark mode is saved in localStorage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Toggle dark mode on button click
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
}

// Load RSS feed, extract thumbnails, and add AI summary
async function loadRSS(feedUrl, elementId) {
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
        const rssJson = await fetch(proxyUrl).then(res => res.json());
        const xml = new DOMParser().parseFromString(rssJson.contents, "application/xml");
        const items = Array.from(xml.querySelectorAll("item"));
        const teams = JSON.parse(localStorage.getItem("favoriteTeams") || "[]");
        let output = "";

        for (const item of items) {
            const title = item.querySelector("title")?.textContent;
            const link = item.querySelector("link")?.textContent;
            const description = item.querySelector("description")?.textContent || "";
            if (!title || !link) continue;
            
            // Improved team filtering logic
            // If there are favorite teams selected, check if any team is mentioned in title or description
            if (teams.length > 0) {
                const contentToCheck = (title + " " + description).toLowerCase();
                const isRelevant = teams.some(team => 
                    contentToCheck.includes(team.toLowerCase())
                );
                
                // Skip this article if it doesn't mention any favorite team
                if (!isRelevant) continue;
            }

            // Extract thumbnail URL
            let thumbUrl = null;
            let media = item.querySelector("media\\:thumbnail, media\\:content");
            thumbUrl = media?.getAttribute("url");
            if (!thumbUrl) {
                const enc = item.querySelector("enclosure[url]");
                thumbUrl = enc?.getAttribute("url");
            }
            if (!thumbUrl) {
                const imageTag = item.querySelector("image");
                thumbUrl = imageTag?.textContent.trim();
            }
            if (!thumbUrl) {
                const temp = document.createElement("div");
                temp.innerHTML = description;
                thumbUrl = temp.querySelector("img")?.src;
            }
            if (!thumbUrl) {
                const contentEncoded = item.querySelector("content\\:encoded")?.textContent;
                if (contentEncoded) {
                    const temp2 = document.createElement("div");
                    temp2.innerHTML = contentEncoded;
                    thumbUrl = temp2.querySelector("img")?.src;
                }
            }
            thumbUrl = thumbUrl || "https://placehold.co/300x200?text=No+Image";

            // Generate AI summary
            const summary = description ? await summarizeText(description) : "";

            // Compose card
            output += `
                <div class="article-card">
                    <a class="thumb" href="${link}" target="_blank">
                        <img src="${thumbUrl}" alt="${title}" loading="lazy">
                    </a>
                    <div class="article-content">
                        <h3><a href="${link}" target="_blank">${title}</a></h3>
                        ${summary ? `<p class="summary">${summary}</p>` : ""}
                        <p>${description}</p>
                    </div>
                </div>`;
        }

        if (output) {
            document.getElementById(elementId).innerHTML = output;
        } else {
            const teams = JSON.parse(localStorage.getItem("favoriteTeams") || "[]");
            if (teams.length > 0) {
                document.getElementById(elementId).innerHTML = "<p>No articles found about your favorite teams. Try selecting different teams or clear your selection to see all articles.</p>";
            } else {
                document.getElementById(elementId).innerHTML = "<p>No articles found. Please check back later.</p>";
            }
        }
    } catch (err) {
        document.getElementById(elementId).innerHTML = "<p>Error loading feed.</p>";
        console.error(err);
    }
}

// Kick off all feeds
function loadAllFeeds() {
    loadRSS("https://www.espn.com/espn/rss/nba/news", "nba-feed");
    loadRSS("https://www.espn.com/espn/rss/nfl/news", "nfl-feed");
    loadRSS("https://www.espn.com/espn/rss/mlb/news", "mlb-feed");
    loadRSS("https://www.espn.com/espn/rss/nhl/news", "nhl-feed");
    loadRSS("https://www.espn.com/espn/rss/golf/news", "golf-feed");
    loadRSS("https://www.espn.com/espn/rss/soccer/news", "soccer-feed");
}

// On DOMContentLoaded, fetch teams.json first
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // fetch your teams.json (must be served from same folder or reachable path)
        const teamsByLeague = await fetch('teams.json')
            .then(res => res.json());

        // Initialize the Choices.js selector using teamsByLeague
        const selectEl = document.getElementById('team-select');
        const choices = new Choices(selectEl, {
            removeItemButton: true,
            placeholderValue: 'Search teams…'
        });

        // flatten into choices array: label "NBA: Atlanta Hawks", value "Atlanta Hawks"
        const choiceItems = [];
        for (const [league, teams] of Object.entries(teamsByLeague)) {
            teams.forEach(team => {
                choiceItems.push({ value: team, label: `${league}: ${team}` });
            });
        }
        // populate the dropdown
        choices.setChoices(choiceItems, 'value', 'label', true);

        // restore any saved favorites
        const saved = JSON.parse(localStorage.getItem('favoriteTeams') || '[]');
        if (saved.length) choices.setChoiceByValue(saved);

        // wire up filter / clear buttons
        document.getElementById('applyTeams').onclick = () => {
            const selected = choices.getValue(true);
            localStorage.setItem('favoriteTeams', JSON.stringify(selected));
            loadAllFeeds();
            if (selected.length > 0) {
                alert(`You'll now only see articles about: ${selected.join(', ')}`);
            }
        };
        document.getElementById('clearTeams').onclick = () => {
            choices.clearStore();
            localStorage.removeItem('favoriteTeams');
            loadAllFeeds();
            alert('Team filter cleared. You will now see all articles.');
        };
    } catch (error) {
        console.error("Error loading teams:", error);
    }

    // Set up tabs and dark-mode toggles
    setupTabs();
    setupDarkMode();

    // Finally, load all RSS feeds
    loadAllFeeds();
});