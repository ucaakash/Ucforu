module.exports = async (req, res) => {
  // Sirf POST allow karenge
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'API Key Missing' });

    // Gemini API call
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this screen time image. Return ONLY a JSON object: {\"isRealScreenshot\": true, \"hours\": 5, \"minutes\": 30, \"shayari\": \"Hindi roast shayari here\"}" },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } }
          ]
        }]
      })
    });

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
    
    res.status(200).json(JSON.parse(aiResponse));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
 