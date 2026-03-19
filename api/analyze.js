module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

    if (!apiKey) return res.status(500).json({ error: 'API Key Missing' });

    // MODEL NAME CHANGED TO: gemini-1.5-flash-latest
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this mobile screen time image. Return ONLY a valid JSON: {\"isRealScreenshot\":true, \"hours\":5, \"minutes\":30, \"shayari\":\"hindi roast shayari\"}. No extra text." },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } }
          ]
        }]
      })
    });

    const data = await response.json();

    // Agar ab bhi Google error de, toh humein exact pata chalega
    if (data.error) {
      console.error("GOOGLE_ERROR:", data.error.message);
      return res.status(500).json({ error: "Google says: " + data.error.message });
    }

    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: "AI ne koi jawab nahi diya" });
    }

    let aiText = data.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    res.status(200).json(JSON.parse(aiText));

  } catch (err) {
    console.error("CRASH_ERROR:", err.message);
    res.status(500).json({ error: "Server Busy: " + err.message });
  }
};
