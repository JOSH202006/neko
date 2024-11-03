const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('./sendMessage');
const config = require('../config.json');

const commands = new Map();
const prefix = '';

const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name.toLowerCase(), command);
  console.log(`Loaded command: ${command.name}`);
}

async function handleMessage(event, pageAccessToken) {
  if (!event?.sender?.id) {
    console.error('Invalid event object: Missing sender ID.');
    return;
  }

  const senderId = event.sender.id;

  if (event.message?.text) {
    const messageText = event.message.text.trim();
    console.log(`Received message: ${messageText}`);

    const words = messageText.split(' ');
    const commandName = words.shift().toLowerCase();
    const args = words;

    console.log(`Parsed command: ${commandName} with arguments: ${args}`);

    if (commands.has(commandName)) {
      const command = commands.get(commandName);

      if (command.role === 0 && !config.adminId.includes(senderId)) {
        sendMessage(senderId, { text: 'You are not authorized to use this command.' }, pageAccessToken);
        return;
      }

      try {
        let imageUrl = '';

        if (event.message?.reply_to?.mid) {
          try {
            imageUrl = await getAttachments(event.message.reply_to.mid, pageAccessToken);
          } catch (error) {
            console.error("Failed to get attachment:", error);
            imageUrl = '';
          }
        } else if (event.message?.attachments?.[0]?.type === 'image') {
          imageUrl = event.message.attachments[0].payload.url;
        }

        await command.execute(senderId, args, pageAccessToken, event, imageUrl);
      } catch (error) {
        if (commandName === 'ai') {
          sendMessage(senderId, { text: "hello 👋🏻 how can I assist you today??\n\nNote: Dont use ai instead question directly, thank you!! 🤗" }, pageAccessToken);
        } else {
          console.error(`Error executing command "${commandName}":`, error);
          sendMessage(senderId, { text: 'There was an error executing that command.' }, pageAccessToken);
        }
      }
    } else {
      if (commands.has('ai')) {
        try {
          await commands.get('ai').execute(senderId, [commandName, ...args], pageAccessToken, sendMessage);
        } catch (error) {
          sendMessage(senderId, { text: "hello 👋🏻 how can I assist you today??\n\nNote: Dont use ai instead question directly, thank you!! 🤗" }, pageAccessToken);
        }
      } else {
        sendMessage(senderId, {
          text: `Unknown command: "${commandName}". Type "help" or click help below for a list of available commands.`,
          quick_replies: [
            {
              content_type: "text",
              title: "Help",
              payload: "HELP_PAYLOAD"
            }
          ]
        }, pageAccessToken);
      }
    }
  } else {
    console.error('Message or text is not present in the event.');
  }
}

async function getAttachments(mid, pageAccessToken) {
  if (!mid) {
    console.error("No message ID provided for getAttachments.");
    throw new Error("No message ID provided.");
  }

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v21.0/${mid}/attachments`, {
      params: { access_token: pageAccessToken }
    });

    if (data?.data?.length > 0 && data.data[0].image_data) {
      return data.data[0].image_data.url;
    } else {
      console.error("No image found in the replied message.");
      throw new Error("No image found in the replied message.");
    }
  } catch (error) {
    console.error("Error fetching attachments:", error);
    throw new Error("Failed to fetch attachments.");
  }
}

module.exports = { handleMessage };
  
