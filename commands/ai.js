const axios = require('axios');

module.exports = {
  name: 'ai',
  description: 'Ask a question to the 𝙽𝚎𝚔𝚘 𝙰𝙸',
  usage: 'ai <question>',
  author: 'Clarence',
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const prompt = args.join(' ');
    try {
      const apiUrl = `https://rest-api-french.onrender.com/api/neko?prompt=${encodeURIComponent(prompt)}&uid=${senderId}`;
      const response = await axios.get(apiUrl);
      const text = response.data.response;

      // Send the response, split into chunks if necessary
      await sendResponseInChunks(senderId, text, pageAccessToken, sendMessage);
    } catch (error) {
      console.error('Error calling 𝙽𝚎𝚔𝚘 𝙰𝙸 API:', error);
      sendMessage(senderId, { text: '⚠️ | Opss! Something went wrong on api please contact French Mangigo on Facebook. Thank you!.' }, pageAccessToken);
    }
  }
};

async function sendResponseInChunks(senderId, text, pageAccessToken, sendMessage) {
  const maxMessageLength = 2000;
  if (text.length > maxMessageLength) {
    const messages = splitMessageIntoChunks(text, maxMessageLength);
    for (const message of messages) {
      await sendMessage(senderId, { text: message }, pageAccessToken);
    }
  } else {
    await sendMessage(senderId, { text }, pageAccessToken);
  }
}

function splitMessageIntoChunks(message, chunkSize) {
  const chunks = [];
  let chunk = '';
  const words = message.split(' ');

  for (const word of words) {
    if ((chunk + word).length > chunkSize) {
      chunks.push(chunk.trim());
      chunk = '';
    }
    chunk += `${word} `;
  }
  
  if (chunk) {
    chunks.push(chunk.trim());
  }

  return chunks;
}
