

module.exports = class baseService {
    constructor(port){
        this.clients = [];
        this.port = port;
        this.desks = this.createDeskList(20);
        this.gameDatas = {};
        this.guid = this._guid();
    }

    time() {
        return (new Date()).toLocaleTimeString();
    }

    _guid () {
        var n = 0;
        return function () {
          return ++n;
        }
      };

    createDeskList(n) {
        n = n || 50;
        const ret = [];
        for (let i = 1; i <= n; i++) {
          const desk = {
            deskId: i,
            state: 0,
            positions: []
          }
          for (let j = 0; j < 3; j++) {
            desk.positions.push({
              posId: j,
              state: 0,
              userName: ''
            })
          }
          ret.push(desk);
        }
        return ret;
    }
}


