const { SlashCommandBuilder, ModalBuilder, LabelBuilder, CheckboxGroupBuilder } = require('discord.js');
const queryRetry = require("../../queryRetry.js");

module.exports = { 
    data: new SlashCommandBuilder().setName('setreminders').setDescription('Sends list of reminders'), 
    async execute(interaction) {
        try {
            const reminderStore = new Set((await queryRetry("SELECT * FROM reminder_store")).map(row => row.reminder));
            const reminderModal = new ModalBuilder().setCustomId("reminderModal").setTitle("Set Reminders");
            const reminderCheckbox = new CheckboxGroupBuilder().setCustomId("reminderCheckbox").setRequired(false).addOptions([
                { label: "Drug", value: "drug", default: reminderStore.has("drug") },
                { label: "Energy", value: "energy", default: reminderStore.has("energy") },
                { label: "Nerve", value: "nerve", default: reminderStore.has("nerve") },
                { label: "Race", value: "race", default: reminderStore.has("race") },
                { label: "Shoplifting", value: "shoplifting", default: reminderStore.has("shoplifting") },
            ]);
            const reminderLabel = new LabelBuilder().setLabel("Select Reminders").setCheckboxGroupComponent(reminderCheckbox);
            reminderModal.addLabelComponents(reminderLabel);
            return await interaction.showModal(reminderModal);
        }
        catch(e) {
            console.log(e);
            return await interaction.reply("Error while setting reminders", e);
        }
    },
};