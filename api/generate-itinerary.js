export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const destination = req.body?.destination;
    const days = req.body?.days;
    const interests = req.body?.interests || [];
    const budget = req.body?.budget || 'Mid-range';
    const pace = req.body?.pace || 'Balanced';

    if (!destination || destination.trim() === '') {
        return res.status(400).json({ error: 'No destination provided' });
    }
    if (!Number.isInteger(days) || days < 1 || days > 30) {
        return res.status(400).json({ error: 'Days must be a number from 1 to 30' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
    }

    const interestsText = interests.length > 0
        ? interests.join(', ')
        : 'general interests, keep it balanced';

    const prompt = `You are a travel planning assistant.
Generate a ${days}-day itinerary for ${destination}.
Traveler interests: ${interestsText}.
Budget level: ${budget}. Pace: ${pace}.
Keep each day's activities realistic and geographically sensible.
Respond with ONLY JSON in this exact format, nothing else:
{
  "days": [
    {
      "day": 1,
      "title": "short title for the day",
      "activities": [
        { "time": "Morning", "activity": "short activity name", "notes": "1-2 sentence description" },
        { "time": "Afternoon", "activity": "...", "notes": "..." },
        { "time": "Evening", "activity": "...", "notes": "..." }
      ]
    }
  ]
}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    generationConfig: { responseMimeType: 'application/json' },
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!response.ok) {
            return res.status(500).json({ error: `Gemini API error: ${response.status}` });
        }

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const itinerary = JSON.parse(rawText.trim());

        res.status(200).json(itinerary);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate itinerary' });
    }
}