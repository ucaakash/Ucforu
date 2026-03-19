module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

    if (!apiKey) return res.status(500).json({ error: 'API Key Missing in Vercel!' });

    // MODEL NAME UPDATED TO: gemini-2.5-flash
    // Endpoint: v1beta (Naye models ke liye yahi best hai)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this mobile screen time image. Return ONLY a valid JSON object: {\"isRealScreenshot\": true, \"isOwnCard\": false, \"hours\": 5, \"minutes\": 30, \"shayari\": \"Your funny Hindi roast shayari here\"}. No extra text or markdown code blocks." },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } }
          ]
        }]
      })
    });

    const data = await response.json();
    console.log("Gemini 2.5 Status:", response.status);

    if (data.error) {
      console.error("GOOGLE ERROR:", data.error.message);
      return res.status(response.status).json({ error: data.error.message });
    }

    // AI Response Extract
    let aiText = data.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    res.status(200).json(JSON.parse(aiText));

  } catch (err) {
    console.error("CRASH:", err.message);
    res.status(500).json({ error: "Server Busy: " + err.message });
  }
};
