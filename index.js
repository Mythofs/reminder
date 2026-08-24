const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../private/.env') });
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const safeFetch = require("./safeFetch.js");
const reminderCache = require("./reminderCache.js");
const queryRetry = require("./queryRetry.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for(const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    for(const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if('data' in command && 'execute' in command)
            client.commands.set(command.data.name, command);
        else
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for(const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if(event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    }
    else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

let channel;

client.once('clientReady', async () => {
    try {
        await queryRetry("CREATE TABLE IF NOT EXISTS reminder_store (reminder VARCHAR(255))");
        await setUp();
        console.log("Setup complete");
    }
    catch(e) {
        console.log("Error setting up");
        await channel.send("Error setting up");
    }
});

client.login(process.env.TOKEN).catch(async(e) => {
    console.log("Error logging into discord", e);
});

async function setUp() {
    try {
        await checkReminders();
        setInterval(async() => {
            await checkReminders();
        }, 30000)
    }
    catch(e) {
        console.log(e);
        await channel.send("Error setting up " + e);
    }
}
async function checkReminders() {
    try {
        const reminderStore = new Set((await queryRetry("SELECT * FROM reminder_store")).map(row => row.reminder));
        if(reminderStore.size > 0) {
            const playerData = await safeFetch(`https://api.torn.com/user/?selections=profile,icons,bars&key=${process.env.API_KEY}&comment=ReminderBot`);
            if(!playerData) return;
            if(reminderStore.has("drug")) {
                if(!("icon49" in playerData.icons) && !("icon50" in playerData.icons) && !("icon51" in playerData.icons) && !("icon52" in playerData.icons) && !("icon53" in playerData.icons)) {
                    if(!reminderCache.has("drug")) {
                        await channel.send({
                            content: `@everyone | Drug cooldown ended | [Items](https://www.torn.com/item.php)`,
                            allowedMentions: { parse: ["everyone"] },
                        });
                        reminderCache.add("drug");
                    }
                }
                else
                    reminderCache.delete("drug");
            }
            if(reminderStore.has("energy")) {
                if(playerData.energy.current === playerData.energy.maximum) {
                    if(!reminderCache.has("energy")) {
                        await channel.send({
                            content: `@everyone | Energy bar full | [Gym](https://www.torn.com/gym.php)`,
                            allowedMentions: { parse: ["everyone"] },
                        });
                        reminderCache.add("energy");
                    }
                }
                else
                    reminderCache.delete("energy");
            }
            if(reminderStore.has("nerve")) {
                if(playerData.nerve.current === playerData.nerve.maximum) {
                    if(!reminderCache.has("nerve")) {
                        await channel.send({
                            content: `@everyone | Nerve bar full | [Crimes](https://www.torn.com/page.php?sid=crimes#/)`,
                            allowedMentions: { parse: ["everyone"] },
                        });
                        reminderCache.add("nerve");
                    }
                }
                else
                    reminderCache.delete("nerve");
            }
            if(reminderStore.has("race")) {
                if(!("icon17" in playerData.icons)) {
                    if(!reminderCache.has("race")) {
                        await channel.send({
                            content: `@everyone | Race ended | [Race](https://www.torn.com/page.php?sid=racing)`,
                            allowedMentions: { parse: ["everyone"] },
                        });
                        reminderCache.add("race");
                    }
                }
                else
                    reminderCache.delete("race");
            }
        }
    }
    catch(e) {
        console.log(e);
        await channel.send("Error checking reminders " + e);
    }
}