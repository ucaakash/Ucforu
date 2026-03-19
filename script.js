// ==========================================
// 1. CREATIVE CONTENT (SHAYARIS)
// ==========================================
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

// ==========================================
// 2. FIREBASE CONFIGURATION
// ==========================================
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

// ==========================================
// 3. OCR IMAGE PRE-PROCESSING (For Accuracy)
// ==========================================
async function preprocessImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Grayscale aur High Contrast apply karein taaki iPhone/Android text saaf dikhe
                ctx.filter = 'grayscale(100%) contrast(150%) brightness(100%)';
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ==========================================
// 4. MASTER OCR PARSER
// ==========================================
function parseScreentime(text) {
    let cleanText = text.toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // iPhone Font Fix: l, i, |, ! ko 1 banao agar wo time ke paas hain
    cleanText = cleanText.replace(/(^|\s)(l|i|\||!)\s*h/g, ' 1h');
    cleanText = cleanText.replace(/(^|\s)(l|i|\||!)\s*m/g, ' 1m');

    let hours = 0, minutes = 0;

    // Time dhundne ke patterns (Pehle strict, phir loose)
    const patterns = [
        /(?:daily average|total|screen time|activity)\s*(\d+)\s*h\s*(\d+)\s*m/i,
        /(?:daily average|total|screen time|activity)\s*(\d+)\s*h/i,
        /(\d+)\s*h\s*(\d+)\s*m/i,
        /(\d+)\s*hr\s*(\d+)\s*min/i,
        /(\d+)\s*h\s*(?!\d+m)/i 
    ];

    for (let regex of patterns) {
        const match = cleanText.match(regex);
        if (match) {
            hours = parseInt(match[1]) || 0;
            // Agar second group (minutes) nahi hai, toh 0 maan lo
            minutes = match[2] ? parseInt(match[2]) : 0;
            break; 
        }
    }

    // Safety Validation
    if (hours > 24) hours = 0;
    if (minutes >= 60) minutes = 0;

    return { 
        hours, 
        minutes, 
        totalMinutes: (hours * 60) + minutes,
        formatted: `${hours}h ${minutes}m` 
    };
}

// ==========================================
// 5. MAIN ACTION: ANALYZE BUTTON
// ==========================================
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
        // Step 1: Image Pre-processing
        const processedImage = await preprocessImage(file);
        
        // Step 2: Tesseract OCR Run
        const { data: { text } } = await Tesseract.recognize(processedImage, 'eng');
        const cleanText = text.toLowerCase();

        // Step 3: Security Checks
        if (cleanText.includes("ucforu") || cleanText.includes("download card")) {
            throw new Error("BLACKlisted");
        }
        const isReal = cleanText.includes("screen time") || cleanText.includes("wellbeing") || cleanText.includes("daily") || cleanText.includes("activity");
        if (!isReal) {
            console.warn("Might not be a screenshot, but trying anyway...");
        }

        // Step 4: Parse Time
        const timeData = parseScreentime(text);
        if (timeData.totalMinutes === 0) throw new Error("ZERO");

        // Step 5: Success & UI Update
        currentUserTime = timeData.totalMinutes;
        currentNickname = nickname;

        const randomShayari = shayaris[Math.floor(Math.random() * shayaris.length)];
        document.getElementById('render-name').innerText = nickname;
        document.getElementById('render-time').innerText = `${timeData.formatted} screen time`;
        document.getElementById('render-shayari').innerText = `"${randomShayari}"`;

        // Generate QR before rendering card
        generateMyQR();

        // Wait for fonts & render
        await document.fonts.ready;
        const renderCard = document.getElementById('instagram-card');
        const canvas = await html2canvas(renderCard, { scale: 2, useCORS: true, backgroundColor: "#fdfaf6" });

        document.getElementById('generated-image-preview').src = canvas.toDataURL("image/png");
        document.getElementById('processing').style.display = 'none';
        document.getElementById('result').style.display = 'block';

        // Save Data & Handle Challenges
        saveToLeaderboard(timeData.formatted);
        if (window.challengeData) handleBattle(timeData);

    } catch (error) {
        console.error("OCR Error:", error);
        document.getElementById('processing').style.display = 'none';
        document.getElementById('inputForm').style.display = 'block';
        
        let errorMsg = "Sahi screenshot daaliye! Detect nahi hua 🧐";
        if (error.message === "BLACKlisted") errorMsg = "Yeh toh hamara hi card hai! 😂 Asli photo daaliye.";
        if (error.message === "ZERO") errorMsg = "Time detect nahi hua. Saaf photo daaliye!";
        
        showToast(errorMsg, "error");
    }
});

