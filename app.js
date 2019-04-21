
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");

var mysql = require('mysql');

//Database
var con = mysql.createConnection({
	host: config.db.host,
	user: config.db.user,
	password: config.db.pass,
	database:config.db.database
});

client.on("ready", () => {
	
	con.connect(err => {
		if(err) throw err;
		//console.log("Connected to Db !");

		//Tables
		con.query("CREATE TABLE IF NOT EXISTS user (id VARCHAR(50) PRIMARY KEY, bday DATE, UNIQUE(id))", function (err, result) {
			if (err) throw err;
			//console.log("Database user created");
		});
		con.query("CREATE TABLE IF NOT EXISTS server (id VARCHAR(50) PRIMARY KEY, message VARCHAR(25), events BOOLEAN DEFAULT TRUE, UNIQUE(id))", function (err, result) {
			if (err) throw err;
			//console.log("Database server created");
		});
		con.query("CREATE TABLE IF NOT EXISTS event (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(25), date DATE UNIQUE, image VARCHAR(50), UNIQUE(id))", function (err, result) {
			if (err) throw err;
			//console.log("Database event created");
		});
		con.query("CREATE TABLE IF NOT EXISTS bday (id_user VARCHAR(50), id_server VARCHAR(50), FOREIGN KEY(id_user) REFERENCES user(id) ON DELETE CASCADE, FOREIGN KEY(id_server) REFERENCES server(id) ON DELETE CASCADE)", function (err, result) {
			if (err) throw err;
			//console.log("Database bday created");
		});
		con.query("CREATE TABLE IF NOT EXISTS custom_event (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(25), date DATE, id_server VARCHAR(50), FOREIGN KEY (id_server) REFERENCES server(id) ON DELETE CASCADE, UNIQUE(id))", function (err, result) {
			if (err) throw err;
			//console.log("Database event created");
		});

		//Analytics
		con.query("CREATE TABLE IF NOT EXISTS data_user (id VARCHAR(50) PRIMARY KEY,name VARCHAR(20), bday DATE, joined DATE, UNIQUE(id))", function (err, result) {
			if (err) throw err;
			//console.log("Database event created");
		});
		con.query("CREATE TABLE IF NOT EXISTS data_server (id VARCHAR(50) PRIMARY KEY,name VARCHAR(20), joined DATE, UNIQUE(id))", function (err, result) {
			if (err) throw err;
			//console.log("Database event created");
		});
	});

  // This event will run if the bot starts, and logs in, successfully.
	console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
	
	//Bot text
	client.user.setActivity(`${client.users.size} users`);

	//In case of shutdown and bot added to a server, save that server:
	client.guilds.forEach(function(gld){
		con.query(`INSERT IGNORE INTO server(id, message) VALUES("${gld.id}", 'Happy Birthday to :')`, function (err, rows) {
			if (err) throw err;
		});
		con.query(`INSERT IGNORE INTO data_server(id, name, joined) VALUES("${gld.id}", "${gld.name}", CURDATE())`, function (err, rows) {
			if (err) throw err;
		});
	});
	

	//Wish Bday
	setInterval (function () {
		var d = new Date();
		//console.log(d.getHours());
		if(d.getHours() == 0){

			//Happy birthday
			con.query("SELECT id, YEAR(CURRENT_TIMESTAMP) - YEAR(bday) as age FROM user WHERE DAY(bday) = DAY(CURDATE()) AND MONTH(bday) = MONTH(CURDATE())", function (err, rows) {
				if (err) throw err;
				if(rows.length >= 1){
					client.guilds.forEach(function(gld){
						
						//Check users in server --
						let w_usrs = "";
						rows.forEach(function(row){
							gld.members.forEach(function(m){
								if(row.id == m.id) w_usrs += "> <@"+row.id+"> age "+ row.age + "\n";
							});
						});
						if(w_usrs != ""){
							//Get Message
							con.query(`SELECT message as m FROM server WHERE id=${gld.id}`, function (err, res) {
								if (err) throw err;
								gld.channels.forEach(function(c){
									console.log(w_usrs);
									if(c.name == 'celebration') c.send(res[0].m+ "\n" + w_usrs);
								});
								
							});
						}
						
					});
				}
			});

			//Happy celebration day
			con.query("SELECT e.name, e.date, e.image, s.events FROM event e, server s WHERE DAY(date) = DAY(CURDATE()) AND MONTH(date) = MONTH(CURDATE() AND s.events=1)", function (err, rows) {
				if(err) throw err;
				if(rows.length >= 1){
					client.guilds.forEach(function(gld){
						gld.channels.forEach(function(c){
							if(c.name == 'celebration') {
								if (rows[0].image == '') c.send(`Happy ${rows[0].name}Day  @everyone !`);
								else c.send(rows[0].image);
							}
						});
					});
				}
			});
			//Happy custom celebration day
			con.query("SELECT id_server, name, date FROM custom_event WHERE DAY(date) = DAY(CURDATE()) AND MONTH(date) = MONTH(CURDATE())", function (err, rows) {
				if(err) throw err;
				if(rows.length >= 1){
					rows.forEach(function(d){
						client.guilds.forEach(function(gld){
							if(gld.id == d.id_server){
								gld.channels.forEach(function(c){
									if(c.name == 'celebration') {
										c.send(`Happy ${d.name} Day  @everyone !`);
									}
								});
							}
						});
					});
				}
			});
		}
	}, 10*1000);
	

});


