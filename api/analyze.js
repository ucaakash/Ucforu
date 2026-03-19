module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64 } = req.body;
    // API key ko trim kar rahe hain taki koi extra space link na kharab kare
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

    if (!apiKey) return res.status(500).json({ error: 'API Key Missing in Vercel!' });

    // Is baar v1beta aur models/gemini-1.5-flash ka ekdum fresh link
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this screen time screenshot. Return ONLY JSON: {\"isRealScreenshot\":true, \"hours\":5, \"minutes\":30, \"shayari\":\"hindi roast\"}" },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } }
          ]
        }]
      })
    });

    const data = await response.json();
    console.log("Gemini Status:", response.status);

    if (data.error) {
      console.error("Gemini Error Detail:", JSON.stringify(data.error));
      // Agar model nahi mil raha, toh Gemini khud bata dega kyun
      return res.status(500).json({ error: data.error.message });
    }

    let aiText = data.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    res.status(200).json(JSON.parse(aiText));

  } catch (err) {
    console.error("Crash Error:", err.message);
    res.status(500).json({ error: "Server Busy: " + err.message });
  }
};
