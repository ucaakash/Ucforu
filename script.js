// ================= GLOBAL =================
let database = null;
let currentUserTime = 0;
let currentNickname = "";
let challengeData = null;
let challengeID = null;

// ================= SHAYARI =================
const shayaris = [
"Phone ki duniya mein aise dil lagaya, battery 100 se 0 kab aayi, pata hi nahi chala!",
"Itna scroll kar liya ki ab sapno mein bhi Reels chal rahi hain.",
"Zindagi mein itni clarity nahi hai, jitni mere phone ke screen brightness mein hai.",
"Hum toh chale the kuch 'Productive' karne, par phone uthate hi 3 ghante nikal gaye.",
"Log kehte hain 'Don't waste time', hum kehte hain 'Bas ek aur Reel phir kaam shuru'.",
"Humne waqt nahi, waqt ne humein scroll kar diya!",
"Kaash itna focus main padhai par karta, toh aaj NASA mein hota.",
"Suno, phone rakho aur muskurao, kyunki aap bahut cute ho!",
"Itne ghante phone chalane ke baad bhi, dimag mein sirf 'Empty' likha hai."
];

// ================= FIREBASE =================
const firebaseConfig = {
apiKey: "AIzaSyCeJWTbIF3mD43ihcoCZJ8LO-b896-FWa4",
authDomain: "ucforu-730a7.firebaseapp.com",
projectId: "ucforu-730a7",
databaseURL: "https://ucforu-730a7-default-rtdb.firebaseio.com"
};

try {
firebase.initializeApp(firebaseConfig);
database = firebase.database();
console.log("🔥 Firebase Connected");
} catch (e) {
console.error("Firebase Error:", e);
}

// ================= START =================
document.addEventListener("DOMContentLoaded", () => {

loadLeaderboard();
detectChallenge();
generateMyQR();

// Analyze button
document.getElementById("analyzeBtn").addEventListener("click", analyzeHandler);

// Challenge button
setupChallengeBtn();

});

// ================= ANALYZE =================
async function analyzeHandler(){

const nickname = document.getElementById('nickname').value.trim();
const file = document.getElementById('screenshot').files[0];

if (!nickname) return showToast("Enter your name", "error");
if (!file) return showToast("Upload screenshot", "error");

document.getElementById('inputForm').style.display = 'none';
document.getElementById('processing').style.display = 'block';

try {

const { data:{text} } = await Tesseract.recognize(file, 'eng');

const {hours, minutes, totalMinutes} = parseTime(text);

currentUserTime = totalMinutes;
currentNickname = nickname;

// Shayari
const shayari = shayaris[Math.floor(Math.random()*shayaris.length)];

// Fill card
document.getElementById('render-name').innerText = nickname;
document.getElementById('render-time').innerText = `${hours}h ${minutes}m`;
document.getElementById('render-shayari').innerText = shayari;

// Generate image
await document.fonts.ready;

const canvas = await html2canvas(document.getElementById('instagram-card'));
const img = canvas.toDataURL();

document.getElementById('generated-image-preview').src = img;

document.getElementById('processing').style.display = 'none';
document.getElementById('result').style.display = 'block';

// Firebase save
if(database){
const key = new Date().toISOString().split('T')[0];
const userKey = btoa(nickname + navigator.userAgent).replace(/=/g,"");

database.ref(`leaderboard/${key}/${userKey}`).set({
nickname,
totalMinutes,
formattedTime: `${hours}h ${minutes}m`
});
}

// Challenge result
if(challengeData) showBattleResult();

// Buttons
setupDownload(img, nickname);
setupShare();

} catch(e){
console.error(e);
showToast("Failed to read screenshot", "error");
}

}

// ================= PARSE =================
function parseTime(text){
let h=0,m=0;

const match = text.match(/(\d+)\s*h\s*(\d+)\s*m/i);

if(match){
h=parseInt(match[1]);
m=parseInt(match[2]);
}

return {hours:h, minutes:m, totalMinutes:h*60+m};
}

