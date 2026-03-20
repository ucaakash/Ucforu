module.exports = async (req, res) => { // 🔥 FIX 1: Chhota 'm' kar diya
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64, roastStyle, customPrompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

    if (!apiKey) return res.status(500).json({ error: 'API Key Missing in Vercel!' });

    // AI KA MOOD DECIDE KARNA
    let personality = "Write a soft, poetic 2-line Hindi Shayari about screen time.";
    if (roastStyle === "meme") {
        personality = "Write a highly sarcastic, GenZ meme-style funny roast in Hindi/Hinglish about their screen addiction.";
    } else if (roastStyle === "brutal") {
        personality = "Write a brutal, insulting, and savage roast in Hindi about wasting life on the phone.";
    } else if (roastStyle === "custom" && customPrompt) {
        personality = customPrompt; // GOD MODE PROMPT
    }

    const promptText = `Analyze this mobile screen time image. Return ONLY a valid JSON object: {"isRealScreenshot": true, "isOwnCard": false, "hours": 5, "minutes": 30, "shayari": "Your custom shayari here"}. ${personality} No extra text or markdown code blocks.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText }, 
            { inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } }
          ]
        }]
      })
    });

    const data = await response.json();
    
    // 🔥 FIX 2: Agar Google API fail ho jaye
    if (data.error) {
        console.error("Google API Error:", data.error.message);
        return res.status(response.status).json({ error: data.error.message });
    }

    // 🔥 FIX 3: Agar AI answer dena bhool jaye (Crash protection)
    if (!data.candidates || data.candidates.length === 0) {
        console.error("Gemini Empty Response:", data);
        throw new Error("AI failed to read image.");
    }

    let aiText = data.candidates[0].content.parts[0].text;
    
    // Clean and Parse JSON safely
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(aiText);
    
    res.status(200).json(parsedData);

  } catch (err) {
    console.error("Server Error:", err.message);
    res.status(500).json({ error: "Image clear nahi hai ya Server Busy hai! Try again." });
  }
};