//Join Server ------------------------------------------------------------------
client.on('guildCreate', guild => {
	let defaultChannel = "";
	guild.channels.forEach((channel) => {
		if(channel.type == "text" && defaultChannel == "") {
			if(channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
				defaultChannel = channel;
			}
		}
	})
	//defaultChannel will be the channel object that it first finds the bot has permissions for
	defaultChannel.send(`Hello, I'm CakeBot. Thanks for inviting me i hope you all have good time :smile: !`);

	// Create a new role with data
	if(!guild.roles.exists('name', 'CakeBotModo'))
	guild.createRole({
  	name: 'CakeBotModo',
  	color: 'BLUE',
	})
  .then(role => console.log(`Created new role with name ${role.name} and color ${role.color}`))
	.catch(console.error);
	
	if(!guild.channels.exists('name', 'celebration'))
		guild.createChannel("Celebration")
		.then(role => console.log(`Created new Channel with name celebration`))
		.catch(console.error);
	
  
	con.query(`INSERT IGNORE INTO server(id, message) VALUES("${guild.id}", 'Happy Birthday to :')`, function (err, rows) {
		if (err) throw err;
	});

	con.query(`INSERT IGNORE INTO data_server(id, name, joined) VALUES("${guild.id}", "${guild.name}", CURDATE())`, function (err, rows) {
		if (err) throw err;
	});

	ids = ""
	guild.members.forEach(function(e){
		ids += "'"+e.id+"',";
	});
	ids = ids.slice(0, -1);
	console.log(ids)
	con.query(`SELECT * FROM user WHERE id in (${ids})`, function (err, rows) {
		if (err) throw err;
		if(rows.length >= 1){
			rows.forEach(function(row){
				console.log(row);
				con.query(`SELECT * FROM bday WHERE id_server = ${guild.id} AND id_user = ${row.id}`, function (err, zx) {
					if(err) throw err;
					if(zx.length < 1){
						con.query(`INSERT INTO bday(id_user, id_server) VALUES("${row.id}", "${guild.id}")`, function (err) {
							if (err) throw err;
							console.log("Saved bday");
						});
					}
				});
			});
		}
	});
	
});
//-------------------------------------------------------------------------------

//Member Join ----------------------------------
client.on('guildMemberAdd',member => {
	let defaultChannel = "";
	if(!member.bot){
		member.guild.channels.forEach((channel) => {
			if(channel.type == "text" && defaultChannel == "") {
				if(channel.permissionsFor(member.guild.me).has("SEND_MESSAGES")) {
					defaultChannel = channel;
				}
			}
		})
		console.log(member.guild.id);
		con.query(`SELECT id FROM user WHERE id="${member.id}"`, function (err, rows) {
			if (err) throw err;
			if(rows.length >= 1){
				con.query(`INSERT INTO bday VALUES("${member.id}", "${member.guild.id}")`, function (err, b) {
					if (err) throw err;
				});
			}
		});
		defaultChannel.send(`Hello <@${member.id}> and welcome !`);
	}
});
//----------------------------------------------

//Bot Leave-------------------------------------
client.on('guildDelete', guild =>{
	console.log("Left server "+ guild.name);
});

//Member Leave ----------------------------------
client.on('guildMemberRemove',member => {
	if(!member.bot){
		let defaultChannel = "";
		member.guild.channels.forEach((channel) => {
			if(channel.type == "text" && defaultChannel == "") {
				if(channel.permissionsFor(member.guild.me).has("SEND_MESSAGES")) {
					defaultChannel = channel;
				}
			}
		})
		con.query(`DELETE FROM bday WHERE id_user="${member.id}" AND id_server="${member.guild.id}"`, function (err, rows) {
			if (err) throw err;
			defaultChannel.send(`Goodbye <@${member.id}> We will miss you !`);
		});
	}
});
//----------------------------------------------


