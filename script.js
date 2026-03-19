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

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("Firebase initialized successfully");
    loadLeaderboard();
} catch (error) {
    console.error("Firebase init error:", error);
}

// --- 2. THE MASTER OCR LOGIC (No Ghapla) ---
function parseScreentime(text) {
    let hours = 0, minutes = 0;
    let cleanText = text.toLowerCase().replace(/\s+/g, ' ');

    // Apple Font Fix (l, i, |, ! ko 1 banao)
    cleanText = cleanText.replace(/(^|\s)(l|i|\||!)\s*h/g, ' 1h');
    cleanText = cleanText.replace(/(^|\s)(l|i|\||!)\s*m/g, ' 1m');

    // TARGETED SEARCH: Pehle "Daily Average", "Total" ke turant baad wala time dhundo
    const targetMatch = cleanText.match(/(daily average|total|screen time|activity)\s*(\d+)\s*h\s*(\d+)\s*m/);
    const targetMatchShort = cleanText.match(/(daily average|total|screen time|activity)\s*(\d+)\s*h/);

    if (targetMatch) {
        hours = parseInt(targetMatch[2]);
        minutes = parseInt(targetMatch[3]);
    } else if (targetMatchShort) {
        hours = parseInt(targetMatchShort[2]);
        minutes = 0;
    } else {
        // Fallback: Agar keyword nahi mila, toh pehla valid time dhundo
        const fallback = cleanText.match(/(\d+)\s*h\s*(\d+)\s*m/);
        if (fallback) {
            hours = parseInt(fallback[1]);
            minutes = parseInt(fallback[2]);
        }
    }

    // Validation
    hours = (isNaN(hours) || hours > 24) ? 0 : hours;
    minutes = (isNaN(minutes) || minutes >= 60) ? 0 : minutes;

    return { hours, minutes, totalMinutes: (hours * 60) + minutes };
}

