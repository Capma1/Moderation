const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff, hasHigherPerms } = require('../utils/isStaff.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const colors = require('../utils/embedColors');
const { defineTarget } = require('../utils/defineTarget');
const { defineDuration, defineDurationString } = require('../utils/defineDuration');
const { getModChannels } = require('../utils/getModChannels');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('turtlemode')
		.setDMPermission(false)
		.setDescription('Give somebody their own individual slowmode')
		.addStringOption(option => option.setName('user').setDescription('The user to slow down').setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription('Why are you turning them into a turtle').setRequired(true))
		.addStringOption(option => option.setName('interval').setDescription('How often this user is allowed to send a message (Minimum 30s)').setRequired(true))
		.addStringOption(option => option.setName('duration').setDescription('How long should this slowmode last ("forever" for permanent)').setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply();
		if (!isStaff(interaction, interaction.member, PermissionFlagsBits.ManageMessages))
			return interaction.editReply({
				content: "You're not staff, idiot",
				ephemeral: true,
			});

		let target = await defineTarget(interaction, 'edit');

		let targetMember = await interaction.guild.members.fetch(target);
		if (!targetMember) return sendReply('error', 'This user is not a guild member');
		let canDoAction = await hasHigherPerms(interaction.member, targetMember);
		if (!canDoAction) {
			return sendReply('error', 'You or the bot does not have permissions to complete this action');
		}

		let duration = await defineDuration(interaction);
		let durationString = await defineDurationString(interaction);
		let turtleDate = new Date();

		let interval;
		let intervalString = '30 seconds';
		if (!interaction.options.getString('interval')) {
			interval = 30;
		} else {
			let rawInterval = interaction.options.getString('interval');
			if (await isValidDuration(rawInterval)) {
				interval = await durationToSec(rawInterval);
				intervalString = await durationToString(rawInterval);
				if (interval < 30) interval = 30;
			} else {
				interval = 30;
			}
		}

		let reason = interaction.options.getString('reason') ? interaction.options.getString('reason') : 'no reason provided';

		if (targetMember) {
			await targetMember.send(`You have been turtleModed in ${interaction.guild.name} for \`${reason}\`. The length of your turtleMode is ${durationString}.`);
		}

		let aviURL = interaction.user.avatarURL({ format: 'png', dynamic: false }).replace('webp', 'png');
		let name = interaction.user.username;

		let turtleEmbed = new EmbedBuilder()
			.setTitle(`Turned user into a slow little turt`)
			.setColor(colors.success)
			.setDescription(`Successfully initiated slowmode on <@${target}> at an interval of ${intervalString}, for ${durationString}! Reason: ${reason}`)
			.setTimestamp()
			.setAuthor({ name: name, iconURL: aviURL });

		interaction.editReply({ embeds: [turtleEmbed] });

		let logEmbed = new EmbedBuilder()
			.setColor(colors.main)
			.setTitle('Member Turtlemode Activated')
			.addFields(
				{ name: 'User', value: `<@${target}> (${target})` },
				{ name: 'Reason', value: reason },
				{ name: 'Turtlemode Duration', value: durationString },
				{ name: 'Moderator', value: `${name} (${interaction.user.id})` }
			)
			.setAuthor({ name: name, iconURL: aviURL })
			.setTimestamp();

		getModChannels(interaction.client, interaction.guild.id).main.send({
			embeds: [logEmbed],
			content: `<@${target}>`,
		});

		if (duration !== 'infinite') {
			await prisma.turtleMode.upsert({
				where: {
					userID_guildId: {
						userID: target,
						guildId: interaction.guild.id,
					},
				},
				update: {
					moderator: `${interaction.user.username} (${interaction.user.id})`,
					endDate: duration,
					reason: reason,
					startDate: turtleDate,
					interval: interval,
					duration: durationString,
				},
				create: {
					startDate: turtleDate,
					userID: target,
					guildId: interaction.guild.id,
					moderator: `${interaction.user.username} (${interaction.user.id})`,
					endDate: duration,
					reason: reason,
					interval: interval,
					duration: durationString,
				},
			});
		}
		await prisma.warning.create({
			data: {
				userID: target,
				date: turtleDate,
				guildId: interaction.guild.id,
				reason: reason,
				moderator: `${interaction.user.username} (${interaction.user.id})`,
				type: 'SLOWMODE',
			},
		});
	},
};