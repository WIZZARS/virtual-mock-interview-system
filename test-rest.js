import 'fs'; // Dummy import to make it a module
const key = process.env.VITE_GEMINI_API_KEYS ? process.env.VITE_GEMINI_API_KEYS.split(',')[0] : 'AIzaSyAZHDflHPVPXu1dxPEy3GyLtu-Ju_SMid0';

async function test() {
  console.log('Testing text generation...');
  try {
    const textRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Say hello!" }] }] })
    });
    console.log('Text Gen Status:', textRes.status);
    if (!textRes.ok) console.error(await textRes.text());
  } catch (e) { console.error('Text error', e.message); }

  console.log('\nTesting audio generation...');
  try {
    const audioRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say hello!" }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } }
        }
      })
    });
    console.log('Audio Gen Status:', audioRes.status);
    if (!audioRes.ok) {
        console.error('Audio error response body:\n', await audioRes.text());
    } else {
        console.log('Audio Success!');
    }
  } catch(e) { console.error('Audio error', e.message); }
}
test();
