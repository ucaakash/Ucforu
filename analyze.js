export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { imageBase64 } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key missing' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Analyze this screen time image. Return ONLY JSON: {\"isRealScreenshot\":true, \"hours\":number, \"minutes\":number, \"shayari\":\"funny hindi roast\"}" },
                        { inline_data: { mime_type: "image/jpeg", data: imageBase64.split(',')[1] } }
                    ]
                }]
            })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
        res.status(200).json(JSON.parse(aiText));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