// ==========================================
// 6. CHALLENGE & BATTLE LOGIC
// ==========================================
function handleBattle(userData) {
    const d = window.challengeData;
    const winner = userData.totalMinutes > d.creatorTime ? currentNickname : d.creator;
    
    const card = document.createElement("div");
    card.className = "flower-battle";
    card.innerHTML = `
        <div class="battle-title">Screen Time Battle ⚔️</div>
        <div class="battle-row">
            <div class="player-box"><b>${d.creator}</b><br>${Math.floor(d.creatorTime/60)}h ${d.creatorTime%60}m</div>
            <div class="vs">VS</div>
            <div class="player-box"><b>${currentNickname}</b><br>${userData.formatted}</div>
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

document.getElementById("challengeBtn").addEventListener("click", async () => {
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
        await navigator.share({ title: "Screen Time Challenge!", text: `Can you beat my ${Math.floor(currentUserTime/60)}h screen time? ⚔️`, url: link });
    } else {
        navigator.clipboard.writeText(link);
        showToast("Challenge link copied! Send to friends. 🔥", "success");
    }
});

// ==========================================
// 7. LEADERBOARD LOGIC
// ==========================================
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

    // Highest time wale top par aayenge (limitToLast 10)
    database.ref('leaderboard/' + dailyKey).orderByChild('totalMinutes').limitToLast(10).on('value', (snap) => {
        tbody.innerHTML = "";
        if (snap.exists()) {
            let res = []; 
            snap.forEach(c => res.push(c.val()));
            // Reverse taaki highest upar aaye
            res.reverse().forEach((d, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
                tbody.innerHTML += `<tr><td>${medal}</td><td>${d.nickname}</td><td class="time">${d.formattedTime}</td></tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" align="center">No data yet. Be the first!</td></tr>';
        }
    });
}

// ==========================================
// 8. UI HELPERS & BUTTONS (Toast, QR, Modals)
// ==========================================
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
        new QRCode(container, { 
            text: window.location.origin + window.location.pathname, 
            width: 100, 
            height: 100,
            colorDark: "#2d3436",
            colorLight: "#fdfaf6"
        });
    }
}

// Download Button
document.getElementById('downloadBtn').onclick = () => {
    const a = document.createElement('a');
    a.download = `UCforU_${currentNickname}.png`;
    a.href = document.getElementById('generated-image-preview').src;
    a.click();
    showToast("Card Downloaded! ❤️", "success");
};

// Share Link Button
document.getElementById('shareBtn').onclick = async () => {
    const link = window.location.origin + window.location.pathname;
    if (navigator.share) {
        await navigator.share({ title: "Check out UCforU", text: "Create your Digital Footprint Card! ❤️", url: link });
    } else {
        navigator.clipboard.writeText(link);
        showToast("Link copied to clipboard! 🔗", "success");
    }
};

// ==========================================
// 9. INITIALIZATION & GUIDE TABS
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    window.challengeID = params.get("challenge");

    if (window.challengeID && database) {
        database.ref("challenges/" + window.challengeID).once("value").then(snap => {
            if (snap.exists()) window.challengeData = snap.val();
        });
    }

    // Auto-guide popup logic
    if (!localStorage.getItem('guideShown') || window.challengeID) {
        setTimeout(() => { document.getElementById('guideModal').style.display = 'flex'; }, 1000);
    }
});

// Guide Manual Trigger
document.getElementById('guideBtn').onclick = () => {
    document.getElementById('guideModal').style.display = 'flex';
};

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
