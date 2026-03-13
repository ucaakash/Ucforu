import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Sirf POST request allow karein
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { time } = req.body;
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `User ne aaj ${time} apne phone par bitaye hain. Unhe ek chhota sa, witty, Hinglish mein roast karne wala comment do jo wo Instagram par share kar sake.`;

    const result = await model.generateContent(prompt);
    const roast = result.response.text();

    res.status(200).json({ roast });
  } catch (error) {
    res.status(500).json({ error: "AI response failed" });
  }
}