client.on("message", async message => {
  if(message.author.bot) return;
  if(message.content.indexOf(config.prefix) !== 0) return;
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  
  //Save bday------------------
  if(command === config.cmd.save_birthday){
		if (/^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/.test(args[0])){
			con.query(`SELECT id FROM user WHERE id="${message.author.id}"`, function (err, rows) {
				console.log(message.author.id)
				if (err) throw err;
				if(rows.length < 1){
					//Inser user
					sql = `INSERT INTO user(id, bday) VALUES ("${message.author.id}", '${args[0]}')`;
					con.query(sql, function (err, rows) {
						if (err) throw err;
						message.channel.send(`Thank you <@${message.author.id}> your birthday is now saved :smiley: !`);
					});
					//Update user with server 
					con.query(`SELECT * FROM bday WHERE id_user="${message.author.id}" AND id_server="${message.guild.id}"`, function (err, checks) {
						if (err) throw err;
						if(checks.length < 1){
							con.query(`INSERT INTO bday VALUES ("${message.author.id}", "${message.guild.id}")`, function (err, rows) {
								if (err) throw err;
							});
						}
					});

				}else{
					//Update user
					sql = `UPDATE user SET bday="${args[0]}" WHERE id='${message.author.id}'`;
					con.query(sql, function (err, rows) {
						if (err) throw err;
						message.channel.send(`<@${message.author.id}> your birthday is updated now :smiley: !`);
					});
					//Update user with server 
					con.query(`SELECT * FROM bday WHERE id_user="${message.author.id}" AND id_server="${message.guild.id}"`, function (err, checks) {
						if (err) throw err;
						if(checks.length < 1){
							con.query(`INSERT INTO bday VALUES ("${message.author.id}", "${message.guild.id}")`, function (err, rows) {
								if (err) throw err;
							});
						}
					});
					
				}
			});
			con.query(`INSERT IGNORE INTO data_user(id, name, bday, joined) VALUES("${message.author.id}", "${message.author.username}", "${args[0]}", CURDATE())`, function (err, rows) {
				if (err) throw err;
			});
		}else{
			message.channel.send(`<@${message.author.id}> would you please enter your date with the following format : yyyy-mm-dd`);
		}
	}

	//Delete Bday--------------
	if(command === config.cmd.remove_birthday){
		con.query(`DELETE FROM user WHERE id='${message.author.id}'`, function (err, rows) {
			if(err) throw err;
			message.channel.send(`<@${message.author.id}> your birthday is now removed :disappointed_relieved: `);
		});
	}


	//Show----------------------
  if(command === config.cmd.show_birthdays){
		con.query(`SELECT u.id, DATE_FORMAT(u.bday, '%Y-%m-%d') as d FROM bday b, user u WHERE b.id_server='${message.guild.id}' AND u.id = b.id_user`, function (err, rows) {
			if (err) throw err;
			if(rows.length < 1){
				message.channel.send(`It seem like no one is saved :/`);
			}else{
				txt = "";
				console.log(rows);
				rows.forEach(function(usr){
					console.log(usr)
					txt += "> <@"+usr.id+"> : "+usr.d+"\n";
				});
				message.channel.send("List of saved birthdays :\n"+txt);
			}
		});
	}

	//Change Message--------------
  if(command === config.cmd.message){
		if(message.member.roles.find("name", "CakeBotModo")){
			if(args.length >= 1){
				txt = args.join(" ");
				txt = txt.replace('"', '');
				txt = txt.replace("'", "");
				con.query(`UPDATE server SET message='${txt}' WHERE id='${message.guild.id}'`, function (err, rows) {
					if (err) throw err;
					message.channel.send("Your message has been saved :thumbsup:");
				});
			}else{
				message.channel.send("Please write someting !\nExemple : !cake message Happy birthday to :");
			}
		}else{
			message.channel.send("Sorry but you don't have the permission to this command :sweat_smile:");
		}
	}



	//Events--------------------
	//---Add-Event--------------
  if(command === config.cmd.save_event){
		if(message.member.roles.find("name", "CakeBotModo")){
			if(args.length >= 1){
				if(/^((0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/.test(args[0])){
					the_date = args[0];
					dats = the_date.split('-');
					the_name = args;
					the_name.shift();
					the_name = the_name.join(" ");
					the_name = the_name.replace("'", "");
					the_name = the_name.replace('"', "");
					//Check if date exist
					con.query(`SELECT * FROM custom_event WHERE id_server='${message.guild.id}' AND DAY(date)='${dats[1]}' AND MONTH(date)='${dats[0]}'`, function (err, rows) {
						if (err) throw err;
						if(rows.length < 1){
							//Insert if not exist
							con.query(`INSERT INTO custom_event(name, date, id_server) VALUES("${the_name}", '2000-${the_date}', "${message.guild.id}")`, function (err, rows) {
								if (err) throw err;
								message.channel.send("Your event has been saved :thumbsup:");
							});
						}else{
							//Update if exist
							con.query(`UPDATE custom_event SET name="${the_name}" WHERE id_server="${message.guild.id}" AND DAY(date)='${dats[1]}' AND MONTH(date)='${dats[0]}'`, function (err, rows) {
								if (err) throw err;
								message.channel.send("Your event has been updated :thumbsup:");
							});
						}
					});
				}else{
					message.channel.send("Please check the format of the date !\nExemple : !cake event add 01-30 EventName");
				}
			}else{
				message.channel.send("Please write in correct format !\nExemple : !cake event add 01-30 EventName");
			}
		}else{
			message.channel.send("Sorry but you don't have the permission to this command :sweat_smile:");
		}
	}

	//---Add-Event--------------
  if(command === config.cmd.remove_event){
		if(message.member.roles.find("name", "CakeBotModo")){
			if(args.length >= 1){
				the_name = args.join(" ");
				con.query(`DELETE FROM custom_event WHERE name="${the_name}" AND id_server=${message.guild.id}`, function (err, rows) {
					if (err) throw err;
					message.channel.send(`Your event ${the_name} has been removed :thumbsup:`);
				});
			}else{
				message.channel.send("Please write in correct format !\nExemple : !cake remove_event EventName");
			}
		}else{
			message.channel.send("Sorry but you don't have the permission to this command :sweat_smile:");
		}
	}

	//Show Events--------------
  if(command === config.cmd.show_server_events){
		con.query(`SELECT name, MONTHNAME(date) as m, DAY(date) as d FROM custom_event WHERE id_server='${message.guild.id}'`, function (err, rows) {
			if (err) throw err;
			if(rows.length < 1){
				message.channel.send("There is no Event for this server right now :frowning: ");
			}else{
				let txt = "List of events of "+message.guild.name +" :\n";
				rows.forEach(function(e){
					txt += "> "+e.m +"-"+e.d+ " : " + e.name + " .\n";
				});
				message.channel.send(txt);
			}
		});
	}

	//Trigger Events------
	if(command === config.cmd.activate_events){
		let statut;
		con.query(`SELECT events FROM server WHERE id='${message.guild.id}'`, function (err, rows) {
			if (err) throw err;
			statut = rows[0].events;
		});
		con.query(`UPDATE server SET events = NOT events WHERE id='${message.guild.id}'`, function (err, rows) {
			if (err) throw err;
			let st;
			if (statut === 0) st = "activated";
			else st = "deactivated"
			message.channel.send(`Global events are now ${st}.`);
		});
	}

	//Help--------------
  if(command === config.cmd.help){
		
		const embed = new Discord.RichEmbed()
  .setTitle("CakeBot !")
  .setAuthor("Firyox", "https://i.imgur.com/lm8s41J.png")
  .setColor(0x00AE86)
  .setDescription("CakeBot is a discord bot that will allow you to wish happy birthdays and happy events (Christmas, Eid, etc.) to your friends on discord servers.")
  .setThumbnail(config.other.thumb)
  .setTimestamp()
  .setURL(config.other.url)
  .addField("All users", ">!cake bdays : Show list of saved birthdays on this server.\n>!cake save yyyy-mm-dd : To save your birthday.\n>!cake remove : Remove your birthday.\n>!cake server_events : Show server's events.", true)
	.addField("Modos", ">!cake message yourMessage: Change the wishing birthday.\n>!cake save_event mm-dd eventName: Save an event.\n>!cake remove_event eventName : Remove the event.\n>!cake trigger_events : To activate/deactivate global events.\n>!cake help : Show this menu of help.\n", true)
	.addField("You should have the CakeBotModo for Modo commands, check roles.","You can support the project's costing  here : https://www.patreon.com/mrbot", true);
  message.channel.send({embed});
	}

});

client.login(config.token);