const { GoogleGenAI } = require('@google/genai');

const keys = process.env.VITE_GEMINI_API_KEYS ? process.env.VITE_GEMINI_API_KEYS.split(',') : [];
const ai = new GoogleGenAI({apiKey: keys[0] || 'AIzaSyBUgWGEmBEoF-tAurpp9eIJVzMY-hj26Pk'});

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Say hello!',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }
      }
    });
    console.log('Success:', response.text);
  } catch (e) { 
    console.error('Error status:', e.status);
    console.error('Error message:', e.message);
    if (e.response) {
       console.error('Response body:', JSON.stringify(e.response, null, 2));
    }
  }
}
test();
