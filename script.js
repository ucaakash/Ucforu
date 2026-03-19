// 1. Creative Content (Shayaris)
const shayaris = [ 
    "Phone ki duniya mein aise dil lagaya, battery 100 se 0 kab aayi, pata hi nahi chala!", 
    "Itna scroll kar liya ki ab sapno mein bhi Reels chal rahi hain.", 
    "Zindagi mein itni clarity nahi hai, jitni mere phone ke screen brightness mein hai.", 
    "Hum toh chale the kuch 'Productive' karne, par phone uthate hi 3 ghante nikal gaye.", 
    "Log kehte hain 'Don't waste time', hum kehte hain 'Bas ek aur Reel phir kaam shuru'.",
    "Humne waqt nahi, waqt ne humein scroll kar diya!",
    "Kaash itna focus main padhai par karta, toh aaj shayad NASA mein hota.",
    "Suno, phone rakho aur muskurao, kyunki aap bahut cute ho!",
    "Itne ghante phone chalane ke baad bhi, dimag mein sirf 'Empty' likha hai."
];

// 2. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCeJWTbIF3mD43ihcoCZJ8LO-b896-FWa4",
    authDomain: "ucforu-730a7.firebaseapp.com",
    projectId: "ucforu-730a7",
    storageBucket: "ucforu-730a7.firebasestorage.app",
    messagingSenderId: "315045659904",
    appId: "1:315045659904:web:2e1700a51aae71a8a29fe5",
    measurementId: "G-899BZCPKR2",
    databaseURL: "https://ucforu-730a7-default-rtdb.firebaseio.com"
};

let database = null;
let currentUserTime = 0;
let currentNickname = "";

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("Firebase initialized successfully");
    loadLeaderboard();
} catch (error) {
    console.error("Firebase init error:", error);
}

// --- MASTER OCR PARSER (iPhone Fix + Targeted Search) ---
function parseScreentime(text) {
    let hours = 0, minutes = 0;
    let cleanText = text.toLowerCase().replace(/\s+/g, ' ');

    // Apple Font Fix: l, i, |, ! ko 1 banao
    cleanText = cleanText.replace(/(^|\s)(l|i|\||!)\s*h/g, ' 1h');
    cleanText = cleanText.replace(/(^|\s)(l|i|\||!)\s*m/g, ' 1m');

    // Logic A: Targeted Search (Daily Average ke baad wala time uthao)
    const targetMatch = cleanText.match(/(daily average|total|screen time|activity)\s*(\d+)\s*h\s*(\d+)\s*m/);
    const targetMatchShort = cleanText.match(/(daily average|total|screen time|activity)\s*(\d+)\s*h/);

    if (targetMatch) {
        hours = parseInt(targetMatch[2]);
        minutes = parseInt(targetMatch[3]);
    } else if (targetMatchShort) {
        hours = parseInt(targetMatchShort[2]);
        minutes = 0;
    } else {
        // Logic B: Fallback (Pehla valid format jo mile)
        const fallback = cleanText.match(/(\d+)\s*h\s*(\d+)\s*m/);
        if (fallback) {
            hours = parseInt(fallback[1]);
            minutes = parseInt(fallback[2]);
        }
    }

    // Safety Validation
    hours = (isNaN(hours) || hours > 24) ? 0 : hours;
    minutes = (isNaN(minutes) || minutes >= 60) ? 0 : minutes;

    return { hours, minutes, totalMinutes: (hours * 60) + minutes };
}

// --- MAIN ACTION: Analyze Button ---
document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const nickname = document.getElementById('nickname').value.trim();
    const file = document.getElementById('screenshot').files[0];
    
    if (!nickname || !file) {
        showToast(nickname ? "Please upload screenshot!" : "Enter your name first!", "error");
        return;
    }
    
    document.getElementById('inputForm').style.display = 'none';
    document.getElementById('processing').style.display = 'block';

    try {
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        const cleanText = text.toLowerCase();

        // 1. Security: Blacklist (Don't allow site's own cards)
        if (cleanText.includes("ucforu") || cleanText.includes("download card")) {
            throw new Error("BLACKlisted: Own Card Detected");
        }

        // 2. Security: Whitelist (Must be a real screenshot)
        const isReal = cleanText.includes("screen time") || cleanText.includes("wellbeing") || cleanText.includes("daily");
        if (!isReal) throw new Error("FAKE: Not a screenshot");

        // 3. Parsing
        const timeData = parseScreentime(text);
        if (timeData.totalMinutes === 0) throw new Error("ZERO: No time detected");

        // 4. Success Flow
        currentUserTime = timeData.totalMinutes;
        currentNickname = nickname;
        const timeString = `${timeData.hours}h ${timeData.minutes}m`;

        // Update Card UI
        const randomShayari = shayaris[Math.floor(Math.random() * shayaris.length)];
        document.getElementById('render-name').innerText = nickname;
        document.getElementById('render-time').innerText = `${timeString} screen time`;
        document.getElementById('render-shayari').innerText = `"${randomShayari}"`;

        await document.fonts.ready;
        const renderCard = document.getElementById('instagram-card');
        const canvas = await html2canvas(renderCard, { scale: 2, useCORS: true, backgroundColor: "#fdfaf6" });

        document.getElementById('generated-image-preview').src = canvas.toDataURL("image/png");
        document.getElementById('processing').style.display = 'none';
        document.getElementById('result').style.display = 'block';

        // 5. Database & Challenge Logic
        saveToLeaderboard(timeString);
        if (window.challengeData) handleBattle(timeData);

        // QR Code
        generateMyQR();

    } catch (error) {
        console.error(error);
        document.getElementById('processing').style.display = 'none';
        document.getElementById('inputForm').style.display = 'block';
        
        let errorMsg = "Sahi screenshot daaliye! Detect nahi hua 🧐";
        if (error.message.includes("BLACKlisted")) errorMsg = "Yeh toh hamara hi card hai! 😂 Asli photo daaliye.";
        if (error.message.includes("FAKE")) errorMsg = "Fake Alert! 🚨 Phone settings ka screenshot daaliye.";
        
        showToast(errorMsg, "error");
    }
});

