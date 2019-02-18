
const _inquirer = require("enquirer");
const inquirer = new _inquirer();
const _ = require("loadsh");
const base = require("./base");
const clui = require('clui');
const program = require('commander')
const yargs = require('yargs-parser')
const cardsVer = require('./cards');
const chalk = require("chalk");
const figlet = require("figlet");

module.exports = class handle extends base {
    
    constructor(uri){
        super();
        this.startTimer = this._startTimer();
        this.init_loading();
        this.client = this.createClient(uri);
        this.login_name();
    }
    // 房间输入流
    room (){
        console.log(`您已进入${this.state.deskId}号桌子,输入「ready」进入准备状态吧`);
        console.log(`键入「help」来获取帮助`);
        this.roomHandle();
    }

    roomHandle () {
        const rl = this.rl;
        rl.setPrompt('房间> ');
        rl.prompt();
        const that = this;
        rl.removeAllListeners('line');
        rl.on('line', async function(line) {

            const cmd = yargs(line)
            switch(cmd._.shift()) {
                case 'ready':
                    prepare();
                    rl.prompt();
                    break;
                case 'quit':
                    that.waiting.start();
                    that.client.emit('UNSITDOWN');
                    break;
                case 'msg':
                    rl.close();
                    await sendMessage(cmd._.splice(''));
                    that.createReadLine();
                    that.roomHandle();
                    break;
                case 'play':
                    that.playCards(cmd._.join(""));
                    rl.prompt();
                    break;
                case 'pass':
                    that.passCards();
                    break;
                case 'show':
                    that.showRoom();
                    break;
                case 'help':

                    rl.prompt();
                    break;
                case '.exit':
                    process.exit(0);
                    break;
                default:
                    console.log('没有找到命令！');
                    rl.prompt();
                    break;
            }
            
        });

       const prepare =  () => {
            if (this.state.posState.self.state != 1) {
                console.log(`无效的准备`);
                return
            }
            this.client.emit('PREPARE');
       }


       const sendMessage = async (msg) => {
          if (msg.length) {
            this.client.emit('USER_MESSAGE', msg);
          } else {
            const { MESSAGE } = await inquirer.prompt([{
                type: "select",
                name: "MESSAGE",
                message: "选择一条消息",
                choices: this.state.msgBox,
            }]);
            this.client.emit('USER_MESSAGE', MESSAGE);
          }
       }
    }
    hall (){
        this.createReadLine();
        console.log('键入「help」 获取帮助，快来加入房间吧～');
        this.hallHandle();
    }
    // 大厅输入流
    hallHandle (){

        const rl = this.rl;
        rl.setPrompt('大厅> ');
        rl.prompt();
        const that = this;
        rl.removeAllListeners('line');
        rl.on('line', function(line) {
            const cmd = yargs(line)
            switch(cmd._.shift()) {
                case 'quick-join':
                    that.client.emit('QUICK_JOIN');
                    that.waiting.start();
                    break;
                case 'show':
                    that.showDesks();
                    rl.prompt();
                    break;
                case 'join':
                    that.client.emit('SITDOWN', { deskId: cmd._.shift(), posId: cmd._.shift() });
                    that.waiting.start();
                    break;
                case 'help':
                    that.hall_help();
                    rl.prompt();
                    break;
                case '.exit':
                    process.exit(0);
                    break;
                default:
                    console.log('没有找到命令！');
                    rl.prompt();
                    break;
            }
            
        });


    }

    showRoom(){
        if (this.state.roomState.state != 2){
            const state = function (state,name) {
                switch (state){
                    case 0:
                        return '无人';
                    case 1:
                        return `「${name}」 未准备`;
                    case 2:
                        return `「${name}」 已准备`;
                    default:
                        console.error("出问题了",state);
                }
            }
            this.log(`上家: ${state(this.state.posState.left.state,this.state.posState.left.name)}`);
            this.log(`下家: ${state(this.state.posState.right.state,this.state.posState.right.name)}`);
        } else if (this.state.roomState.state === 2) {
            this.log(`地主是 「${this.state.posState.self.isDizhu ? this.state.posState.self.name :
                 this.state.posState.right.isDizhu ? "下家" : "上家" }」`);
            this.log(`上家「${this.state.posState.left.name}」: 还有${this.state.posState.left.cards.length}张牌`);
            this.log(`下家「${this.state.posState.right.name}」: 还有${this.state.posState.right.cards.length}张牌`);
            this.log(`明牌是: ${this.reTransCards(this.state.posState.top.cards.map( v=> v.value)).join(" ")}`);
            this.log(`我的手牌:${this.reTransCards(this.state.posState.self.cards.map(v=>v.value)).join(' ')}`);
            
        }
        this.rl.prompt();
    }

    updateHouseStatus (deskId, posId, state) {
        const pos = this.getPos(deskId, posId);
        if (pos) {
          pos.state = state;
        }
    }

    // 重写
    getPos (deskId, posId) {
        const desk = this.getDesk(deskId);
        if (desk) {
          for (let i = 0, len = desk.positions.length; i < len; i++) {
            const pos = desk.positions[i];
            if (pos.posId === posId) {
              return pos;
            }
          }
        }
        return null;
    }

    // 重写
    getDesk (deskId) {
        for (let i = 0, len = this.state.desks.length; i < len; i++) {
          const desk = this.state.desks[i];
          if (desk.deskId === deskId) {
            return desk;
          }
        }
        return null;
    }

    updatePosStatus (posId, state, name) {
        var direct = this.getDirectionByPosId(posId);
        this.state.posState[direct].state = state;
        if (name) {
          this.state.posState[direct].name = name;
        }
        this.state.posState[direct].isDizhu = false;
        this.startTimer(false);
      }

    _startTimer () {
        let timer = null;
        const self = this;
        return function (fn) {
            const Spinner = clui.Spinner;
            const countdown = new Spinner(`Exiting in ${self.state.roomState.timeout} seconds...  `);
            
            if (timer) {
                clearInterval(timer);
                countdown.stop();
                timer = null;
                if (!fn) {
                    return;
                }
            }
            // countdown.start();

            timer = setInterval(function () {
                self.state.roomState.timeout--;
                countdown.message('Exiting in ' + self.state.roomState.timeout + ' seconds...  ');
                if (self.state.roomState.timeout <= 0) {
                    clearInterval(timer);
                    countdown.stop();
                    timer = null;
                    self.state.roomState.timeout = 0;
                    fn && fn.call(self);
                }
            }, 1000)

        }
    }

    //通过posId获取是哪个方向的坐位
    getDirectionByPosId (posId) {
        var mapping = {
            0: {
            0: 'self',
            1: 'right',
            2: 'left',
            3: 'top',
            },
            1: {
            1: 'self',
            2: 'right',
            0: 'left',
            3: 'top',
            },
            2: {
            2: 'self',
            0: 'right',
            1: 'left',
            3: 'top',
            }

        }
        return mapping[this.state.posId][posId];
    }

    



    hall_help (){
        console.log("帮助信息还没写");
    }
    
    

    async login_name(){
        const questions = [
            {
                name: "LOGINNAME",
                type: "input",
                message: "What's your name?"
            }
        ];
        const { LOGINNAME } = await inquirer.prompt(questions);
        this.client.emit('LOGIN', LOGINNAME);
        this.waiting.start();
    }

    showDesks(){
        let context = '';
        this.state.desks.map( d => {
            context += `\n-----------------------\n${d.deskId} state:${d.state}\n${d.positions.map(p=>{
                    return `pos:${p.posId} state:${p.state}  ${p.state ? p.userName : ''}\n`
                })}`;
        })
        console.log(context);
    }

    // TODO: 废弃
    // async select_room(){
    //     const desks = this.state.desks;
    //     const deskIds = desks.map(v=>String(v.deskId));
    //     const questions = [
    //         {
    //             type: "list",
    //             name: "ROOM",
    //             message: "你要进入哪个房间？",
    //             choices: deskIds,
    //             filter: function(val) {
    //             return val;
    //             }
    //         }
    //     ];
    //     const { ROOM } = await inquirer.prompt(questions);
    //     const seat = [
    //         {
    //             type: "list",
    //             name: "SEAT",
    //             message: "选择一个座位",
    //             choices: _.find(desks, v => v.deskId == ROOM).positions.map(v=>String(v.posId)),
    //             filter: function(val) {
    //             return val;
    //             }
    //         }
    //     ];
    //     const { SEAT } = await inquirer.prompt(seat);
    //     this.client.emit('SITDOWN', { deskId: parseInt(ROOM), posId: parseInt(SEAT) });
    // }

    // 重做, 应该是只返回我自己的牌
    initCards (cards) {
        const that = this;
        cards.forEach(function (cardGroup, index) {
        //   cardGroup.cards.forEach(function (card) {
        //     card.selected = false;
        //   });
          const posId = cardGroup.id;
          const redirection = that.getDirectionByPosId(posId);
          that.state.posState[redirection].cards = cardGroup.cards;
        });
    }

    updateCtxInfo (data) {
        const ctx = data;
        const direction = this.getDirectionByPosId(ctx.ctxPos);
        ctx.ctxPos = direction;
        this.state.roomState.ctxPos = ctx.ctxPos;
        this.state.roomState.ctxScore = ctx.ctxScore;
        this.state.roomState.timeout = ctx.timeout;
        if (ctx.calledScores) {
          for (let key in ctx.calledScores) {
            if (ctx.calledScores.hasOwnProperty(key)) {
              const posId = Number(key);
              const direct = this.getDirectionByPosId(posId);
              this.state.posState[direct].callScore = ctx.calledScores[key];
            }
          }
        }
        const that = this;
        this.startTimer(function () {
          if (that.state.roomState.ctxPos == 'self') {
            that.callScore(0);
          }
        });
    }

    async selectCallScore (data){
        if(data.ctxPos === 'self') {
            this.rl.close();
            const option = this.state.roomState.ctxScore.map(v => String(v));
            const action = data.ctxScore.length == 3 ? '叫' : '抢';
            option.push(`不${action}`);
            const questions = [
                {
                    type: "select",
                    name: "SCORE",
                    message: `${action}地主～`,
                    choices: option,
                }
                ];
            const { SCORE } = await inquirer.prompt(questions);
            this.callScore(SCORE.length == 2 ? 0 : SCORE);
            this.createReadLine();
            this.roomHandle();
        }

    }
 
    // 叫分
    callScore (score) {
        this.state.posState.self.callScore = score;
        this.state.roomState.ctxPos = '';
        this.client.emit('CALL_SCORE', { score: score });
      }

      getSelectdCards () {
        return this.state.posState.self.cards.filter(function (card) {
          return card.selected;
        });
      }

      getCardIndex (pos, card) {
        const cards = this.state.posState[pos].cards;
        for (let i = 0, len = cards.length; i < len; i++) {
          const item = cards[i];
          if (card.value === item.value && card.type === item.type) {
            return i;
          }
        }
        return -1;
      }

      // TODO: 重写 ，不需要修改其他人的牌
      removeCards (pos, cards) {
        const that = this;
        cards.forEach(function (card) {
          const index = that.getCardIndex(pos, card);
          if (index !== -1) {
            that.state.posState[pos].cards.splice(index, 1);
          }
        });
      }


      playCards (cards) {
        if (this.state.roomState.state !== 2) {
          return;
        }
        if (this.state.roomState.ctxPos !== 'self') {
            console.log('未到出牌时间');
            return
        }
        const selectcards = this.selectCards(cards);
        const ret = cardsVer.validate(selectcards);
        if (!ret.status) {
          return console.log('你选的牌不符合规则');
        }

        this.client.emit('PLAY_CARD', selectcards);
      }

      transCards (num){
        switch(num){
        case "t":
        case "T":
        case "0":
            return 10;
        case "j":
        case "J":
            return 11;
        case "q":
        case "Q":
            return 12;
        case "k":
        case 'K':
            return 13;
        case "1":
        case "a":
        case "A":
            return 14;
        case "2":
            return 15;
        case "s":
        case "S":
            return 16;
        case "x":
        case "X":
            return 17;
        default:
            return num;
        }
    }

    reTransCards(cards){
        return cards.map(card => {
            switch (card) {
                case 11:
                    return 'J';
                case 12:
                    return "Q";
                case 13:
                    return "K";
                case 14:
                    return "A";
                case 15:
                    return "2";
                case 16:
                    return "S";
                case 17:
                    return "X";
                default:
                    return String(card);
            }
        })
    }

      selectCards (cards){
        const that = this;
        const arr = String(cards).trim().split('').map( v=> that.transCards(v))
        const res = arr.map( v => {
            return _.find(that.state.posState.self.cards, function(card) { 
                if(v == card.value && !card.is){
                    card.is = true;
                    return true;
                }
                return false;
            })
        });
        this.state.posState.self.cards.forEach( v => v.is = false);
        return res.filter( a => a);

      }
      

      //不出
      passCards () {
        this.client.emit('PLAY_CARD', [])
      }

    // TODO: 自动出牌是每次打第一张牌或者pass
      autoPlayCards () {
        if (this.state.roomState.ctxPos === 'self') {
            console.log("自动出牌");
          const cards = this.state.roomState.ctxCard.ctxPos === 'self' ? [this.state.posState.self.cards[0]] : [];
          this.client.emit('PLAY_CARD', cards);
        }
      }

    resetRoomStatus () {
        this.state.where = 1;
        this.state.posId = '';
        this.state.deskId = '';
        this.state.posState.self.state = 0;
        this.state.roomState.state = 0;
        this.state.posState.left.callScore = -1;
        this.state.posState.right.callScore = -1;
        this.state.posState.self.callScore = -1;
    }
}
