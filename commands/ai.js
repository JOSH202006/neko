const axios = require('axios');

module.exports = {
  name: 'ai',
  description: 'Ask a question to the 𝙽𝚎𝚔𝚘 𝙰𝙸',
  author: 'French Mangigo',
  role: 1,
  async execute(senderId, args, pageAccessToken, sendMessage) {
    const question = args.join(' ');
    try {
      const apiUrl = `https://rest-api-french.onrender.com/api/neko?prompt=${encodeURIComponent(question)}&uid=${senderId}`;
      const response = await axios.get(apiUrl);
      const text = response.data.response; // Adjust if the field is named differently

      await sendResponseInChunks(senderId, text, pageAccessToken, sendMessage);
    } catch (error) {
      console.error('Error calling 𝙽𝚎𝚔𝚘 𝙰𝙿𝙸:', error.response ? error.response.data : error.message);
      sendMessage(senderId, { text: 'Sorry, there was an error processing your request.' }, pageAccessToken);
    }
  }
};

async function sendResponseInChunks(senderId, text, pageAccessToken, sendMessage) {
  const maxMessageLength = 2000; // Set maximum message length
  if (text.length > maxMessageLength) {
    const messages = splitMessageIntoChunks(text, maxMessageLength); // Split text if too long
    for (const message of messages) {
      await sendMessage(senderId, { text: message }, pageAccessToken); // Send each chunk
    }
  } else {
    await sendMessage(senderId, { text }, pageAccessToken); // Send the full text
  }
}

function splitMessageIntoChunks(message, chunkSize) {
  const chunks = [];
  let chunk = '';
  const words = message.split(' '); // Split message into words

  for (const word of words) {
    if ((chunk + word).length > chunkSize) {
      chunks.push(chunk.trim()); // Add chunk to array if size exceeded
      chunk = ''; // Reset chunk
    }
    chunk += `${word} `; // Append word to current chunk
  }

  if (chunk) {
    chunks.push(chunk.trim()); // Add the last chunk if any
  }

  return chunks; // Return array of chunks
}