// --- 3. ANALYZE BUTTON (Image Processing) ---
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
        
        // Whitelist: Must be real settings screenshot
        const isRealScreenshot = cleanText.includes("screen time") || cleanText.includes("digital wellbeing") || cleanText.includes("today") || cleanText.includes("activity") || cleanText.includes("daily");
        if (!isRealScreenshot) throw new Error("FAKE_PHOTO");
        
        // Time Detection
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
        else if (error.message === "FAKE_PHOTO") showToast("Fake Alert! 🚨 Asli photo daaliye.", "error");
        else showToast("Sahi screenshot daaliye! Detect nahi hua 🧐", "error");
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
    
    database.ref('leaderboard/' + dailyKey).orderByChild('totalMinutes').limitToLast(10).on('value', (snap) => {
        tbody.innerHTML = "";
        if (snap.exists()) {
            let results = []; snap.forEach(child => results.push(child.val()));
            results.reverse().forEach((data, index) => {
                const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : (index + 1);
                tbody.innerHTML += `<tr><td>${medal}</td><td>${data.nickname}</td><td style="text-align: right;">${data.formattedTime}</td></tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data yet</td></tr>';
        }
    });
}

// --- 5. UI ACTIONS (Download, Share, QR, Modals) ---
function setupDownloadAndShare(imgUrl) {
    document.getElementById('downloadBtn').onclick = () => {
        const link = document.createElement('a'); link.download = `UCforU_${currentNickname}.png`; link.href = imgUrl; link.click();
    };

    document.getElementById('shareBtn').onclick = async () => {
        try {
            const blob = await (await fetch(imgUrl)).blob();
            const file = new File([blob], "DigitalRhythm.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'My Digital Rhythm', url: 'https://ucforu.online' });
            } else alert("Share feature not supported on this device.");
        } catch (e) { console.error(e); }
    };
}

function generateMyQR() {
    const qrContainer = document.getElementById("qrcode-container");
    if(qrContainer) {
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, { text: "https://ucforu.online", width: 130, height: 130 });
    }
}
generateMyQR();

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = `<div class="toast-icon">${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</div><div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 400); }, 3000);
}

// --- 6. PAGE LOAD: Auto Popup & Challenge Link ---
window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    window.challengeID = params.get("challenge");
    const guideModal = document.getElementById('guideModal');

    // Load Challenge Data if Link is opened
    if (window.challengeID && database) {
        const banner = document.createElement("div");
        banner.style.cssText = "background:rgba(0,0,0,0.3); padding:15px; border-radius:12px; margin-bottom:20px; text-align:center;";
        banner.innerHTML = `<h3>⚔️ Loading challenge...</h3>`;
        document.querySelector("main").prepend(banner);

        database.ref("challenges/" + window.challengeID).once("value").then((snap) => {
            if (snap.exists()) {
                window.challengeData = snap.val();
                banner.innerHTML = `<h3>⚔️ Challenge From ${window.challengeData.creator}</h3><p>Screen Time: ${Math.floor(window.challengeData.creatorTime/60)}h ${window.challengeData.creatorTime%60}m</p><p>Upload your screenshot to beat this score 🏆</p>`;
                if (guideModal) guideModal.querySelector("h2").innerHTML = "Accept Challenge! ⚔️";
            } else {
                banner.innerHTML = `<h3>Challenge not found</h3>`;
            }
        });
    }

    // AUTO POPUP LOGIC
    if (guideModal) {
        // Agar pehli baar aaya hai ya challenge link par click kiya hai
        if (window.challengeID || !localStorage.getItem('guideShown')) {
            setTimeout(() => { guideModal.style.display = 'flex'; }, 1000);
        }

        // Close Guide (Ab baar baar nahi dikhega next refresh par)
        document.getElementById('closeGuide').onclick = () => { 
            guideModal.style.display = 'none'; 
            localStorage.setItem('guideShown', 'true'); 
        };
        
        // Background click se band karna
        window.onclick = (event) => { if (event.target == guideModal) { guideModal.style.display = "none"; localStorage.setItem('guideShown', 'true'); } };
    }

    // Modal Tabs Logic
    const tabAndroid = document.getElementById('tabAndroid'), tabIphone = document.getElementById('tabIphone');
    const contentAndroid = document.getElementById('contentAndroid'), contentIphone = document.getElementById('contentIphone');
    if (tabAndroid && tabIphone) {
        tabAndroid.onclick = () => { contentAndroid.style.display = 'block'; contentIphone.style.display = 'none'; tabAndroid.className = 'primary'; tabIphone.className = 'secondary'; };
        tabIphone.onclick = () => { contentAndroid.style.display = 'none'; contentIphone.style.display = 'block'; tabAndroid.className = 'secondary'; tabIphone.className = 'primary'; };
    }

    // Challenge Friend Button Create Logic
    const challengeBtn = document.getElementById("challengeBtn");
    if (challengeBtn) {
        challengeBtn.addEventListener("click", async () => {
            try {
                const newChallengeID = btoa(currentNickname + Date.now()).replace(/=/g,"");
                const challengeLink = `${location.origin}${location.pathname}?challenge=${newChallengeID}`;
                if (database) database.ref("challenges/" + newChallengeID).set({ creator: currentNickname, creatorTime: currentUserTime, timestamp: firebase.database.ServerValue.TIMESTAMP });
                
                if (navigator.share) {
                    await navigator.share({ title: "Screen Time Challenge", text: `⚔️ ${currentNickname} challenged you!\nMy screen time: ${Math.floor(currentUserTime/60)}h ${currentUserTime%60}m\nCan you beat me? 😎\n\n${challengeLink}` });
                } else {
                    navigator.clipboard.writeText(challengeLink); showToast("Challenge link copied 🔥", "success");
                }
            } catch (err) { console.error("Challenge failed"); }
        });
    }
});