// ================= LEADERBOARD =================
function loadLeaderboard(){

if(!database) return;

const key = new Date().toISOString().split('T')[0];
const tbody = document.getElementById('leaderboardBody');

database.ref('leaderboard/'+key).orderByChild('totalMinutes').limitToLast(10)
.on('value', snap=>{

tbody.innerHTML = "";

if(!snap.exists()){
tbody.innerHTML = `<tr><td colspan="3">No data</td></tr>`;
return;
}

let arr=[];
snap.forEach(c=>arr.push(c.val()));
arr.reverse();

arr.forEach((d,i)=>{
const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1;

tbody.innerHTML += `
<tr>
<td>${medal}</td>
<td>${d.nickname}</td>
<td>${d.formattedTime}</td>
</tr>`;
});

});

}

// ================= DOWNLOAD =================
function setupDownload(img, name){
document.getElementById('downloadBtn').onclick = ()=>{
const a=document.createElement("a");
a.href=img;
a.download=`UC_${name}.png`;
a.click();
};
}

// ================= SHARE =================
function setupShare(){

document.getElementById('shareBtn').onclick = async ()=>{

const canvas = await html2canvas(document.getElementById('instagram-card'));

canvas.toBlob(async (blob)=>{

const file = new File([blob],"card.png",{type:"image/png"});

if(navigator.canShare && navigator.canShare({files:[file]})){
await navigator.share({
files:[file],
title:"My Screen Time",
text:"Check mine 😎"
});
}else{
showToast("Sharing not supported", "error");
}

});

};

}

// ================= CHALLENGE =================
function setupChallengeBtn(){

const btn = document.getElementById("challengeBtn");
if(!btn) return;

btn.onclick = async ()=>{

const id = btoa(currentNickname + Date.now()).replace(/=/g,"");

const link = `${location.origin}${location.pathname}?challenge=${id}`;

if(database){
database.ref("challenges/"+id).set({
creator: currentNickname,
creatorTime: currentUserTime
});
}

navigator.clipboard.writeText(link);
showToast("Challenge link copied 🔥","success");

};

}

// ================= DETECT CHALLENGE =================
function detectChallenge(){

const params = new URLSearchParams(window.location.search);
challengeID = params.get("challenge");

if(!challengeID) return;

const banner = document.createElement("div");
banner.innerHTML = "Loading challenge...";
document.querySelector("main").prepend(banner);

database.ref("challenges/"+challengeID).once("value").then(snap=>{

if(!snap.exists()){
banner.innerHTML="Invalid challenge";
return;
}

challengeData = snap.val();

banner.innerHTML = `
⚔️ Challenge from ${challengeData.creator}<br>
Time: ${Math.floor(challengeData.creatorTime/60)}h
`;

});

}

// ================= BATTLE =================
function showBattleResult(){

let winner = currentUserTime > challengeData.creatorTime
? currentNickname
: challengeData.creator;

const div = document.createElement("div");
div.className="flower-battle";

div.innerHTML = `
🏆 Winner: ${winner}
`;

document.getElementById("result").prepend(div);

// Firebase update
database.ref("challenges/"+challengeID).update({
opponent: currentNickname,
opponentTime: currentUserTime,
winner: winner
});

}

// ================= QR =================
function generateMyQR(){

if(typeof QRCode === "undefined") return;

const el = document.getElementById("qrcode-container");
if(!el) return;

el.innerHTML="";

new QRCode(el,{
text:"https://ucforu.online",
width:120,
height:120
});

}

// ================= TOAST =================
function showToast(msg,type="info"){

let container = document.getElementById("toast-container");

if(!container){
container=document.createElement("div");
container.id="toast-container";
document.body.appendChild(container);
}

const t=document.createElement("div");
t.className="toast "+type;
t.innerText=msg;

container.appendChild(t);

setTimeout(()=>t.classList.add("show"),100);

setTimeout(()=>{
t.classList.remove("show");
setTimeout(()=>t.remove(),300);
},3000);

}