const express = require('express');
const cors = require('cors');
const gtts = require('node-gtts');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post('/ask', async (req, res) => {
  const { prompt, lang } = req.body;

  if (!prompt) {
    return res.status(400).send('Prompt is required');
  }

  try {
    console.log("Received prompt:", prompt);

    // Send prompt to RAG API with correct field 'query'
    const ragResponse = await fetch('https://pgs-llm.onrender.com/rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: prompt }),
    });

    if (!ragResponse.ok) {
      const errText = await ragResponse.text();
      console.error("GenAI TTS API error:", errText);
      return res.status(500).send('Error fetching response from RAG API');
    }

    // Parse JSON response from RAG API
    const ragData = await ragResponse.json();
    console.log("RAG API response:", ragData);

    const responseText = ragData.answer || 'No response received from RAG API';

    // Convert text to speech
    const gttsInstance = gtts(lang || 'en');
    const audioStream = gttsInstance.stream(responseText);

    let audioChunks = [];

    audioStream.on('data', (chunk) => audioChunks.push(chunk));

    audioStream.on('end', () => {
      const audioBuffer = Buffer.concat(audioChunks);
      const audioBase64 = audioBuffer.toString('base64');

      res.json({
        text: responseText,
        audio: `data:audio/mpeg;base64,${audioBase64}`,
      });
    });

    audioStream.on('error', (err) => {
      console.error("TTS Error:", err);
      res.status(500).send('Error generating speech');
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
