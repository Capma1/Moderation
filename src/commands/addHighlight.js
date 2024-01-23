const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../utils/isStaff');
const colors = require('../utils/embedColors');
const log = require('../utils/log');
const prisma = require('../utils/prismaClient');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addhighlight')
		.setDescription('Create a new highlighted phrase to be notified for (not case sensitive)')
		.setDMPermission(false)
		.addStringOption(option => option.setName('phrase').setDescription("The phrase you'd like to highlight").setMaxLength(1_000).setRequired(true))
        .addIntegerOption(option => option.setName('duration').setDescription('Cooldown duration in minutes').setRequired(false)), // optional duration parameter
	async execute(interaction) {
		await interaction.deferReply();
		if (!isStaff(interaction, interaction.member, PermissionFlagsBits.ManageMessages)) return sendReply('main', "You're not a moderator, idiot");

		let phrase = interaction.options.getString('phrase').toLowerCase();
		let duration = interaction.options.getInteger('duration') || 10; // default to 10 minutes if not provided

		let aviURL = interaction.user.avatarURL({ extension: 'png', forceStatic: false, size: 1024 }) || interaction.user.defaultAvatarURL;
		let name = interaction.user.username;

		let msgEmbed = new EmbedBuilder()
			.setTitle(`New Highlight Added`)
			.setColor(colors.main)
			.setDescription(`Created highlight for ${phrase}`)
			.setTimestamp()
			.setAuthor({ name: name, iconURL: aviURL });

		await prisma.highlight
			.create({
				data: {
					phrase: phrase,
					guildId: interaction.guild.id,
					userID: interaction.user.id,
					cooldownDuration: duration, // save the cooldown duration
				},
			})
			.then(r => {
				interaction.editReply({ embeds: [msgEmbed] }).catch(e => {
					interaction.editReply(`Message failed to send:\n${e}`);
				});
			})
			.catch(e => {
				log.error(`Could not create highlight: ${e}`);
			});

		function sendReply(type, message) {
			let replyEmbed = new EmbedBuilder().setColor(colors[type]).setDescription(message).setTimestamp();

			interaction.editReply({ embeds: [replyEmbed] });
		}
	},
};
