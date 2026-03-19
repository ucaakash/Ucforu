module.exports = async function (req, res) {
    // Sirf POST request allow karenge
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { imageBase64 } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key missing in Vercel' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const prompt = `
        You are an expert mobile screen time analyzer and a funny meme creator.
        Analyze this image. It should be a mobile phone's screen time or digital wellbeing dashboard.

        Return ONLY a raw JSON object (without markdown blocks like \`\`\`json) with this exact structure:
        {
          "isRealScreenshot": true/false, 
          "isOwnCard": true/false, 
          "hours": <number of total hours, 0 if none>,
          "minutes": <number of total minutes, 0 if none>,
          "shayari": "<string>"
        }

        Rules for Shayari (in Hindi/Hinglish written in English script):
        - If time is > 8 hours: Roast them brutally but funnily about being chronically online, no social life, or living in reels.
        - If time is 4 to 8 hours: Tease them about wasting half their day.
        - If time is < 4 hours: Praise them for touching grass, or ask if their phone was dead.
        Keep the shayari short, punchy, and Instagram-meme friendly.
        `;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } }
                    ]
                }]
            })
        });

        const data = await response.json();
        
        // AI ka response text extract karna
        let aiText = data.candidates[0].content.parts[0].text;
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const resultJSON = JSON.parse(aiText);
        
        // Wapas frontend ko bhej dena
        res.status(200).json(resultJSON);

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: 'Failed to process image' });
    }
};
