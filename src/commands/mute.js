const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff, hasHigherPerms } = require('../utils/isStaff');
const { defineTarget } = require('../utils/defineTarget');
const { defineDuration, defineDurationString } = require('../utils/defineDuration');
const { PrismaClient } = require('@prisma/client');
const { guilds } = require('../config.json');
const { getModChannels } = require('../utils/getModChannels');
const prisma = new PrismaClient();
const colors = require('../utils/embedColors');
const log = require('../utils/log');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mute')
		.setDMPermission(false)
		.setDescription('Mute a user')
		.addStringOption(option => option.setName('user').setDescription('The user to mute.').setRequired(true))
		.addStringOption(option => option.setName('duration').setDescription('The amount of time to mute this user for').setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription('The reason for muting this user').setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply();
		if (!isStaff(interaction, interaction.member, PermissionFlagsBits.ManageMessages)) return sendReply('main', "You're not a moderator, idiot");
		let target = await defineTarget(interaction, 'edit');
		if (target === undefined) {
			return sendReply('error', 'This user does not exist');
		}

		let targetMember;

		try {
			targetMember = await interaction.guild.members.fetch(target);
		} catch (error) {
			if (error.message.toLowerCase().includes('unknown member')) {
				targetMember = false;
			} else {
				targetMember = false;
				log.debug(`failed to fetch member`);
			}
		}
		if (!targetMember) return sendReply('error', 'This user is not a guild member');
		let canDoAction = await hasHigherPerms(interaction.member, targetMember);
		if (!canDoAction) {
			return sendReply('error', 'You or the bot does not have permissions to complete this action');
		}

		let duration = await defineDuration(interaction);
		let durationString = await defineDurationString(interaction);
		let muteDate = new Date();

		let reason = interaction.options.getString('reason') ? interaction.options.getString('reason') : 'no reason provided';

		let aviURL = interaction.user.avatarURL({ extension: 'png', forceStatic: false, size: 1024 })
			? interaction.user.avatarURL({ extension: 'png', forceStatic: false, size: 1024 })
			: interaction.user.defaultAvatarURL;
		let name = interaction.user.username;

		if (targetMember) {
			await targetMember.send(`You have been muted in ${interaction.guild.name} for \`${reason}\`. The length of your mute is ${durationString}.`).catch(e => {
				log.debug("Couldn't send user MUTE message");
			});
		}

		await targetMember.roles
			.add(guilds[interaction.guild.id].muteRoleID)
			.then(m => {
				let muteEmbed = new EmbedBuilder()
					.setTitle(`User Muted`)
					.setColor(colors.success)
					.setDescription(`Successfully muted <@${target}> for ${durationString}. Reason: ${reason}`)
					.setTimestamp()
					.setAuthor({ name: name, iconURL: aviURL });

				interaction.editReply({ embeds: [muteEmbed] });

				let logEmbed = new EmbedBuilder()
					.setColor(colors.main)
					.setTitle('Member Muted')
					.addFields(
						{ name: 'User', value: `<@${target}> (${target})` },
						{ name: 'Reason', value: reason },
						{ name: 'Mute Duration', value: durationString },
						{ name: 'Moderator', value: `${name} (${interaction.user.id})` }
					)
					.setAuthor({ name: name, iconURL: aviURL })
					.setTimestamp();

				if (targetMember) {
					logEmbed.setThumbnail(
						targetMember.avatarURL({ extension: 'png', forceStatic: false, size: 1024 }) ? targetMember.avatarURL({ extension: 'png', forceStatic: false, size: 1024 }) : targetMember.defaultAvatarURL
					);
				}

				getModChannels(interaction.client, interaction.guild.id).main.send({
					embeds: [logEmbed],
					content: `<@${target}>`,
				});
			})
			.catch(e => {
				interaction.editReply(`Could not mute member\n${e}`);
			});

		function sendReply(type, message) {
			let replyEmbed = new EmbedBuilder().setColor(colors[type]).setDescription(message).setTimestamp();

			interaction.editReply({ embeds: [replyEmbed] });
		}

		await prisma.mute.upsert({
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
				startDate: muteDate,
				duration: durationString,
			},
			create: {
				startDate: muteDate,
				userID: target,
				guildId: interaction.guild.id,
				moderator: `${interaction.user.username} (${interaction.user.id})`,
				endDate: duration,
				reason: reason,
				duration: durationString,
			},
		});
		await prisma.warning.create({
			data: {
				userID: target,
				date: muteDate,
				guildId: interaction.guild.id,
				reason: reason,
				moderator: `${interaction.user.username} (${interaction.user.id})`,
				type: 'BAN',
			},
		});
	},
};
