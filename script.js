// --- Firebase Configuration ---
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

// --- IMAGE COMPRESSOR (Vercel limits bachane ke liye) ---
function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 800;
                const scaleSize = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scaleSize;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
        };
    });
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
        const base64Image = await compressImage(file);

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Image })
        });

        if (!response.ok) throw new Error("API_ERROR");
        
        const aiData = await response.json();

        if (aiData.isOwnCard) throw new Error("OWN_CARD");
        if (!aiData.isRealScreenshot) throw new Error("FAKE_PHOTO");
        
        const totalMinutes = (aiData.hours * 60) + aiData.minutes;
        if (totalMinutes === 0) throw new Error("INVALID_TIME");

        currentUserTime = totalMinutes;
        currentNickname = nickname;
        const timeString = `${aiData.hours}h ${aiData.minutes}m`;

        document.getElementById('render-name').innerText = nickname;
        document.getElementById('render-time').innerText = `${timeString} screen time`;
        document.getElementById('render-shayari').innerText = `"${aiData.shayari}"`;

        await document.fonts.ready;
        const renderCard = document.getElementById('instagram-card');
        const canvas = await html2canvas(renderCard, { scale: 1.5, useCORS: true, backgroundColor: "#fdfaf6" });
        const imageDataUrl = canvas.toDataURL("image/png");

        document.getElementById('generated-image-preview').src = imageDataUrl;
        document.getElementById('processing').style.display = 'none';
        document.getElementById('result').style.display = 'block';

        saveLeaderboardData(timeString);
        setupDownloadAndShare(imageDataUrl);
        if (window.challengeData) handleBattleResult();
        generateMyQR();

    } catch (error) {
        console.error(error);
        document.getElementById('processing').style.display = 'none';
        document.getElementById('inputForm').style.display = 'block';
        
        if (error.message === "OWN_CARD") showToast("Yeh toh hamara hi card hai! 😂 Asli photo daaliye.", "error");
        else if (error.message === "FAKE_PHOTO") showToast("Fake Alert! 🚨 Sahi Screenshot daaliye.", "error");
        else showToast("Server busy ya image clear nahi hai. Try again!", "error");
    }
});

// --- BATTLE & LEADERBOARD LOGIC ---
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

    if (database && window.challengeID) {
        database.ref("challenges/" + window.challengeID).update({ opponent: currentNickname, opponentTime: currentUserTime, winner: winner });
    }
}

// 🔥 BUG FIX 1: Emojis/Hindi se crash nahi hoga
function saveLeaderboardData(timeString) {
    if (database) {
        const dailyKey = new Date().toISOString().split('T')[0];
        const safeName = currentNickname.replace(/[^a-zA-Z0-9]/g, "User"); 
        const userKey = safeName + "_" + Date.now();
        
        database.ref(`leaderboard/${dailyKey}/${userKey}`).set({ 
            nickname: currentNickname, 
            totalMinutes: currentUserTime, 
            formattedTime: timeString,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).catch(err => console.error("Firebase Save Error:", err));
    }
}

// 🔥 BUG FIX 2: 1 user wala issue solved (Curly braces lagaye hain)
function loadLeaderboard() {
    if (!database) return;
    const dailyKey = new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('leaderboardBody');
    
    database.ref('leaderboard/' + dailyKey).orderByChild('totalMinutes').limitToLast(10).on('value', (snap) => {
        tbody.innerHTML = "";
        if (snap.exists()) {
            let results = []; 
            
            // Yahan brackets {} bohot zaroori the loop chalane ke liye
            snap.forEach((child) => { 
                results.push(child.val()); 
            });
            
            results.reverse().forEach((data, index) => {
                const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : (index + 1);
                tbody.innerHTML += `<tr><td>${medal}</td><td>${data.nickname}</td><td style="text-align: right;">${data.formattedTime}</td></tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data yet</td></tr>';
        }
    });
}

// --- UI ACTIONS (Download, Share, QR, Modals) ---
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

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = `<div class="toast-icon">${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</div><div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 400); }, 3000);
}

// --- PAGE LOAD & CHALLENGE BUTTON ---
window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    window.challengeID = params.get("challenge");
    const guideModal = document.getElementById('guideModal');

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

    if (guideModal) {
        if (window.challengeID || !localStorage.getItem('guideShown')) {
            setTimeout(() => { guideModal.style.display = 'flex'; }, 1000);
        }
        document.getElementById('closeGuide').onclick = () => { guideModal.style.display = 'none'; localStorage.setItem('guideShown', 'true'); };
        window.onclick = (event) => { if (event.target == guideModal) { guideModal.style.display = "none"; localStorage.setItem('guideShown', 'true'); } };
    }

    const tabAndroid = document.getElementById('tabAndroid'), tabIphone = document.getElementById('tabIphone');
    const contentAndroid = document.getElementById('contentAndroid'), contentIphone = document.getElementById('contentIphone');
    if (tabAndroid && tabIphone) {
        tabAndroid.onclick = () => { contentAndroid.style.display = 'block'; contentIphone.style.display = 'none'; tabAndroid.className = 'primary'; tabIphone.className = 'secondary'; };
        tabIphone.onclick = () => { contentAndroid.style.display = 'none'; contentIphone.style.display = 'block'; tabAndroid.className = 'secondary'; tabIphone.className = 'primary'; };
    }

    const challengeBtn = document.getElementById("challengeBtn");
    if (challengeBtn) {
        challengeBtn.addEventListener("click", async () => {
            try {
                // 🔥 BUG FIX 3: Challenge link mein bhi emoji crash fix
                const safeName = currentNickname.replace(/[^a-zA-Z0-9]/g, "User");
                const newChallengeID = safeName + "_" + Date.now();
                
                const challengeLink = `${location.origin}${location.pathname}?challenge=${newChallengeID}`;
                
                if (database) {
                    database.ref("challenges/" + newChallengeID).set({ 
                        creator: currentNickname, 
                        creatorTime: currentUserTime, 
                        timestamp: firebase.database.ServerValue.TIMESTAMP 
                    });
                }
                
                if (navigator.share) {
                    await navigator.share({ 
                        title: "Screen Time Challenge", 
                        text: `⚔️ ${currentNickname} challenged you!\nMy screen time: ${Math.floor(currentUserTime/60)}h ${currentUserTime%60}m\nCan you beat me? 😎\n\n${challengeLink}` 
                    });
                } else {
                    navigator.clipboard.writeText(challengeLink); 
                    showToast("Challenge link copied 🔥", "success");
                }
            } catch (err) { console.error("Challenge failed", err); }
        });
    }
});
