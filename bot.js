const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { TELEGRAM_BOT_TOKEN, MAX_MODELS, ANALYTICS_GROUP_ID } = require('./config');

const SESSION_TIMEOUT = 15 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const sessionsFile = 'sessions.json';
const logFile = 'bot-error.log';
const profanityList = ['badword1', 'badword2', 'idiot']; // Add more as needed

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

let sessions = {};
if (fs.existsSync(sessionsFile)) {
  sessions = JSON.parse(fs.readFileSync(sessionsFile));
}

function saveSessions() {
  fs.writeFileSync(sessionsFile, JSON.stringify(sessions));
}

function logError(err) {
  const errorMsg = `[${new Date().toISOString()}] ${err}\n`;
  fs.appendFileSync(logFile, errorMsg);
}

function updateSessionActivity(chatId) {
  if (!sessions[chatId]) sessions[chatId] = {};
  sessions[chatId].lastActivity = Date.now();
  saveSessions();
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const chatId in sessions) {
    if (sessions[chatId].lastActivity && now - sessions[chatId].lastActivity > SESSION_TIMEOUT) {
      if (sessions[chatId].model) {
        bot.sendMessage(chatId, "⏳ Session expired. Use /start to begin again.");
        
        // Send session history to the analytics group
        if (sessions[chatId].history && sessions[chatId].history.length > 0) {
          const userHistory = sessions[chatId].history.map((q, i) => `${i + 1}. ${q}`).join('\n');
          const userName = sessions[chatId].userName || "Unknown User"; // Fallback if no username
          const analyticsMessage = `📊 Session ended for ${userName} (${chatId}):\nModel: ${sessions[chatId].model}\nQuestions:\n${userHistory}`;
          bot.sendMessage(ANALYTICS_GROUP_ID, analyticsMessage);
        }
      }
      delete sessions[chatId];
    }
  }
  saveSessions();
}

setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL);

function getAvailableModels() {
  return fs.readdirSync('./models')
    .filter(name => fs.existsSync(`./models/${name}/profile.jpg`))
    .slice(0, MAX_MODELS);
}

function getQAForModel(modelName) {
  try {
    return JSON.parse(fs.readFileSync(`./models/${modelName}/qa.json`, 'utf-8'));
  } catch {
    return [];
  }
}

function getModelConfig(modelName) {
  try {
    return JSON.parse(fs.readFileSync(`./models/${modelName}/config.json`, 'utf-8'));
  } catch {
    return { tone: 'friendly', emojis: ['😊'] };
  }
}

function findAnswer(qa, userMessage) {
  userMessage = userMessage.toLowerCase();
  for (let pair of qa) {
    if (userMessage.includes(pair.q.toLowerCase())) return pair.a;
  }
  return null;
}

function getModelMedia(modelName, keyword) {
  try {
    const mediaList = JSON.parse(fs.readFileSync(`./models/${modelName}/media.json`, 'utf-8'));
    for (let item of mediaList) {
      if (item.keywords.includes(keyword.toLowerCase())) {
        const filePath = path.join('./models', modelName, item.file);
        const ext = path.extname(item.file).toLowerCase();
        if ([".jpg", ".jpeg", ".png"].includes(ext)) return { type: 'photo', path: filePath };
        if ([".mp4", ".mov", ".webm"].includes(ext)) return { type: 'video', path: filePath };
      }
    }
  } catch (e) {
    logError(e);
  }
  return null;
}

function simulateTypingDelay(bot, chatId, text) {
  const wordCount = text.split(/\s+/).length;
  const typingTime = Math.min(5000, 1000 + wordCount * (200 + Math.random() * 100));
  return new Promise(resolve => {
    bot.sendChatAction(chatId, 'typing');
    setTimeout(resolve, typingTime);
  });
}

bot.onText(/\/start/, async msg => {
  const chatId = msg.chat.id;
  sessions[chatId] = { index: 0, lastActivity: Date.now(), history: [], userName: msg.from.first_name };
  saveSessions();
  showModelCard(chatId, 0);
});

async function showModelCard(chatId, index) {
  const models = getAvailableModels();
  if (!models.length) return bot.sendMessage(chatId, 'No models available now.');
  const model = models[index];
  const img = fs.readFileSync(`./models/${model}/profile.jpg`);
  await bot.sendPhoto(chatId, img, {
    caption: `Chat with ${model}`,
    reply_markup: {
      inline_keyboard: [[
        { text: '⬅️ Back', callback_data: 'prev' },
        { text: '➡️ Next', callback_data: 'next' }
      ], [
        { text: `💬 Chat with ${model}`, callback_data: `chat_${model}` }
      ]]
    }
  });
}

