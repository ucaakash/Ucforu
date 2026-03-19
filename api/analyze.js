module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64 } = req.body;
    // Key ko trim karna zaroori hai
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

    if (!apiKey) return res.status(500).json({ error: 'Vercel Settings mein Key nahi mili' });

    // AI Studio ke liye sabse stable link (v1beta)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this screen time image. Return ONLY a JSON: {\"isRealScreenshot\":true, \"hours\":5, \"minutes\":30, \"shayari\":\"hindi roast\"}" },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } }
          ]
        }]
      })
    });

    const data = await response.json();

    // AGAR ERROR AAYE: Toh hum poora message dikhayenge
    if (data.error) {
      console.error("GOOGLE ERROR:", data.error.message);
      return res.status(response.status).json({ error: data.error.message });
    }

    // Response parse karna
    if (data.candidates && data.candidates[0]) {
      let aiText = data.candidates[0].content.parts[0].text;
      aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      return res.status(200).json(JSON.parse(aiText));
    }

    throw new Error("AI ne koi response nahi diya");

  } catch (err) {
    console.error("BACKEND CRASH:", err.message);
    res.status(500).json({ error: "Server Busy: " + err.message });
  }
};
