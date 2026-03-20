module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // 🔥 NAYA: customPrompt ko request se nikalna
    const { imageBase64, roastStyle, customPrompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

    if (!apiKey) return res.status(500).json({ error: 'API Key Missing in Vercel!' });

    // 🔥 AI KA MOOD DECIDE KARNA
    let personality = "Write a soft, poetic 2-line Hindi Shayari about screen time.";
    if (roastStyle === "meme") {
        personality = "Write a highly sarcastic, GenZ meme-style funny roast in Hindi/Hinglish about their screen addiction.";
    } else if (roastStyle === "brutal") {
        personality = "Write a brutal, insulting, and savage roast in Hindi about wasting life on the phone.";
    } else if (roastStyle === "custom" && customPrompt) {
        personality = customPrompt; // 🔥 ULTIMATE GOD MODE: Tumhara khud ka likha hua prompt!
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
    if (data.error) return res.status(response.status).json({ error: data.error.message });

    let aiText = data.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    res.status(200).json(JSON.parse(aiText));

  } catch (err) {
    res.status(500).json({ error: "Server Busy: " + err.message });
  }
};
