
const io = require("socket.io-client");
const readline = require('readline');
const clui = require('clui');
const chalk = require("chalk");

module.exports = class base {

  createClient(url) {
    var socket = io.connect('ws://' + url);
    return socket;
  }

  createReadLine(){
    this.rl = readline.createInterface({
      input:process.stdin, 
      output:process.stdout,
      // crlfDelay: Infinity,
      removeHistoryDuplicates: true
    });

    this.rl.on('pause', function() {
      // console.log('暂停输入流...')
    })
  
    this.rl.on('close', function() {
        // process.exit(0);
    });

    this.rl.on('SIGINT', () => {
        this.rl.question('确定要退出吗？(Y/n)', (answer) => {
          if (answer.match(/^y(es)?$/i)) process.exit(0);
          this.rl.prompt();
        });
    });
  }

  init_loading (){
    const Spinner = clui.Spinner;
    this.waiting = new Spinner('waiting... ', ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷']); 
  }

  log (...msg){
    console.log(chalk.keyword('orange')(...msg));
  }

  logHandle (fn) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0)
    fn && fn();
    this.rl.prompt();
  }
    constructor(){
        this.state = {
            msgBox: [
              '你的牌打得太好了',
              '快点吧，我等到花儿也谢了！',
              '不要走，决战到天亮。',
              '和你合作真是太愉快了',
              '你是GG还是MM？',
              '不要吵了，专心玩游戏吧！',
            ],
            msgList: [],//聊天消息
  
            where: 0,//0登录界面 1大厅 2房间,
            posId: '',//座位号
            deskId: '',//桌号
            desks: [],
            client: '',
  
            cards: [],
  
            //房间状态
            roomState: {
              state: 0,//0准备状态 1叫分状态 2打牌状态 3结束状态
              ctxPos: '', //当前该哪个座位谁出牌或叫分 left right or self
              ctxCard: { //上家玩家的牌型
                len: 0,
                key: '',
                type: '',
                ctxPos: ''
              },
              ctxScore: [],
              timeout: 20,
  
            },
            //座位状态
            posState: {
              top: {
                cards: []
              },
              left: {
                state: 0,//0没人，1未准备 2准备
                cards: [],
                ctxCards: [],
                isPass: false,
                isDizhu: false,
                callScore: -1,
                name: '游客'
              },
              right: {
                state: 0,//0没人，1未准备 2准备
                cards: [],
                ctxCards: [],
                isPass: false,
                isDizhu: false,
                callScore: -1,
                name: '游客'
              },
              self: {
                state: 0,//0没人，1未准备 2准备
                cards: [],
                ctxCards: [],
                isPass: false,
                isDizhu: false,
                callScore: -1,
                name: ''
              }
            }
          }
    }
}