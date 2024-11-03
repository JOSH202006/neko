const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./sendMessage');
const axios = require('axios');
const commands = new Map();
const prefix = '';

// Load all commands
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name.toLowerCase(), command);
}

async function handleMessage(event, pageAccessToken) {
  if (!event || !event.sender || !event.sender.id) return;

  const senderId = event.sender.id;
  let imageUrl = null;

  // Auto detect image to
  if (event.message && event.message.attachments) {
    const imageAttachment = event.message.attachments.find(att => att.type === 'image');
    if (imageAttachment) {
      imageUrl = imageAttachment.payload.url;
    }
  }

  // Auto detect image din to
  if (event.message && event.message.reply_to && event.message.reply_to.mid) {
    try {
      imageUrl = await getAttachments(event.message.reply_to.mid, pageAccessToken); // Fetch image from replied message
    } catch (error) {
      console.error('Error fetching image from replied message:', error.message);
    }
  }

  if (event.message && event.message.text) {
    const messageText = event.message.text.trim();
    let commandName, args;
    
    if (messageText.startsWith(prefix)) {
      const argsArray = messageText.slice(prefix.length).split(' ');
      commandName = argsArray.shift().toLowerCase();
      args = argsArray;
    } else {
      const words = messageText.split(' ');
      commandName = words.shift().toLowerCase();
      args = words;
    }

    if (commands.has(commandName)) {
      const command = commands.get(commandName);
      try {
        if (commandName === 'gemini') {
          await command.execute(senderId, args, pageAccessToken, imageUrl);
        } else {
          await command.execute(senderId, args, pageAccessToken, sendMessage, imageUrl);
        }
      } catch (error) {
        sendMessage(senderId, { text: 'There was an error executing that command.' }, pageAccessToken);
      }
      return;
    }

    // Wag ka mag change dito sa ai handle mag kaka error lahat
    const aiCommand = commands.get('ai');
    if (aiCommand) {
      try {
        await aiCommand.execute(senderId, messageText, pageAccessToken, sendMessage);
      } catch (error) {
        sendMessage(senderId, { text: 'There was an error processing your request.' }, pageAccessToken);
      }
    }
  }

  if (imageUrl) {
    const geminiCommand = commands.get('gemini');
    if (geminiCommand) {
      try {
        await geminiCommand.execute(senderId, [], pageAccessToken, imageUrl);
      } catch (error) {
        sendMessage(senderId, { text: 'There was an error processing your image.' }, pageAccessToken);
      }
    }
  }
}

async function getAttachments(mid, pageAccessToken) {
  if (!mid) throw new Error("No message ID provided.");

  const { data } = await axios.get(`https://graph.facebook.com/v21.0/${mid}/attachments`, {
    params: { access_token: pageAccessToken }
  });

  if (data && data.data.length > 0 && data.data[0].image_data) {
    return data.data[0].image_data.url;
  } else {
    throw new Error("No image found in the replied message.");
  }
}

module.exports = { handleMessage };