// --- CHALLENGE & BATTLE LOGIC ---
function handleBattle(userData) {
    const d = window.challengeData;
    const winner = userData.totalMinutes > d.creatorTime ? currentNickname : d.creator;
    
    const card = document.createElement("div");
    card.className = "flower-battle";
    card.innerHTML = `
        <div class="battle-title">Screen Time Battle</div>
        <div class="battle-row">
            <div class="player-box"><b>${d.creator}</b><br>${Math.floor(d.creatorTime/60)}h ${d.creatorTime%60}m</div>
            <div class="vs">VS</div>
            <div class="player-box"><b>${currentNickname}</b><br>${userData.hours}h ${userData.minutes}m</div>
        </div>
        <div class="winner-text">👑 Winner: ${winner}</div>
    `;
    document.getElementById("result").prepend(card);

    if (database && window.challengeID) {
        database.ref("challenges/" + window.challengeID).update({
            opponent: currentNickname,
            opponentTime: userData.totalMinutes,
            winner: winner
        });
    }
}

// --- DATABASE: Leaderboard ---
function saveToLeaderboard(timeStr) {
    if (database) {
        const dailyKey = new Date().toISOString().split('T')[0];
        const userKey = btoa(currentNickname + navigator.userAgent).replace(/=/g, "");
        database.ref(`leaderboard/${dailyKey}/${userKey}`).set({
            nickname: currentNickname,
            totalMinutes: currentUserTime,
            formattedTime: timeStr
        });
    }
}

function loadLeaderboard() {
    const dailyKey = new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('leaderboardBody');
    if (!database) return;

    database.ref('leaderboard/' + dailyKey).orderByChild('totalMinutes').limitToLast(10).on('value', (snap) => {
        tbody.innerHTML = "";
        if (snap.exists()) {
            let res = []; snap.forEach(c => res.push(c.val()));
            res.reverse().forEach((d, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
                tbody.innerHTML += `<tr><td>${medal}</td><td>${d.nickname}</td><td align="right">${d.formattedTime}</td></tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" align="center">No data yet</td></tr>';
        }
    });
}

// --- UI HELPERS: Toast, QR, Modals ---
function showToast(msg, type) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type} show`;
    toast.innerHTML = `<div>${type === 'error' ? '❌' : '✅'} ${msg}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}

function generateMyQR() {
    const container = document.getElementById("qrcode-container");
    if (container) {
        container.innerHTML = "";
        new QRCode(container, { text: "https://ucforu.online", width: 120, height: 120 });
    }
}

// Challenge Button logic
document.getElementById("challengeBtn")?.addEventListener("click", async () => {
    const challengeID = btoa(currentNickname + Date.now()).replace(/=/g, "");
    const link = `${window.location.origin}${window.location.pathname}?challenge=${challengeID}`;
    
    if (database) {
        database.ref("challenges/" + challengeID).set({
            creator: currentNickname,
            creatorTime: currentUserTime,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }

    if (navigator.share) {
        await navigator.share({ title: "Challenge!", text: `Can you beat my ${Math.floor(currentUserTime/60)}h screen time? ⚔️`, url: link });
    } else {
        navigator.clipboard.writeText(link);
        showToast("Challenge link copied! 🔥", "success");
    }
});

// Download & Share
document.getElementById('downloadBtn').onclick = () => {
    const a = document.createElement('a');
    a.download = `UCforU_${currentNickname}.png`;
    a.href = document.getElementById('generated-image-preview').src;
    a.click();
};

// URL Params & Initial Guide
window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    window.challengeID = params.get("challenge");

    if (window.challengeID && database) {
        database.ref("challenges/" + window.challengeID).once("value").then(snap => {
            if (snap.exists()) window.challengeData = snap.val();
        });
    }

    // Auto-guide popup
    if (!localStorage.getItem('guideShown') || window.challengeID) {
        setTimeout(() => { document.getElementById('guideModal').style.display = 'flex'; }, 1000);
    }
});

// Guide Tab Logic
document.getElementById('tabAndroid').onclick = () => {
    document.getElementById('contentAndroid').style.display = 'block';
    document.getElementById('contentIphone').style.display = 'none';
    document.getElementById('tabAndroid').className = 'primary';
    document.getElementById('tabIphone').className = 'secondary';
};

document.getElementById('tabIphone').onclick = () => {
    document.getElementById('contentAndroid').style.display = 'none';
    document.getElementById('contentIphone').style.display = 'block';
    document.getElementById('tabAndroid').className = 'secondary';
    document.getElementById('tabIphone').className = 'primary';
};

document.getElementById('closeGuide').onclick = () => { 
    document.getElementById('guideModal').style.display = 'none'; 
    localStorage.setItem('guideShown', 'true');
};
