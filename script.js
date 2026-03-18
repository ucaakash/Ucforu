document.addEventListener("DOMContentLoaded", () => {

   // 🔥 FULL tumhara JS code yaha daalo

});

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
 // Initialization logic v10+ ke liye
 try {
 firebase.initializeApp(firebaseConfig);
 database = firebase.database();
 console.log("Firebase initialized successfully");
 loadLeaderboard();
 } catch (error) {
 console.error("Firebase init error:", error);
 }
 let currentUserTime = 0;
 let currentNickname = "";

 // --- Core Logic ---
 document.getElementById('analyzeBtn').addEventListener('click', async () => {
     const nickname = document.getElementById('nickname').value.trim();
     const file = document.getElementById('screenshot').files[0];
if (!nickname) {
 showToast("Enter your name first!", "error");
 return;
}
      if (!file) {
     showToast("Please upload screenshot!", "error");
     return;
     }
     document.getElementById('inputForm').style.display = 'none';
     document.getElementById('processing').style.display = 'block';

     try {
         // 1. OCR processing
         const { data: { text } } = await Tesseract.recognize(file, 'eng');
         const { hours, minutes, totalMinutes } = parseScreentime(text);
         const timeString = `${hours}h ${minutes}m`;
currentUserTime = totalMinutes;
currentNickname = nickname;
         // 2. Select Shayari
         const randomShayari = shayaris[Math.floor(Math.random() * shayaris.length)];

         // 3. Populate the hidden render card
         document.getElementById('render-name').innerText = nickname;
         document.getElementById('render-time').innerText = `${timeString} screen time`;
         document.getElementById('render-shayari').innerText = `"${randomShayari}"`;

         // 4. Ensure fonts are loaded before taking screenshot
         await document.fonts.ready;

         // 5. Generate Image via HTML2Canvas
         const renderCard = document.getElementById('instagram-card');
         const canvas = await html2canvas(renderCard, {
             scale: 1, // 1080x1080 is already high res
             useCORS: true,
             backgroundColor: "#fdfaf6"
         });

         const imageDataUrl = canvas.toDataURL("image/png");

         // 6. Display Result
         document.getElementById('generated-image-preview').src = imageDataUrl;
         document.getElementById('processing').style.display = 'none';
         document.getElementById('result').style.display = 'block';

// ⚔️ VS Battle Result
if(window.challengeData){

let creatorTime = window.challengeData.creatorTime;

let winner = currentUserTime > creatorTime
? currentNickname
: window.challengeData.creator;

let creatorH=Math.floor(creatorTime/60);
let creatorM=creatorTime%60;

let userH=Math.floor(currentUserTime/60);
let userM=currentUserTime%60;

const card=document.createElement("div");
card.className="flower-battle";

card.innerHTML=`
<div class="battle-title">Screen Time Battle</div>

<div class="battle-row">

<div class="player-box">
<div class="player-name">${window.challengeData.creator}</div>
<div class="player-time">${creatorH}h ${creatorM}m</div>
</div>

<div class="vs">VS</div>

<div class="player-box">
<div class="player-name">${currentNickname}</div>
<div class="player-time">${userH}h ${userM}m</div>
</div>

</div>

<div class="winner-text">👑 Winner: ${winner}</div>
`;

document.getElementById("result").prepend(card);

// Flower animation
const flowers=["🌸","💐","🌹"];

for(let i=0;i<8;i++){

let f=document.createElement("div");
f.className="flower";
f.innerText=flowers[Math.floor(Math.random()*flowers.length)];

f.style.left=Math.random()*100+"%";
f.style.animationDuration=(3+Math.random()*3)+"s";
f.style.animationDelay=Math.random()+"s";

card.appendChild(f);

}

database.ref("challenges/"+window.challengeID).update({
opponent:currentNickname,
opponentTime:currentUserTime,
winner:winner
});

}


         // Setup Download Button
         const downloadBtn = document.getElementById('downloadBtn');
         downloadBtn.onclick = () => {
             const link = document.createElement('a');
             link.download = `UCforU_${nickname.replace(/\s+/g, '_')}.png`;
             link.href = imageDataUrl;
             link.click();
         };

         // Setup Share Button
         
         document.getElementById('shareBtn').onclick = async () => {
         const canvas = document.getElementById('instagram-card'); // Tumhara card div
         
         // Canvas se image generate karo
         const canvasImg = await html2canvas(canvas);
         canvasImg.toBlob(async (blob) => {
         const file = new File([blob], "DigitalRhythm.png", { type: "image/png" });
         
         // Check karo kya device share support karta hai
         if (navigator.canShare && navigator.canShare({ files: [file] })) {
         await navigator.share({
         files: [file],
         title: 'My Digital Rhythm',
         text: 'Check out my today\'s screen time card!',
         url: 'https://ucforu.online'
         });
         } else {
         alert("Oops! Share feature is not supported on this browser/device.");
         }
         });
         };
         
         // 7. Submit to Firebase Leaderboard
         if (database) {
             const dailyKey = new Date().toISOString().split('T')[0];
           const userKey = btoa(nickname + navigator.userAgent).replace(/=/g,"");
           
           database.ref(`leaderboard/${dailyKey}/${userKey}`).set({
           nickname,
           totalMinutes,
           formattedTime: timeString
           });
         }

     } catch (error) {
         console.error(error);
         alert("Failed to analyze image. Please ensure it's a clear screen time screenshot.");
         location.reload();
     }
 });

 function parseScreentime(text) {
     let hours = 0, minutes = 0;
     const cleanText = text.toLowerCase().replace(/\s+/g, ' ');
     const match1 = cleanText.match(/(\d+)\s*h\s*(\d+)\s*m/);
     const match2 = cleanText.match(/(\d+)\s*hours?\s*(\d+)\s*min/);
     if (match1) { hours = parseInt(match1[1]); minutes = parseInt(match1[2]); }
     else if (match2) { hours = parseInt(match2[1]); minutes = parseInt(match2[2]); }
     else {
         const hMatch = cleanText.match(/(\d+)\s*(h|hour)/);
         const mMatch = cleanText.match(/(\d+)\s*(m|min)/);
         if(hMatch) hours = parseInt(hMatch[1]);
         if(mMatch) minutes = parseInt(mMatch[1]);
     }
     hours = isNaN(hours) ? 0 : hours; minutes = isNaN(minutes) ? 0 : minutes;
     return { hours, minutes, totalMinutes: (hours * 60) + minutes };
 }
