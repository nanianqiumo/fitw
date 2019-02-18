  
const chalk = require("chalk");
const figlet = require("figlet");

// files
const socket_events = require("./socket-events");
const _handle = require("./handle");


module.exports = async () => {
    console.log(
      chalk.green(
        figlet.textSync("Fitw", {
          font: "Ghost",
          horizontalLayout: "default",
          verticalLayout: "default"
        })
      )
    );
    await socket_events(new _handle("localhost:8001"));
}
  



