# nodeJs版命令行斗地主
支持多人在线游戏,支持实时聊天
### Start the game
```sh
npm i fitw -g && fitw
```

### help
```sh
show // 用于显示房间列表、用户准备状态、游戏状态
join // join [房间号] [座位号] 加入房间
ready // 进入房间后准备
msg // 用于在房间内选择消息发送
msg XXX // 用于在房间内发送自定义消息
play // play 34567 出牌
pass // 不出
quit // 返回大厅
.exit // 退出游戏
// 每个用户具有15s出牌时间,超过时间将会自动出牌
```

### poker alias
```
poker-> │3 |4 |5 |6 |7 |8 |9 |10   |J  |Q  |K  |A    |2 |S  |X  |
alias-> │3 |4 |5 |6 |7 |8 |9 |T t 0|J j|Q q|K k|A a 1|2 |S s|X x|
```

### dev install
```sh
git clone git@github.com:nanianqiumo/fitw.git
cd ./server
npm i && npm run start
cd ./client
npm i && npm link && fitw
```

### License
MIT