// loadrss.js
// Requires Choices.js to be loaded beforehand in the HTML

// Initialize the team selector
const choices = new Choices("#team-select", {
  removeItemButton: true,
  placeholderValue: 'Select teams...',
  searchPlaceholderValue: 'Search teams...'
});

// Save and clear favorites
function saveTeams() {
  const selected = choices.getValue(true);
  localStorage.setItem("favoriteTeams", JSON.stringify(selected));
  alert("Preferences saved!");
  loadAllFeeds();
}

function clearTeams() {
  localStorage.removeItem("favoriteTeams");
  choices.clearStore();
  alert("Preferences cleared.");
  loadAllFeeds();
}

// Load RSS feed and extract real thumbnails
function loadRSS(feedUrl, elementId, defaultIcon) {
  fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`)
    .then(res => res.json())
    .then(data => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(data.contents, "application/xml");
      const items = xml.querySelectorAll("item");
      const selectedTeams = JSON.parse(localStorage.getItem("favoriteTeams") || "[]");
      let output = "";

      items.forEach(item => {
        const title       = item.querySelector("title")?.textContent;
        const link        = item.querySelector("link")?.textContent;
        const description = item.querySelector("description")?.textContent || "";
        if (!title || !link) return;
        if (selectedTeams.length && !selectedTeams.some(t => title.includes(t))) return;

        // 1) media:thumbnail or media:content
        let media = item.querySelector("media\\:thumbnail, media\\:content");
        let thumbUrl = media?.getAttribute("url");
        
        // 2) enclosure tag
        if (!thumbUrl) {
          const enc = item.querySelector("enclosure[url]");
          thumbUrl = enc?.getAttribute("url");
        }
        
        // 3) <img> inside description
        if (!thumbUrl) {
          const temp = document.createElement("div");
          temp.innerHTML = item.querySelector("description")?.textContent || "";
          const imgTag = temp.querySelector("img");
          thumbUrl = imgTag?.src;
        }
        
        // fallback
        if (!thumbUrl) thumbUrl = defaultIcon;

        output += `
          <div class="article-card">
            <a class="thumb" href="${link}" target="_blank">
              <img src="${thumbUrl}" alt="" loading="lazy">
            </a>
            <div class="article-content">
              <h3><a href="${link}" target="_blank">${title}</a></h3>
              <p>${description}</p>
            </div>
          </div>`;
      });

      document.getElementById(elementId).innerHTML = output || "<p>No matching stories found.</p>";
    })
    .catch(err => {
      document.getElementById(elementId).innerHTML = "<p>Error loading feed.</p>";
      console.error(err);
    });
}

// Kick off all three feeds with default icon fallbacks
function loadAllFeeds() {
  loadRSS(
    "https://www.espn.com/espn/rss/nba/news",
    "nba-feed",
    "https://upload.wikimedia.org/wikipedia/commons/7/7a/Basketball.png"
  );
  loadRSS(
    "https://www.espn.com/espn/rss/nfl/news",
    "nfl-feed",
    "https://m.media-amazon.com/images/I/61ceQO+CuVL._AC_UF1000,1000_QL80_.jpg"
  );
  loadRSS(
    "https://www.espn.com/espn/rss/mlb/news",
    "mlb-feed",
    "https://upload.wikimedia.org/wikipedia/en/thumb/1/1e/Baseball_%28crop%29.jpg/800px-Baseball_%28crop%29.jpg"
  );
}

// Run on DOM ready
window.addEventListener("DOMContentLoaded", loadAllFeeds);
