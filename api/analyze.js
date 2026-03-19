module.exports = async (req, res) => {
  console.log("--- REQUEST STARTED ---");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // STEP 1: Key Check
    if (!apiKey) {
      console.error("ERROR: GEMINI_API_KEY is missing in Vercel settings!");
      return res.status(500).json({ error: 'API Key Missing' });
    }
    console.log("API Key found (Length):", apiKey.length);

    // STEP 2: Body Check
    if (!imageBase64) {
      console.error("ERROR: No image data received in request body!");
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // STEP 3: Gemini Call
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this mobile screen time image. Return ONLY a valid JSON object: {\"isRealScreenshot\": true, \"isOwnCard\": false, \"hours\": 5, \"minutes\": 30, \"shayari\": \"funny roast\"}. No extra text or markdown." },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } }
          ]
        }]
      })
    });

    const data = await response.json();
    console.log("Gemini Raw Response Status:", response.status);

    if (data.error) {
      console.error("Gemini API Error:", JSON.stringify(data.error));
      return res.status(500).json({ error: "Gemini API failed" });
    }

    // STEP 4: Parse AI Text
    let aiText = data.candidates[0].content.parts[0].text;
    console.log("AI Text before cleaning:", aiText);
    
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(aiText);

    console.log("Final Result sent to frontend!");
    res.status(200).json(result);

  } catch (err) {
    console.error("CRASH ERROR:", err.message);
    res.status(500).json({ error: "Server Crash: " + err.message });
  }
};
