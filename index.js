const Discord = require("discord.js");
const { Client, Intents } = require("discord.js");
const bot = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
const fs = require("fs");
const generated = new Set();
const express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
const { FORMERR } = require("dns");

const app = express();
const TOKEN = "NzI0NTI0Mzg3NTk1NzE0NTky.XvBb6w.YObWAQtIYEAARdQPLg7JRnmowBc";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

bot.on("ready", () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

app.get("/getLogs", (req, res) => {
  let logs = JSON.parse(fs.readFileSync("./logs.json", "utf-8"));
  res.json({ success: true, logs: logs });
});

app.get("/accounts", (req, res) => {
  let totalLength = 0;
  let data = JSON.parse(fs.readFileSync("./accounts.json", "utf-8"));
  let logs = JSON.parse(fs.readFileSync("./logs.json", "utf-8"));

  if (data == "" || data == " " || data.length == 0)
    return res.json({ success: true, accsLength: 0, bestService: "None" });

  let services = Object.keys(data);
  let bestService = {
    name: "",
    count: 0,
  };

  for (s of services) {
    totalLength += data[s].length;
    if (data[s].length > bestService.count) {
      bestService.name = s;
      bestService.count = data[s].length;
    }
  }

  res.json({
    success: true,
    accounts: data,
    accsLength: totalLength,
    bestService: bestService.name,
    lastFive: logs.filter((log) => log.type == "gen").slice(0, 5),
  });
});

app.get("/accounts/:id", (req, res) => {
  let account = getAccountById(req.params.id);
  if (account && account != []) res.json({ success: true, account });
  else res.json({ success: false });
});

app.get("/accounts/service/:serviceName", (req, res) => {
  let service = req.params.serviceName;
  let data = fs.readFileSync("./accounts.json", "urf-8");
  if (data[service]) res.json({ success: true, accounts: data[service] });
  else res.json({ success: false });
});

app.get("/today", (req, res) => {
  console.log("today endpoint");
  let today = getToday();
  console.log(today);
  res.json({ success: true, gen: today });
});

app.get("/settings", (req, res) => {
  let settings = JSON.parse(fs.readFileSync("./settings.json", "utf-8"));
  res.json({ success: true, settings: settings });
});

app.get("/users/blocked", (req, res) => {
  let blockedList = JSON.parse(fs.readFileSync("./blocked.json", "utf-8"));
  res.json({ success: true, users: blockedList });
});

app.get("/bestUser", (req, res) => {
  let logs = JSON.parse(fs.readFileSync("./logs.json", "utf-8"));
  try {
    let user = getMostFrequent(logs.map((x) => x.user));
    res.json({ success: true, user });
  } catch {
    res.json({ success: true, user: "None" });
  }
});

app.post("/accounts", (req, res) => {
  try {
    checkAcc(req, res);
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

app.post("/settings", (req, res) => {
  let prefixValue = req.body.prefix;
  let cooldownValue = req.body.cooldown;
  let channelIdValue = req.body.channelId;
  let settings = JSON.parse(fs.readFileSync("./settings.json", "utf-8"));
  settings.prefix = prefixValue;
  settings.cooldown = cooldownValue;
  settings.channelId = channelIdValue;
  console.log(JSON.stringify(settings));
  fs.writeFileSync("./settings.json", JSON.stringify(settings));
  res.json({ success: true });
});

app.post("/users/block", (req, res) => {
  try {
    let user = req.body.user;
    let time = req.body.time;
    console.log(user, time);
    let blockedList = JSON.parse(fs.readFileSync("./blocked.json", "utf-8"));
    blockedList.push({ user, time: addHours(parseInt(time)) });
    fs.writeFileSync("./blocked.json", JSON.stringify(blockedList));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

app.post("/users/unblock", (req, res) => {
  try {
    let user = req.body.user;
    let blockedList = JSON.parse(fs.readFileSync("./blocked.json", "utf-8"));
    blockedList = blockedList.filter(function (el) {
      return el.user != user;
    });

    fs.writeFileSync("./blocked.json", JSON.stringify(blockedList));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

app.put("/accounts/:id", (req, res) => {
  let newValue = req.body.value;
  let service = req.body.service;

  let accountsFile = JSON.parse(fs.readFileSync("./accounts.json", "utf-8"));

  let accounts = accountsFile[service];

  for (let i = 0; i < accounts.length; i++) {
    if (parseInt(accounts[i].id) == parseInt(req.params.id)) {
      accounts[i].value = newValue;
      console.log(accounts);

      fs.writeFileSync("./accounts.json", JSON.stringify(accountsFile));
      return res.json({ success: true });
    }
  }

  res.json({ success: false });
});

function addHours(h) {
  let today = new Date();
  today.setTime(today.getTime() + h * 60 * 60 * 1000);
  //return `${today.getDate()}/${today.getMonth()}/${today.getFullYear()} ${today.getHours()}:${today.getMinutes()}`
  return today;
}

function getAccountById(id) {
  let data = JSON.parse(fs.readFileSync("./accounts.json", "utf-8"));
  let services = Object.keys(data);

  for (s of services) {
    let acc = data[s].filter((x) => parseInt(x.id) == parseInt(id));
    if (acc != [] && acc.length > 0) return { acc, service: s };
  }
  return null;
}
function checkAcc(req, res) {
  let values = req.body.values;
  let service = req.body.service.toLowerCase().trim();
  let path = `./accounts.json`;

  let data = fs.readFileSync(path, "utf-8");

  if (data == "" || data == " ") {
    let newId = Math.floor(100000 + Math.random() * 900000);
    let newAccount = {
      id: newId,
      value: values,
      time: new Date(),
    };
    data = {
      [service]: [newAccount],
    };

    fs.writeFileSync(path, JSON.stringify(data));
    let logs = JSON.parse(fs.readFileSync("./logs.json", "utf-8"));
    logs.unshift({
      type: "add",
      time: new Date(),
      id: newId,
    });
    fs.writeFileSync("./logs.json", logs);
  } else {
    let newId = Math.floor(100000 + Math.random() * 900000);
    let existingsIds = getExistingsIds(path);
    while (existingsIds.includes(newId)) {
      newId = Math.floor(100000 + Math.random() * 900000);
    }

    let newAccount = {
      id: newId,
      value: values,
      time: new Date(),
    };
    data = JSON.parse(data);
    console.log(newAccount);
    if (data[service]) data[service] = [...data[service], newAccount];
    else data[service] = [newAccount];
    console.log(data);
    fs.writeFileSync(path, JSON.stringify(data));
    let logs = JSON.parse(fs.readFileSync("./logs.json", "utf-8"));
    logs.unshift({
      type: "add",
      time: new Date(),
      id: newId,
    });
    fs.writeFileSync("./logs.json", JSON.stringify(logs));
  }
}

function getExistingsIds(path) {
  let data = fs.readFileSync(path, "utf-8");
  let existingIds = [];
  let services = Object.keys(data);
  for (s of services) {
    for (acc of data[s]) {
      existingIds.push(acc.id);
    }
  }

  return existingIds;
}

function getMostFrequent(arr) {
  const hashmap = arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
  for (el of Object.keys(hashmap)) {
    if (el == "undefined") delete hashmap[el];
  }
  return Object.keys(hashmap).reduce((a, b) =>
    hashmap[a] > hashmap[b] && hashmap[a] ? a : b
  );
}

function getToday() {
  let logs = JSON.parse(fs.readFileSync("./logs.json", "utf-8"));
  return logs.filter(
    (log) => log.type == "gen" && formatDate(log.time) == formatDate(new Date())
  ).length;
}
//ya
function formatDate(date) {
  date = new Date(date);
  let day = date.getDate();
  let month = date.getMonth();
  let year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

app.listen(process.env.PORT || 3000),
  () => {
    console.log(`App Running!`);
  };

bot.on("message", async (message) => {
  if (message.author.bot) return;
  let settings = JSON.parse(fs.readFileSync("./settings.json"));
  let blocked = JSON.parse(fs.readFileSync("./blocked.json"));
  let prefix = settings.prefix;
  let cooldown = settings.cooldown;
  let channelId = settings.channelId;
  let messageArray = message.content.split(" ");
  let args = messageArray.slice(1);

  if (!message.content.includes(prefix)) return;
  var command = message.content
    .toLowerCase()
    .slice(prefix.length)
    .split(" ")[0];

  if (command == "gen") {
    for (let b of blocked) {
      if (
        b.user ==
        message.author.username + "#" + message.author.discriminator
      )
        return message.reply("You are blocked! Contact an admin.");
    }
    let accounts = JSON.parse(fs.readFileSync("./accounts.json", "utf-8"));
    let logs = JSON.parse(fs.readFileSync("./logs.json", "utf-8"));

    let services = Object.keys(accounts);
    if (message.channel.id != channelId)
      return message.channel.send(
        "This command can be runned only in the generate channel"
      );

    if (generated.has(message.author.id)) {
      return message.channel.send(
        "Wait before generating another account!. - " + message.author
      );
    }

    if (!args[0]) return message.reply("Please, specify the service you want!");

    let genAccount = accounts[args[0]];

    if (!genAccount) return message.reply("That service does not exists!");

    if (genAccount.length < 1)
      return message.reply(
        "There isn't any available account for that service"
      );

    genAccount = genAccount[0];

    const embed = {
      title: "Account Generated!",
      description: "Check your dm for the account's information!",
      color: 8519796,
      footer: {
        icon_url:
          "https://cdn.discordapp.com/avatars/610140257203126282/af64f47d1c1790af9ad248508bf60c31.png?size=128",
        text: "Bot creator: Silvano#9542",
      },
      thumbnail: {
        url: "http://www.compartosanita.it/wp-content/uploads/2019/02/right.png",
      },
      author: {
        name: "Account Generator",
        url: "https://discordapp.com",
        icon_url: bot.displayAvatarURL,
      },
      fields: [],
    };

    await message.channel.send({ embed });
    await generated.add(message.author.id);

    accounts[args[0]].shift();
    console.log(message.author);
    logs.push({
      type: "gen",
      user: message.author.username + "#" + message.author.discriminator,
      account_id: genAccount.id,
      service: args[0],
      time: new Date(),
    });

    fs.writeFileSync("./logs.json", JSON.stringify(logs));
    fs.writeFileSync("./accounts.json", JSON.stringify(accounts));
    await message.author.send({
      embed: {
        title: "Account information",
        color: 1127848,
        fields: [
          {
            name: "ID",
            value: genAccount.id,
          },
          {
            name: "Service",
            value: args[0],
          },
          {
            name: "Credentials",
            value: genAccount.value,
          },
        ],
      },
    });
    await generated.add(message.author.id);
    setTimeout(() => {
      generated.delete(message.author.id);
    }, cooldown);
  }
  if (command == "stock") {
    let accounts = JSON.parse(fs.readFileSync("./accounts.json", "utf-8"));
    let services = Object.keys(accounts);
    let finalFields = [];
    console.log(accounts["netflix"]);
    console.log(accounts["netflix"].length);
    for (s of services) {
      finalFields.push({
        name: s,
        value: `${accounts[s].length} Accounts`,
        inline: true,
      });
    }

    await message.channel.send({
      embed: {
        title: "Accounts Stock",
        color: 1127848,
        fields: finalFields,
      },
    });
  }
  if (command === "change") {
    if (!message.member.hasPermission("ADMINISTRATOR"))
      return message.reply("Sorry, you can't do it, you are not an admin!");
    let messageArray = message.content.split(" ");
    let args = messageArray.slice(1);
    if (
      args[0] !== "prefix" &&
      args[0] !== "cooldown" &&
      args[0] !== "channelId"
    )
      return message.reply(
        args[0] +
          " is not a valid setting, valid settings are: prefix, cooldown, channelId"
      );

    if (args[0] == "cooldown" && isNaN(args[1]))
      return message.reply(args[1] + " is not a valid number");

    try {
      settings[args[0]] = args[1];
      fs.writeFileSync("./settings.json", JSON.stringify(settings));
      message.reply(args[0] + " changed to " + args[1]);
    } catch {
      message.reply("An error occured");
    }
  }

  if (command == "add") {
    if (!message.member.hasPermission("ADMINISTRATOR"))
      return message.reply("Sorry, you can't do it, you are not an admin!");

    let service = args[0];
    let account = args[1];
    try {
      checkAcc({ body: { service, values: account } });
      return message.reply("Account Added!");
    } catch (err) {
      return message.reply("An Error occurred");
    }
  }

  if (command === "help") {
    if (!message.member.hasPermission("ADMINISTRATOR")) {
      message.channel.send({
        embeds: [
          {
            title: "Commands",
            color: 1127848,
            fields: [
              {
                name: prefix + "gen SERVICENAME",
                value: "generate an account of that service.",
              },
              {
                name: prefix + "stock",
                value: "check the services and the accounts..",
              },
            ],
          },
        ],
      });
    } else {
      message.channel.send({
        embeds: [
          {
            title: "Commands",
            color: 1127848,
            fields: [
              {
                name: prefix + "gen SERVICENAME",
                value: "generate an account of that service.",
              },
              {
                name: prefix + "stock",
                value: "check the services and the accounts..",
              },
              {
                name: prefix + "add SERVICENAME ACCOUNT",
                value: "Add account/code to that service",
              },
              {
                name: prefix + "change OPTION VALUE",
                value:
                  "change prefix,cooldown or channelId to a value, for the cooldown remember that the value must be in ms",
              },
            ],
          },
        ],
      });
    }
  }
});

bot.login(TOKEN);
