// --- 1. SHAYARIS & FIREBASE CONFIG ---
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

try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("Firebase initialized successfully");
    loadLeaderboard();
} catch (error) {
    console.error("Firebase init error:", error);
}

// --- 2. GOD MODE OCR LOGIC ---
function parseScreentime(text) {
    // Faltu symbols hatao, sirf letters aur numbers rakho
    let cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

    // Apple Font Fix (l, i, |, ! ko 1 banao)
    cleanText = cleanText.replace(/(^|\s)(l|i|\||!)\s*h/g, ' 1h');
    cleanText = cleanText.replace(/(^|\s)(l|i|\||!)\s*m/g, ' 1m');

    // Screenshot mein jitne bhi Time format likhe hain, sabko dhoondho
    const timeRegex = /(\d+)\s*(?:h|hr|hour|hours)\s*(\d+)\s*(?:m|min|mins|minutes)/g;
    let match;
    let allFoundTimes = [];

    // Saare times ko ek list mein daalo
    while ((match = timeRegex.exec(cleanText)) !== null) {
        allFoundTimes.push({
            hours: parseInt(match[1]),
            minutes: parseInt(match[2])
        });
    }

    // Agar sirf Ghante (Hours) likhe hain (e.g. "5h") aur minute nahi hai
    if (allFoundTimes.length === 0) {
        const hourOnlyRegex = /(\d+)\s*(?:h|hr|hour|hours)/g;
        while ((match = hourOnlyRegex.exec(cleanText)) !== null) {
            allFoundTimes.push({ hours: parseInt(match[1]), minutes: 0 });
        }
    }

    // Validation: Sirf wahi time rakho jo logical ho (24 ghante se kam, 60 minute se kam)
    let validTimes = allFoundTimes.filter(t => t.hours > 0 && t.hours <= 24 && t.minutes >= 0 && t.minutes < 60);

    if (validTimes.length > 0) {
        // Screenshot mein hamesha Total/Average Time sabse UPAR hota hai
        // Isliye hum list ka sabse PEHLA time utha lenge
        let finalTime = validTimes[0];
        return {
            hours: finalTime.hours,
            minutes: finalTime.minutes,
            totalMinutes: (finalTime.hours * 60) + finalTime.minutes
        };
    }

    return { hours: 0, minutes: 0, totalMinutes: 0 };
}

// --- 3. ANALYZE BUTTON ---
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
        
        // Anti-Cheat: Reject our own card
        if (cleanText.includes("ucforu") || cleanText.includes("download card") || cleanText.includes("digital footprint")) {
            throw new Error("OWN_CARD");
        }
        
        // Time Detection (Strict words check hata diya hai, ab OCR mistakes se farq nahi padega)
        const timeData = parseScreentime(text);
        if (timeData.totalMinutes === 0) throw new Error("INVALID_TIME");
        
        const timeString = `${timeData.hours}h ${timeData.minutes}m`;
        currentUserTime = timeData.totalMinutes;
        currentNickname = nickname;
        
        // Card Render
        const randomShayari = shayaris[Math.floor(Math.random() * shayaris.length)];
        document.getElementById('render-name').innerText = nickname;
        document.getElementById('render-time').innerText = `${timeString} screen time`;
        document.getElementById('render-shayari').innerText = `"${randomShayari}"`;

        await document.fonts.ready;
        const renderCard = document.getElementById('instagram-card');
        const canvas = await html2canvas(renderCard, { scale: 1.5, useCORS: true, backgroundColor: "#fdfaf6" });
        const imageDataUrl = canvas.toDataURL("image/png");

        document.getElementById('generated-image-preview').src = imageDataUrl;
        document.getElementById('processing').style.display = 'none';
        document.getElementById('result').style.display = 'block';

        // Save Data & Setup Download
        saveLeaderboardData(timeString);
        setupDownloadAndShare(imageDataUrl);
        
        // Battle Result
        if (window.challengeData) handleBattleResult();

    } catch (error) {
        console.error(error);
        document.getElementById('processing').style.display = 'none';
        document.getElementById('inputForm').style.display = 'block';
        
        if (error.message === "OWN_CARD") showToast("Yeh toh hamara hi card hai! 😂 Asli photo daaliye.", "error");
        else showToast("Time detect nahi hua 🧐 Ekdum clear photo daaliye!", "error");
    }
});

// --- 4. BATTLE & LEADERBOARD LOGIC ---
function handleBattleResult() {
    let creatorTime = window.challengeData.creatorTime;
    let winner = currentUserTime > creatorTime ? currentNickname : window.challengeData.creator;
    let creatorH = Math.floor(creatorTime / 60), creatorM = creatorTime % 60;
    let userH = Math.floor(currentUserTime / 60), userM = currentUserTime % 60;

    const card = document.createElement("div");
    card.className = "flower-battle";
    card.innerHTML = `
        <div class="battle-title">Screen Time Battle</div>
        <div class="battle-row">
            <div class="player-box"><div class="player-name">${window.challengeData.creator}</div><div class="player-time">${creatorH}h ${creatorM}m</div></div>
            <div class="vs">VS</div>
            <div class="player-box"><div class="player-name">${currentNickname}</div><div class="player-time">${userH}h ${userM}m</div></div>
        </div>
        <div class="winner-text">👑 Winner: ${winner}</div>
    `;
    document.getElementById("result").prepend(card);

    if (database) {
        database.ref("challenges/" + window.challengeID).update({ opponent: currentNickname, opponentTime: currentUserTime, winner: winner });
    }
}

function saveLeaderboardData(timeString) {
    if (database) {
        const dailyKey = new Date().toISOString().split('T')[0];
        const userKey = btoa(currentNickname + navigator.userAgent).replace(/=/g,"");
        database.ref(`leaderboard/${dailyKey}/${userKey}`).set({ nickname: currentNickname, totalMinutes: currentUserTime, formattedTime: timeString });
    }
}

function loadLeaderboard() {
    if (!database) return;
    const dailyKey = new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('leaderboardBody');
    
    database.ref('leaderboard/' + dailyKey).orderByChild('totalMinutes').limitToLast(10