bot.on('callback_query', async query => {
  const chatId = query.message.chat.id;
  const data = query.data;
  updateSessionActivity(chatId);
  if (!sessions[chatId]) sessions[chatId] = { index: 0, userName: query.from.first_name };
  const models = getAvailableModels();
  let index = sessions[chatId].index;
  if (data === 'next') index = (index + 1) % models.length;
  if (data === 'prev') index = (index - 1 + models.length) % models.length;
  sessions[chatId].index = index;
  if (data.startsWith('chat_')) {
    const model = data.split('_')[1];
    sessions[chatId] = { model, messageCount: 0, lastActivity: Date.now(), history: [], userName: query.from.first_name };
    const config = getModelConfig(model);
    const emoji = config.emojis[Math.floor(Math.random() * config.emojis.length)];
    const msg = await bot.sendMessage(chatId, `🔗 Connecting with ${model}${emoji}`);
    let dots = '';
    const interval = setInterval(() => {
      dots = dots.length >= 3 ? '' : dots + '.';
      bot.editMessageText(`🔗 Connecting with ${model}${dots} ${emoji}`, {
        chat_id: chatId,
        message_id: msg.message_id
      });
    }, 500);
    setTimeout(() => {
      clearInterval(interval);
      bot.editMessageText(`✅ Connected with ${model}!\n💬 Ask her anything! ${emoji}`, {
        chat_id: chatId,
        message_id: msg.message_id
      });
    }, 2500 + Math.random() * 2500);
    
    // Send analytics notification
    bot.sendMessage(ANALYTICS_GROUP_ID, `📊 User ${query.from.first_name} (${chatId}) started chatting with ${model}.`);

    return;
  }
  showModelCard(chatId, index);
});

bot.on('message', async msg => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  // Update session activity and store user info
  if (!sessions[chatId]) {
    sessions[chatId] = { index: 0, lastActivity: Date.now(), history: [], userName: msg.from.first_name };
  } else {
    sessions[chatId].userName = msg.from.first_name; // Update username in case it's missing
  }
  updateSessionActivity(chatId);

  const session = sessions[chatId];
  session.history.push(text); // Add the user's question to session history

  // Profanity check
  if (profanityList.some(bad => text.toLowerCase().includes(bad))) {
    return bot.sendMessage(chatId, "🚫 Let's keep the chat respectful.");
  }

  const model = session.model;
  if (!model) return bot.sendMessage(chatId, 'Use /start to begin.');

  const config = getModelConfig(model);
  const qa = getQAForModel(model);
  const answer = findAnswer(qa, text);

  // Always send the answer first if available
  if (answer) {
    await simulateTypingDelay(bot, chatId, answer);
    await bot.sendMessage(chatId, answer);
  }

  // Then check for any media keywords and send them all
  const words = text.toLowerCase().split(/\s+/);
  let mediaSent = false;

  for (let word of words) {
    const media = getModelMedia(model, word);
    if (media) {
      try {
        await bot.sendChatAction(chatId, media.type === 'photo' ? 'upload_photo' : 'upload_video');
        const file = fs.readFileSync(media.path);
        if (media.type === 'photo') await bot.sendPhoto(chatId, file);
        else await bot.sendVideo(chatId, file);
        mediaSent = true;
      } catch (err) {
        logError(err);
        await bot.sendMessage(chatId, '❌ Could not send media.');
      }
    }
  }

  // Fallback if no answer and no media
  if (!answer && !mediaSent) {
    const fallback = [
      "I'm not sure about that 😅",
      "Can you ask it another way? 🤔",
      "That's an interesting one! 🤓",
      "Hmm... I’ll get back to you on that!"
    ][Math.floor(Math.random() * 4)];
    await simulateTypingDelay(bot, chatId, fallback);
    await bot.sendMessage(chatId, fallback);
  }

session.messageCount = (session.messageCount || 0) + 1;

if (session.messageCount % 4 === 0) {
  const modelName = session.model || "me"; // Use the model name if available
  const userName = msg.from.first_name || "Friend"; // Personalize with the user's name
  const promoMessages = [
    `🎉 *Hi ${userName}!* Want to connect with ${modelName} directly?\n\n👉 [Click here](https://meetgirls.xyz/${modelName}) to create a free account and send your username here!`,
    `💬 *Hey ${userName}!* Did you know you can chat directly with ${modelName}?\n\n✨ [Sign up now](https://meetgirls.xyz/${modelName}) and share your username with me!`,
    `✨ *Exclusive Access Alert!* Hi ${userName}, join ${modelName} now!\n\n🌟 [Create an account](https://meetgirls.xyz/${modelName}) and let me know your username!`,
    `🌟 *Take our chat to the next level!* Hi ${userName}, create a free account to connect with ${modelName}.\n\n🔗 [Sign up here](https://meetgirls.xyz/${modelName}) and send your username!`
  ];

  // Randomly select a promo message
  const promo = promoMessages[Math.floor(Math.random() * promoMessages.length)];

  // Inline buttons for interactivity (Only the "Sign Up Now" button remains)
  const inlineKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌟 Connect Now", url: `https://meetgirls.xyz/${modelName}` }
        ]
      ]
    },
    parse_mode: "Markdown"
  };

  await simulateTypingDelay(bot, chatId, promo);
  await bot.sendMessage(chatId, promo, inlineKeyboard);
}

  saveSessions();
});

console.log('Enhanced bot is running...');
