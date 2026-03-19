module.exports = async (req, res) => {
  console.log("--- REQUEST STARTED ---");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("ERROR: API Key Missing");
      return res.status(500).json({ error: 'API Key Missing' });
    }

    // YAHAN CHANGE KIYA HAI: v1beta ki jagah v1 use kiya hai
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
    console.log("Gemini API Status:", response.status);

    if (data.error) {
      console.error("Gemini Error:", JSON.stringify(data.error));
      return res.status(500).json({ error: data.error.message });
    }

    // AI Text Extract aur Clean karna
    let aiText = data.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const result = JSON.parse(aiText);
    res.status(200).json(result);

  } catch (err) {
    console.error("CRASH:", err.message);
    res.status(500).json({ error: err.message });
  }
};
