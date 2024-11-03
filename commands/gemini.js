const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'gemini',
  description: 'Chat with Gemini AI',
  usage: 'gemini <question>',
  author: 'Developer',

  async execute(senderId, args, pageAccessToken, imageUrl = null) {
    let query;

    if (imageUrl && args.length === 0) {
      query = 'Explain this image';
    } else {
      query = args.join(' ') || 'hi';
    }

    try {
      const apiUrl = 'https://rest-api-production-5054.up.railway.app/gemini';
      const response = await fetchGeminiResponse(apiUrl, query, senderId, imageUrl);

      const formattedMessage = `${response.message}`;
      await sendMessageInChunks(senderId, formattedMessage, pageAccessToken);
    } catch (error) {
      console.error('Error processing Gemini command:', error.message);
      await sendMessage(senderId, { text: 'Error: Unable to process your request.' }, pageAccessToken);
    }
  }
};

async function fetchGeminiResponse(apiUrl, prompt, uid, imageUrl) {
  const params = {
    prompt,
    model: 'gemini-1.5-flash',
    uid
  };

  if (imageUrl) {
    params.file_url = imageUrl;
  }

  const { data } = await axios.get(apiUrl, { params });
  return data;
}

async function sendMessageInChunks(senderId, message, pageAccessToken) {
  const maxLength = 2000;
  const chunks = [];

  for (let i = 0; i < message.length; i += maxLength) {
    chunks.push(message.substring(i, i + maxLength));
  }

  for (const chunk of chunks) {
    await sendMessage(senderId, { text: chunk }, pageAccessToken);
  }
}