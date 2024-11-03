const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('./sendMessage'); // Ensure this is correctly exported from sendMessage.js
const commands = new Map();
const prefix = ''; // Define a prefix if needed (e.g., '!')

/**
 * Load all commands from the commands folder
 */
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name.toLowerCase(), command);
}

/**
 * Handle incoming messages and execute corresponding commands
 */
async function handleMessage(event, pageAccessToken) {
  if (!event || !event.sender || !event.sender.id) return;

  const senderId = event.sender.id;
  let imageUrl = null;

  // Auto-detect image from message attachments
  if (event.message && event.message.attachments) {
    const imageAttachment = event.message.attachments.find(att => att.type === 'image');
    if (imageAttachment) {
      imageUrl = imageAttachment.payload.url;
    }
  }

  // Auto-detect image from replied-to message
  if (event.message && event.message.reply_to && event.message.reply_to.mid) {
    try {
      imageUrl = await getAttachments(event.message.reply_to.mid, pageAccessToken);
    } catch (error) {
      console.error('Error fetching image from replied message:', error.message);
    }
  }

  if (event.message && event.message.text) {
    const messageText = event.message.text.trim();
    let commandName, args;

    // Command handling
    if (messageText.startsWith(prefix)) {
      const argsArray = messageText.slice(prefix.length).split(' ');
      commandName = argsArray.shift().toLowerCase();
      args = argsArray;
    } else {
      const words = messageText.split(' ');
      commandName = words.shift().toLowerCase();
      args = words;
    }

    // Execute command if it exists in the command map
    if (commands.has(commandName)) {
      const command = commands.get(commandName);
      try {
        if (commandName === 'gemini') {
          await command.execute(senderId, args, pageAccessToken, imageUrl);
        } else {
          await command.execute(senderId, args, pageAccessToken, sendMessage, imageUrl);
        }
      } catch (error) {
        console.error(`Error executing command ${commandName}:`, error.message);
        sendMessage(senderId, { text: 'There was an error executing that command.' }, pageAccessToken);
      }
      return;
    }

    // Fallback to AI handling if command is not found
    const aiCommand = commands.get('ai');
    if (aiCommand) {
      try {
        await aiCommand.execute(senderId, messageText, pageAccessToken, sendMessage);
      } catch (error) {
        console.error('Error processing AI request:', error.message);
        sendMessage(senderId, { text: 'There was an error processing your request.' }, pageAccessToken);
      }
    }
  }

  // Handle images with the Gemini command
  if (imageUrl) {
    const geminiCommand = commands.get('gemini');
    if (geminiCommand) {
      try {
        await geminiCommand.execute(senderId, [], pageAccessToken, imageUrl);
      } catch (error) {
        console.error('Error processing image with Gemini command:', error.message);
        sendMessage(senderId, { text: 'There was an error processing your image.' }, pageAccessToken);
      }
    }
  }
}

/**
 * Fetch image attachment from a replied-to message
 */
async function getAttachments(mid, pageAccessToken) {
  if (!mid) throw new Error("No message ID provided.");

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v21.0/${mid}/attachments`, {
      params: { access_token: pageAccessToken }
    });

    if (data && data.data.length > 0 && data.data[0].image_data && data.data[0].image_data.url) {
      return data.data[0].image_data.url;
    } else {
      throw new Error("No image found in the replied message.");
    }
  } catch (error) {
    console.error('Error fetching attachments from Facebook API:', error.message);
    throw error; // Propagate the error to be handled in handleMessage
  }
}

module.exports = { handleMessage };
