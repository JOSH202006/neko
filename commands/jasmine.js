const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'jasmine',
  description: 'Interact with Jasmine Ai Created by Jay Mar',
  usage: 'jasmine [your message]',
  author: 'Jay Mar',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) return sendMessage(senderId, { text: "Usage: jasmine <question>" }, pageAccessToken);

    try {
      const { data: { result } } = await axios.get(`https://heru-apiv2.onrender.com/api/jasminev2?prompt=${encodeURIComponent(prompt)}`);
      
      // Define a function to chunk the response if it's too long
      const chunkMessage = (message, chunkSize = 2000) => {
        const chunks = [];
        for (let i = 0; i < message.length; i += chunkSize) {
          chunks.push(message.slice(i, i + chunkSize));
        }
        return chunks;
      };

      const chunks = chunkMessage(result);
      for (const chunk of chunks) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }

    } catch {
      sendMessage(senderId, { text: 'There was an error generating the content. Please try again later.' }, pageAccessToken);
    }
  }
};