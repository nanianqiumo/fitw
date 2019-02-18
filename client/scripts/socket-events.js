const chalk = require("chalk");
const figlet = require("figlet");
const readline = require("readline");

module.exports = function(handle){
    const client = handle.client;
    const state = handle.state;

    const log = (...msg) => {
      const warning = chalk.keyword('orange');
      handle.logHandle( () => {console.log(warning(...msg))});
    }
    
    const logErr = (...err) => {
      handle.logHandle( () => {console.error(chalk.bold.red(...err))});
    }

    const logInfo = (...info) => {
      handle.logHandle( () => {console.info(chalk.green(...info))});
    }

    client.on('MESSAGE', function (data) {
      log(data.msg);
      log("MESSAGE");
    });


    client.on('LOGIN_SUCCESS', async function (data) {
      state.desks = data;
      state.where = 1;
      handle.waiting.stop();
      await handle.hall();
    });

    client.on('LOGIN_FAIL', function (data) {
      handle.waiting.stop();
      console.error(chalk.bold.red(data.msg));
      handle.login_name();
    });


    client.on('QUICK_JOIN', function (data) {
      if (data.success) {
        client.emit('SITDOWN', { deskId: data.deskId, posId: data.posId })
      } else {
        handle.waiting.stop();
        log('快速加入失败');
      }
    });


    client.on('SITDOWN_SUCCESS', function (data) {
      handle.state.where = 2;
      handle.state.posId = data.posId;
      handle.state.deskId = data.deskId;
      data.posInfos.forEach(function (pos) {
        handle.updatePosStatus(pos.posId, pos.state, pos.userName);
      })
      state.posState.self.state = 1;
      state.posState.self.name = "你";
      state.posState.self.isDizhu = false;
      handle.waiting.stop();
      // logInfo('SITDOWN_SUCCESS',data);
      handle.room();

    });

    client.on('SITDOWN_ERROR', function (data) {
      handle.waiting.stop();
      logErr(data.msg);
      handle.hallHandle();
    });


    client.on('UNSITDOWN_SUCCESS', function (data) {
      handle.resetRoomStatus(state);
      state.desks = data;
      handle.waiting.stop();
      handle.hallHandle();
    });

    client.on('REFRESH_LIST', function (data) {
      state.desks = data;
      // log(`REFRESH_LIST`,data);
    });

    client.on('STATUS_CHANGE', function (data) {
      handle.updateHouseStatus(data.deskId, data.posId, data.state);
      log(`有玩家${data.state ? '加入': "退出"}了${data.deskId}号桌${data.posId}号座`);
      // console.info('STATUS_CHANGE',data);
    });

    client.on('POS_STATUS_CHANGE', function (data) {
      handle.updatePosStatus(data.posId, data.state, data.userName);
      if(data.userName){
        const msg = data.state ? `玩家「${data.userName}」进入了${data.posId}号座位` : `${data.posId}号座位的玩家离开了房间`;
        log(msg);
      }else{
        const msg = data.state == 2 ? `${data.posId}号座已准备` : `${data.posId}号座位取消准备`;
        log(msg);
      }
      // log('POS_STATUS_CHANGE',data)
    });

    client.on('POS_STATUS_RESET', function (data) {
      data.pos.forEach(function (pos) {
        handle.updatePosStatus(pos.posId, data.state);
      });
      // logErr('POS_STATUS_RESET',data)
    });

    client.on('ROOM_STATUS_CHANGE', function (data) {
      state.roomState.state = data.state;
      // log('ROOM_STATUS_CHANGE',data)
    });

    client.on('FORCE_EXIT_EV', function (data) {

      state.roomState.state = 3;
      state.posState.left.callScore = -1;
      state.posState.right.callScore = -1;
      state.posState.self.callScore = -1;

      const direct = handle.getDirectionByPosId(data.posId);
      state.posState[direct].ctxCards = [];
      state.posState[direct].cards = [];
      handle.startTimer(false);
      logErr(`「${state.posState[direct].name}」玩家逃跑了,游戏结束！`);
      // log('FORCE_EXIT_EV',data);

    });

    client.on('PREPARE_SUCCESS', function (data) {
      state.posState.self.state = 2;
      // console.info('PREPARE_SUCCESS',data);
    });

    //游戏开始  TODO:重做 写的什么玩意？！
    client.on('GAME_START', function (data) {
      state.roomState.state = 1;
      handle.initCards(data.cards);
      state.posState.left.callScore = -1;
      state.posState.right.callScore = -1;
      state.posState.self.callScore = -1;

      state.posState.left.isPass = false;
      state.posState.right.isPass = false;
      state.posState.self.isPass = false;

      state.posState.left.isDizhu = false;
      state.posState.right.isDizhu = false;
      state.posState.self.isDizhu = false;

      state.posState.left.ctxCards = [];
      state.posState.right.ctxCards = [];
      state.posState.self.ctxCards = [];

      // log('GAME_START',data)
      log(chalk.green('游戏开始～～～'));

    });


    //叫分事件
    client.on('CTX_USER_CHANGE', function (data) {
      if(data.calledScores){
        for (let key in data.calledScores) {
          const posId = Number(key);
          const direct = handle.getDirectionByPosId(posId);
          if(state.posState[direct].callScore != data.calledScores[key]) {
              log(`${state.posState[direct].name}:${ !data.calledScores[key] ? '不抢' : '抢地主 '+data.calledScores[key]+'分' }`);
          }
        }
        // this.state.posState[direct].callScore
      }
      handle.updateCtxInfo(data);
      log(`请「${state.posState[data.ctxPos].name}」 ${ data.calledScores ? '抢' : '叫'}地主`);
      
      // if(data.ctxPos === 'self') {
        handle.selectCallScore(data);
      // }


      // console.info("CTX_USER_CHANGE",data)
    });

    //显示底牌事件
    client.on('SHOW_TOP_CARD', function (data) {
      state.roomState.state = 2;
      const direct = handle.getDirectionByPosId(data.dizhuPosId);
      if (direct == 'self') {
        data.topCards.forEach(function (card) {
          card.selected = true;
        })
      }
      state.posState[direct].cards = state.posState[direct].cards.concat(data.topCards).sort(function (a, b) {
        return a.value - b.value;
      });
      state.posState.top.cards = data.topCards;
      state.roomState.ctxPos = direct;
      state.posState[direct].isDizhu = true;
      state.roomState.timeout = data.timeout;
      handle.startTimer(handle.autoPlayCards);
    });



    client.on('CTX_PLAY_CHANGE', function (data) {
      const direct = handle.getDirectionByPosId(data.ctxData.posId);
      state.posState[direct].ctxCards = data.ctxData.cards;
      state.posState[direct].isPass = data.isPass;
      if (!data.isPass) {
        state.roomState.ctxCard.len = data.ctxData.len;
        state.roomState.ctxCard.key = data.ctxData.key;
        state.roomState.ctxCard.type = data.ctxData.type;
        state.roomState.ctxCard.ctxPos = direct;
      }
      handle.removeCards(direct, data.ctxData.cards);
      state.roomState.ctxPos = handle.getDirectionByPosId(data.posId);
      state.posState[state.roomState.ctxPos].isPass = false;
      state.roomState.timeout = data.timeout;
      if( !state.posState[direct].isPass && !data.ctxData.cards.length) {
        handle.showRoom();
      } else {

        // 封装纸牌图案 🃏
        logInfo(`「${state.posState[direct].name}」:${state.posState[direct].isPass ? '不出' : handle.reTransCards(data.ctxData.cards.map(v => v.value)).join(' ') }`);
      }

      //如果是自己出牌就清空上一轮自己出的牌
      if (state.roomState.ctxPos === 'self') {
        state.posState.self.ctxCards = [];
        logErr("轮到我出牌了");
        log(`手牌:${handle.reTransCards(state.posState.self.cards.map(v=>v.value)).join(' ')}`);
      }
      handle.startTimer(handle.autoPlayCards);
      handle.rl.prompt();
      // console.info('CTX_PLAY_CHANGE',data);

    });

    client.on('PLAY_CARD_ERROR', function (data) {
      logErr('你的牌不符合规则');
      // console.info('PLAY_CARD_ERROR',data);
    })

    client.on('PLAY_CARD_SUCCESS', function (cards) {
      handle.removeCards('self', cards);
      state.posState.self.ctxCards = cards;
      // console.info('PLAY_CARD_SUCCESS',cards);
    })

    client.on('GAME_OVER', function (data) {
      const msg = data.winner.indexOf(state.posId) > - 1 ? '恭喜你，你赢了' : '很遗憾，你输了';

      const score = data.score * data.ratio * 2;
      log(msg);
      log("本局游戏统计如下：")
      data.winner.forEach(function (id) {
        const direct = handle.getDirectionByPosId(id);
        log(`赢家：${state.posState[direct].name} (+${score / data.winner.length})分`);
      });
      data.loser.forEach(function (id) {
        const direct = handle.getDirectionByPosId(id);
        log(`输家：${state.posState[direct].name} (-${score / data.loser.length})分`);
      });



      handle.startTimer(false);//停止计时器
      state.roomState.state = 3;

      state.posState.left.state = 1;
      state.posState.left.callScore = -1;
      state.posState.left.isPass = false;

      state.posState.right.state = 1;
      state.posState.right.callScore = -1;
      state.posState.right.isPass = false;

      state.posState.self.state = 1;
      state.posState.self.callScore = -1;
      state.posState.self.isPass = false;

    });


    client.on('USER_MESSAGE', function (data) {
      const direct = handle.getDirectionByPosId(data.posId);
      const name = handle.state.posState[direct].name;
      handle.state.msgList.push({
        type: data.type,
        id: data.id,
        time: data.time,
        name: name,
        content: data.msg
      })

      if (data.type === "USER") {
        log(`${data.time} 「${name}」: ${data.msg}`);
      } else {
        log(chalk.red(`${data.time} ${data.msg}`));
      }
      // console.info("'USER_MESSAGE'",data)
    });

    return client;
};
