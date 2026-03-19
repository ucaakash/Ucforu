export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb', // Image size limit
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { imageBase64 } = req.body;
        const apiKey = process.env.GEMINI_API_KEY; // Vercel se key aayegi

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key missing in Vercel' });
        }

        // Gemini 1.5 Flash - Sabse fast model
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // Gemini ko strict instruction (Prompt)
        const prompt = `
        You are an expert mobile screen time analyzer and a funny meme creator.
        Analyze this image. It should be a mobile phone's screen time or digital wellbeing dashboard.

        Return ONLY a raw JSON object (without markdown blocks like \`\`\`json) with this exact structure:
        {
          "isRealScreenshot": true/false, // false if it's not a screen time settings page
          "isOwnCard": true/false, // true if the image contains the word 'ucforu' or looks like our generated comparison card
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
        let aiText = data.candidates[0].content.parts[0].text;
        
        // Clean JSON formatting if Gemini adds markdown
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const resultJSON = JSON.parse(aiText);
        res.status(200).json(resultJSON);

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: 'Failed to process image' });
    }
}