function loadLeaderboard() {
 const dailyKey = new Date().toISOString().split('T')[0];
 const tbody = document.getElementById('leaderboardBody');
 
 // Yahan 'snap' ka use kiya hai
 database.ref('leaderboard/' + dailyKey).orderByChild('totalMinutes').limitToLast(10).on('value', (snap) => {
     tbody.innerHTML = "";
     
     if (snap.exists()) {
         let results = [];
         // 'snap' ka hi use karenge
         snap.forEach((child) => { results.push(child.val()); });
         results.reverse();
         
         results.forEach((data, index) => {
             const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : (index + 1);
             // Template literals backtick (`) ke andar
             tbody.innerHTML += `<tr>
                 <td>${medal}</td>
                 <td>${data.nickname}</td>
                 <td style="text-align: right;">${data.formattedTime}</td>
             </tr>`;
         });
     } else {
         tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data yet</td></tr>';
     }
 });
}
// QR code generate karne ka function
function generateMyQR() {
 // Purane QR ko clear karne ke liye (agar dubara generate ho raha ho)
 document.getElementById("qrcode-container").innerHTML = "";

 new QRCode(document.getElementById("qrcode-container"), {
     text: "https://ucforu.online", // Aapka domain
     width: 130,  // Size chota rakhenge card ke liye
     height: 130,
     colorDark : "#000000",
     colorLight : "#ffffff",
     correctLevel : QRCode.CorrectLevel.H
 });
}

// Jab 'Reveal My Digital Self' button click ho, tab isse call karein
generateMyQR();

// Function band hone ke baad koi extra bracket nahi hona chahiye!
document.addEventListener("DOMContentLoaded", () => {

const challengeBtn = document.getElementById("challengeBtn");

if(!challengeBtn){
console.log("Challenge button not found");
return;
}

challengeBtn.addEventListener("click", async () => {

try{

const challengeID = btoa(currentNickname + Date.now()).replace(/=/g,"");

const challengeLink = `${location.origin}${location.pathname}?challenge=${challengeID}`;

if(database){
database.ref("challenges/"+challengeID).set({
creator: currentNickname,
creatorTime: currentUserTime,
timestamp: firebase.database.ServerValue.TIMESTAMP
});
}

const canvas = document.getElementById("instagram-card");
const canvasImg = await html2canvas(canvas);

canvasImg.toBlob(async (blob)=>{

const file = new File([blob], "ChallengeCard.png", {type:"image/png"});

const shareText =
`⚔️ ${currentNickname} challenged you!

My screen time: ${Math.floor(currentUserTime/60)}h ${currentUserTime%60}m

Can you beat me? 😎

${challengeLink}`;

}else{

navigator.clipboard.writeText(challengeLink);

showToast("Challenge link copied 🔥", "success");

}

});

}catch(err){

console.error(err);
alert("Challenge failed");

}

});

});
// Challenge detect when page opens
window.addEventListener("DOMContentLoaded", () => {

const params = new URLSearchParams(window.location.search);
const challengeID = params.get("challenge");

if(challengeID){

const banner = document.createElement("div");

banner.style.background = "rgba(0,0,0,0.3)";
banner.style.padding = "15px";
banner.style.borderRadius = "12px";
banner.style.marginBottom = "20px";
banner.style.textAlign = "center";

banner.innerHTML = `
<h3>⚔️ Friend Challenge</h3>
<p>Loading challenge...</p>
`;

document.querySelector("main").prepend(banner);

// Firebase se challenge load
database.ref("challenges/"+challengeID).once("value").then((snap)=>{

if(snap.exists()){

const data = snap.val();

window.challengeData = data;

banner.innerHTML = `
<h3>⚔️ Challenge From ${data.creator}</h3>
<p>Screen Time: ${Math.floor(data.creatorTime/60)}h ${data.creatorTime%60}m</p>
<p>Upload your screenshot to beat this score 🏆</p>
`;

}else{

banner.innerHTML = `
<h3>Challenge not found</h3>
`;

}

});

}

});
function showToast(message, type = "info") {

 const container = document.getElementById("toast-container");

 const toast = document.createElement("div");
 toast.className = "toast " + type;

 let icon = "ℹ️";
 if(type === "success") icon = "✅";
 if(type === "error") icon = "❌";

 toast.innerHTML = `
     <div class="toast-icon">${icon}</div>
     <div>${message}</div>
 `;

 container.appendChild(toast);

 // show animation
 setTimeout(() => {
     toast.classList.add("show");
 }, 100);

 // auto remove
 setTimeout(() => {
     toast.classList.remove("show");
     setTimeout(() => {
         toast.remove();
     }, 400);
 }, 3000);
}