const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
const PORT = 80;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/transcribe", async (req, res) => {
  const { audio } = req.body;
  console.log(audio);

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API}`,
      {
        system_instruction: {
          parts: [
            {
              text: `You are a professional Meeting Summarizer & Descriptor Tool.
        Your job is to read the meeting transcript or conversation and produce clear, concise, and structured outputs. Word count must be 30-35% of the actual input text.
        Output language must be same as input language.

        Guidelines:
        1. Summarization:
        - Provide a clear and concise summary of the discussion.
        - Capture key points, decisions, and action items.
        - Avoid unnecessary details, filler words, and repetitions.

        2. Description:
        - Highlight the main topics discussed.
        - Identify who said what (if names/roles are provided).
        - Mention problems raised, solutions suggested, and next steps.
        - Provide contextual insights when useful.

        3. Format:
        - Summary: (2–5 sentences overview)
        - Key Points / Topics Discussed: (bullet points)
        - Decisions Made: (bullet points)
        - Action Items / Next Steps: (bullet points with responsible person if mentioned)
        - Additional Notes / Insights: (optional)

        4. Tone:
        - Keep tone professional, neutral, and easy to read.
        - Avoid personal opinions unless explicitly asked.

        5. Constraints:
        - Do not fabricate information not present in the meeting.
        - Be concise but do not omit important details.`,
            },
          ],
        },
        contents: [
          {
            parts: [{ text: audio }],
          },
        ],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    console.log("Generated content:", text);
    res.send(text); // Send the response from Gemini API
  } catch (error) {
    console.error("Full error object:", error);
    console.error("Error response data:", error.response?.data);
    console.error("Error message:", error.message);
    res.status(500).json({ error: "Error generating content" });
  }
});

app.listen(PORT, (req, res) => {
  console.log(`Server is running on port ${PORT}`);
});