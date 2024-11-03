const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./sendMessage');
const axios = require('axios');
const commands = new Map();
const prefix = '';

// ANSI escape codes for coloring
const colors = {
  blue: '\x1b[34m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// Load all command modules dynamically
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

console.log(`${colors.blue}Loading command files:${colors.reset}`);
for (const file of commandFiles) {
  try {
    const command = require(`../commands/${file}`);
    if (command.name && typeof command.execute === 'function' && typeof command.role !== 'undefined') {
      commands.set(command.name.toLowerCase(), command);
      console.log(`${colors.blue}Successfully loaded command: ${command.name}${colors.reset}`);
    } else {
      throw new Error(`Invalid command structure in file: ${file}. Command role is missing.`);
    }
  } catch (error) {
    console.error(`${colors.red}Failed to load command from file: ${file}${colors.reset}`, error);
  }
}

async function handleMessage(event, pageAccessToken) {
  if (!event || !event.sender || !event.sender.id) return;

  const senderId = event.sender.id;
  const messageText = event.message?.text ? event.message.text.trim().toLowerCase() : '';
  let imageUrl = null;

  console.log(`${colors.blue}Received message: ${messageText}${colors.reset}`);

  // Auto detect image from attachments
  if (event.message && event.message.attachments) {
    const imageAttachment = event.message.attachments.find(att => att.type === 'image');
    if (imageAttachment) {
      imageUrl = imageAttachment.payload.url;
    }
  }

  // Auto detect image from replied message
  if (event.message && event.message.reply_to && event.message.reply_to.mid) {
    try {
      imageUrl = await getAttachments(event.message.reply_to.mid, pageAccessToken);
    } catch (error) {
      console.error('Error fetching image from replied message:', error.message);
    }
  }

  const args = messageText.split(' ');
  const commandName = args.shift().toLowerCase();

  console.log(`${colors.blue}Command name: ${commandName}${colors.reset}`);

  if (commands.has(commandName)) {
    const command = commands.get(commandName);

    // Check authorization if necessary
    const config = require('../config.json');
    if (command.role === 0 && !config.adminId.includes(senderId)) {
      sendMessage(senderId, { text: 'You are not authorized to use this command.' }, pageAccessToken);
      return;
    }

    try {
      await command.execute(senderId, args, pageAccessToken, sendMessage, imageUrl);
    } catch (error) {
      console.error(`${colors.red}Error executing command ${commandName}:${colors.reset}`, error);
      sendMessage(senderId, { text: 'There was an error executing that command.' }, pageAccessToken);
    }
  } else {
    console.log(`${colors.red}Command not found: ${commandName}${colors.reset}`);

    // Default to 'universal' command if no match found
    if (commands.has('ai')) {
      try {
        await commands.get('ai').execute(senderId, [commandName, ...args], pageAccessToken, sendMessage);
      } catch (error) {
        console.error(`${colors.red}Error executing default universal command:${colors.reset}`, error);
        sendMessage(senderId, { text: 'There was an error processing your request.' }, pageAccessToken);
      }
    } else {
      sendMessage(senderId, { text: 'Command not found and no default action available.' }, pageAccessToken);
    }
  }

  // Handle image command if an image is detected
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
